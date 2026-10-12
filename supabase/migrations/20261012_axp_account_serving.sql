-- Local phase 4: enrollment authority only. No budgets/ledger/native operations.
-- Chain AFTER profiles.sql and resources.sql. Supabase's service_role must exist;
-- an isolated verifier supplies that NOLOGIN fixture role before this migration.
-- Authored migration is not authorization to change any cloud project.
begin;

create unique index axp_account_campaigns_binding on public.axp_account_campaigns(id,organization_id);
create table public.axp_account_campaign_serving (
  campaign_id uuid primary key,
  organization_id uuid not null,
  version integer not null check(version>0),
  approved_content_hash text check(approved_content_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean not null,
  financial_mode text not null default 'synthetic' check(financial_mode='synthetic'),
  updated_at bigint not null default 0,
  advertiser_id uuid not null references public.axp_account_advertisers(id),
  advertiser_name text,
  advertiser_website text,
  foreign key(campaign_id,organization_id) references public.axp_account_campaigns(id,organization_id),
  check(not enabled or (approved_content_hash is not null and advertiser_name is not null and advertiser_website is not null))
);
alter table public.axp_account_campaign_serving enable row level security;
create policy axp_account_serving_owner on public.axp_account_campaign_serving to authenticated
  using(exists(select 1 from public.axp_account_orgs o where o.id=organization_id))
  with check(exists(select 1 from public.axp_account_orgs o where o.id=organization_id));

-- Direct REST writes have exactly the same lifecycle as the invoker RPC. Owner
-- assigns only the binding on INSERT and expected version + enabled thereafter.
-- Clocks, approval and advertiser identity/snapshots are never caller authority.
create function public.axp_account_serving_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := (public.axp_account_identity()->>'id')::uuid;
  campaign public.axp_account_campaigns;
  advertiser public.axp_account_advertisers;
  keep_snapshot boolean := false;
begin
  perform 1 from public.axp_account_orgs where id=new.organization_id and owner_id=actor;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  select * into campaign from public.axp_account_campaigns
    where id=new.campaign_id and organization_id=new.organization_id for update;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  if new.version is null or new.version<>campaign.version then
    raise exception using errcode='PT409',message='campaign_version_conflict';
  end if;
  if new.enabled is null or new.financial_mode is distinct from 'synthetic' then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  if tg_op='UPDATE' then
    if new.campaign_id is distinct from old.campaign_id or new.organization_id is distinct from old.organization_id then
      raise exception using errcode='PT404',message='not_found';
    end if;
    if new.approved_content_hash is distinct from old.approved_content_hash or
       new.advertiser_id is distinct from old.advertiser_id or new.advertiser_name is distinct from old.advertiser_name or
       new.advertiser_website is distinct from old.advertiser_website or new.updated_at is distinct from old.updated_at then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
    keep_snapshot:=old.enabled and new.enabled and old.version=campaign.version and
      old.approved_content_hash=campaign.approved_content_hash;
  elsif new.approved_content_hash is not null or new.advertiser_id is not null or
        new.advertiser_name is not null or new.advertiser_website is not null or new.updated_at<>0 then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  if new.enabled and (campaign.status<>'approved' or campaign.approved_content_hash is null or
      campaign.approved_content_hash is distinct from public.axp_resource_hash(campaign.input)) then
    raise exception using errcode='PT409',message='campaign_approval_required';
  end if;
  select * into advertiser from public.axp_account_advertisers
    where id=campaign.advertiser_id and organization_id=campaign.organization_id;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  new.approved_content_hash:=campaign.approved_content_hash;
  new.advertiser_id:=advertiser.id;
  if new.enabled and not keep_snapshot then
    new.advertiser_name:=advertiser.name;
    new.advertiser_website:=advertiser.website;
  end if;
  if new.enabled and new.advertiser_website !~ '^https://' then
    raise exception using errcode='PT409',message='campaign_destination_invalid';
  end if;
  new.updated_at:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  return new;
end;
$$;
create trigger axp_account_serving_guard before insert or update on public.axp_account_campaign_serving
  for each row execute function public.axp_account_serving_guard();

-- BEFORE order: existing edit marker -> existing resource guard -> invalidation.
-- The old campaign is still visible, so its enrollment can be disabled through
-- the SAME guard while holding its row lock. Never mutate the campaign here.
-- Keeping the historical version/hash means reapproval cannot resurrect opt-in.
create function public.axp_account_serving_invalidate() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.version is distinct from old.version or new.status<>'approved' or
     new.approved_content_hash is distinct from old.approved_content_hash then
    update public.axp_account_campaign_serving set enabled=false where campaign_id=old.id and enabled;
  end if;
  return new;
end;
$$;
create trigger axp_account_campaigns_serving before update on public.axp_account_campaigns
  for each row execute function public.axp_account_serving_invalidate();

create function public.axp_account_serving_dto(row_value public.axp_account_campaign_serving) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('campaignId',row_value.campaign_id,'organizationId',row_value.organization_id,
    'version',row_value.version,'approvedContentHash',row_value.approved_content_hash,'enabled',row_value.enabled,
    'financialMode',row_value.financial_mode,'updatedAt',row_value.updated_at);
$$;

create function public.axp_account_serving_operation(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := (public.axp_account_identity()->>'id')::uuid;
  org_id uuid;
  campaign_id_value uuid;
  campaign public.axp_account_campaigns;
  enrollment public.axp_account_campaign_serving;
  expected_version numeric;
begin
  case operation
    when 'campaignServing' then perform public.axp_account_exact(payload,array['orgId','campaignId']);
    when 'setCampaignServing' then perform public.axp_account_exact(payload,array['orgId','campaignId','expectedVersion','enabled']);
    else raise exception using errcode='PT400',message='invalid_input';
  end case;
  org_id:=public.axp_resource_uuid(payload->'orgId');
  campaign_id_value:=public.axp_resource_uuid(payload->'campaignId');
  perform 1 from public.axp_account_orgs where id=org_id and owner_id=actor;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  -- All owner mutations lock the campaign BEFORE enrollment. Reads also check
  -- campaign existence, not just enrollment existence (foreign/missing = 404).
  select * into campaign from public.axp_account_campaigns
    where id=campaign_id_value and organization_id=org_id for update;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  if operation='setCampaignServing' then
    if jsonb_typeof(payload->'expectedVersion') is distinct from 'number' or
       jsonb_typeof(payload->'enabled') is distinct from 'boolean' then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
    expected_version:=(payload->>'expectedVersion')::numeric;
    if expected_version<1 or expected_version>9007199254740991 or expected_version<>trunc(expected_version) then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
    if campaign.version<>expected_version then raise exception using errcode='PT409',message='campaign_version_conflict'; end if;
    -- No ON CONFLICT excluded row: the BEFORE INSERT guard derives snapshots,
    -- which must not become caller-assigned derived values in an UPDATE guard.
    perform 1 from public.axp_account_campaign_serving where campaign_id=campaign_id_value;
    if found then
      update public.axp_account_campaign_serving set version=expected_version::integer,enabled=(payload->>'enabled')::boolean
        where campaign_id=campaign_id_value and organization_id=org_id returning * into enrollment;
    else
      insert into public.axp_account_campaign_serving(campaign_id,organization_id,version,enabled)
        values(campaign_id_value,org_id,expected_version::integer,(payload->>'enabled')::boolean) returning * into enrollment;
    end if;
  else
    select * into enrollment from public.axp_account_campaign_serving
      where campaign_id=campaign_id_value and organization_id=org_id;
    if not found then return null; end if;
  end if;
  return public.axp_account_serving_dto(enrollment);
exception
  when sqlstate 'PT400' or sqlstate 'PT401' or sqlstate 'PT404' or sqlstate 'PT409' then raise;
  when others then raise exception using errcode='PT503',message='store_unavailable';
end;
$$;

-- Narrow backend read capability: no identity/filter/SQL parameter, no ledger,
-- no raw credentials, no direct service-role table grants. Fixed bounded DTOs.
create function public.axp_network_campaigns() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(result order by created_at,id),'[]'::jsonb) from (
    select c.created_at,c.id,jsonb_build_object('campaign',public.axp_account_campaign_dto(c),
      'advertiser',jsonb_build_object('id',s.advertiser_id,'name',s.advertiser_name,'website',s.advertiser_website),
      'enrollment',public.axp_account_serving_dto(s)) as result
    from public.axp_account_campaign_serving s
    join public.axp_account_campaigns c on c.id=s.campaign_id and c.organization_id=s.organization_id
      and c.version=s.version and c.status='approved' and c.approved_content_hash=s.approved_content_hash
    join public.axp_account_advertisers a on a.id=s.advertiser_id and a.id=c.advertiser_id and a.organization_id=c.organization_id
    join public.axp_account_orgs o on o.id=c.organization_id
    join auth.users u on u.id=o.owner_id and u.email_confirmed_at is not null
    where s.enabled and s.financial_mode='synthetic' and s.advertiser_name is not null and s.advertiser_website is not null
      and c.approved_content_hash=public.axp_resource_hash(c.input)
    order by c.created_at,c.id limit 100
  ) selected;
$$;

-- Clear Supabase default ACLs explicitly, including service_role on new objects.
-- No broad schema/table privileges are added, no old migration is rewritten.
revoke all on public.axp_account_campaign_serving from public,anon,authenticated,service_role;
grant select on public.axp_account_campaign_serving to authenticated;
grant insert(campaign_id,organization_id,version,enabled),update(version,enabled)
  on public.axp_account_campaign_serving to authenticated;
revoke all on function public.axp_account_serving_guard(),public.axp_account_serving_invalidate(),
  public.axp_account_serving_dto(public.axp_account_campaign_serving),public.axp_account_serving_operation(text,jsonb),
  public.axp_network_campaigns() from public,anon,authenticated,service_role;
grant execute on function public.axp_account_serving_dto(public.axp_account_campaign_serving),
  public.axp_account_serving_operation(text,jsonb) to authenticated;
grant execute on function public.axp_network_campaigns() to service_role;
commit;
