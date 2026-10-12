-- Authored only: additive phase 2/3 declarations, never serving or payments.
-- Apply once, AFTER 20261012_axp_account_profiles.sql, only with authorization.
begin;

create function public.axp_resource_json(value jsonb) returns text
language plpgsql immutable security invoker set search_path = '' as $$
declare result text;
begin
  case jsonb_typeof(value)
    when 'object' then
      select '{' || coalesce(string_agg(to_jsonb(k)::text || ':' || public.axp_resource_json(v), ',' order by k collate "C"), '') || '}'
        into result from jsonb_each(value) as e(k,v);
    when 'array' then
      select '[' || coalesce(string_agg(public.axp_resource_json(v), ',' order by n), '') || ']'
        into result from jsonb_array_elements(value) with ordinality as e(v,n);
    else result := value::text;
  end case;
  return result;
end;
$$;

create function public.axp_resource_hash(value jsonb) returns text
language sql immutable security invoker set search_path = '' as $$
  select encode(sha256(convert_to(public.axp_resource_json(value), 'UTF8')), 'hex');
$$;

create function public.axp_resource_units(value text) returns integer
language sql immutable security invoker set search_path = '' as $$
  select coalesce(sum(case when ascii(substr(value,n,1))>65535 then 2 else 1 end),0)::integer
    from generate_series(1,char_length(value)) as n;
$$;

create function public.axp_resource_campaign_input(value jsonb) returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare
  result jsonb;
  hints jsonb := '[]';
  capabilities jsonb := '[]';
  item jsonb;
  normalized text;
  content text;
  units integer;
  bid text;
  cap text;
  supported constant text[] := array['crypto_storage','hardware_wallet','offline_key_storage','mobile_software_wallet','ethereum','solana','travel_booking','expense_management','policy_enforcement','authentication','agent_identity','software_development','online_learning','project_management','design_tools','productivity','ecommerce'];
begin
  perform public.axp_account_exact(value, array['name','productDescription','approvedText','contextHints','declaredCapabilities','maxBidBaseUnits','budgetCapBaseUnits','settlementNetwork']);
  result := jsonb_build_object('name',public.axp_account_text(value->'name',120),
    'productDescription',public.axp_account_text(value->'productDescription',1200),
    'approvedText',public.axp_account_text(value->'approvedText',800));
  if jsonb_typeof(value->'contextHints') is distinct from 'array' or
     jsonb_typeof(value->'declaredCapabilities') is distinct from 'array' then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  if jsonb_array_length(value->'contextHints')>6 or jsonb_array_length(value->'declaredCapabilities')>12 then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  content := (result->>'productDescription') || ' ' || (result->>'approvedText');
  units := public.axp_resource_units(result->>'productDescription') + public.axp_resource_units(result->>'approvedText');
  for item in select v from jsonb_array_elements(value->'contextHints') as e(v) loop
    normalized := public.axp_account_text(item,400);
    if hints @> jsonb_build_array(normalized) then raise exception using errcode='PT400',message='invalid_input'; end if;
    hints := hints || jsonb_build_array(normalized);
    content := content || ' ' || normalized;
    units := units + public.axp_resource_units(normalized);
  end loop;
  for item in select v from jsonb_array_elements(value->'declaredCapabilities') as e(v) loop
    normalized := public.axp_account_text(item,400);
    if not normalized=any(supported) or capabilities @> jsonb_build_array(normalized) then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
    capabilities := capabilities || jsonb_build_array(normalized);
  end loop;
  if units>2400 then raise exception using errcode='PT400',message='invalid_input'; end if;
  if content ~* '[[:alnum:]_.+\-]+@[[:alnum:]_.\-]+\.[a-z]{2,}|apikey_[a-z0-9_]+|-----BEGIN .*PRIVATE KEY' then
    raise exception using errcode='PT400',message='private_content';
  end if;
  bid := value->>'maxBidBaseUnits'; cap := value->>'budgetCapBaseUnits';
  if jsonb_typeof(value->'maxBidBaseUnits') is distinct from 'string' or
     jsonb_typeof(value->'budgetCapBaseUnits') is distinct from 'string' or
     bid !~ '^[1-9][0-9]{0,5}$' or cap !~ '^[1-9][0-9]{0,5}$' then
    raise exception using errcode='PT400',message='spend_limit_exceeded';
  end if;
  if bid::integer>4000 or cap::integer>100000 or bid::integer>cap::integer then
    raise exception using errcode='PT400',message='spend_limit_exceeded';
  end if;
  if jsonb_typeof(value->'settlementNetwork') is distinct from 'string' or
     value->>'settlementNetwork' not in ('solana-devnet','tempo-testnet') then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  return result || jsonb_build_object('contextHints',hints,'declaredCapabilities',capabilities,
    'maxBidBaseUnits',bid,'budgetCapBaseUnits',cap,'settlementNetwork',value->>'settlementNetwork');
end;
$$;

create function public.axp_resource_uuid(value jsonb) returns uuid
language plpgsql immutable security invoker set search_path = '' as $$
begin
  if jsonb_typeof(value) is distinct from 'string' or
    value #>> '{}' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception using errcode='PT404',message='not_found';
  end if;
  return (value #>> '{}')::uuid;
end;
$$;

create table public.axp_account_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.axp_account_orgs(id),
  advertiser_id uuid not null references public.axp_account_advertisers(id),
  version integer not null default 1 check(version>0),
  status text not null default 'draft' check(status in ('draft','approved')),
  input jsonb not null,
  approved_content_hash text,
  created_at bigint not null default 0,
  updated_at bigint not null default 0,
  check((status='draft' and approved_content_hash is null) or
    (status='approved' and approved_content_hash ~ '^[a-f0-9]{64}$'))
);
create index axp_account_campaigns_org on public.axp_account_campaigns(organization_id,created_at,id);

create table public.axp_account_app_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.axp_account_orgs(id),
  app_id uuid not null references public.axp_account_apps(id),
  label text not null,
  key_hash text not null unique check(key_hash ~ '^[a-f0-9]{64}$'),
  created_at bigint not null default 0,
  expires_at bigint not null default 0,
  revoked_at bigint,
  check(expires_at=created_at+2592000000)
);
create index axp_account_credentials_app on public.axp_account_app_credentials(app_id,created_at,id);

-- Invoker triggers see NEW.key_hash on INSERT without granting hash SELECT.
-- Every path (RPC or direct table write) derives clocks, bindings and lifecycle.
create function public.axp_account_resource_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := (public.axp_account_identity()->>'id')::uuid;
  clock_ms bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
  advertiser uuid;
begin
  perform 1 from public.axp_account_orgs where id=new.organization_id and owner_id=actor;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  if tg_op='UPDATE' then
    if new.id is distinct from old.id or new.organization_id is distinct from old.organization_id or
       new.created_at is distinct from old.created_at then
      raise exception using errcode='PT404',message='not_found';
    end if;
  end if;
  if tg_table_name='axp_account_campaigns' then
    if tg_op='INSERT' then
      -- A parent lock serializes quota checking, including direct REST inserts.
      perform 1 from public.axp_account_orgs where id=new.organization_id for update;
      select id into advertiser from public.axp_account_advertisers where organization_id=new.organization_id;
      if not found then raise exception using errcode='PT404',message='not_found'; end if;
      if new.advertiser_id is not null and new.advertiser_id<>advertiser then
        raise exception using errcode='PT404',message='not_found';
      end if;
      if (select count(*) from public.axp_account_campaigns where organization_id=new.organization_id)>=100 then
        raise exception using errcode='PT409',message='limit_exceeded';
      end if;
      new.advertiser_id:=advertiser;
      new.version:=1; new.status:='draft'; new.approved_content_hash:=null; new.created_at:=clock_ms;
    else
      if new.advertiser_id is distinct from old.advertiser_id then raise exception using errcode='PT404',message='not_found'; end if;
      if new.version<>old.version or new.approved_content_hash is distinct from old.approved_content_hash then
        raise exception using errcode='PT400',message='invalid_input';
      end if;
      if new.status not in ('draft','approved') then raise exception using errcode='PT400',message='invalid_input'; end if;
      if new.input is distinct from old.input or new.status='draft' then
        new.version:=old.version+1; new.status:='draft'; new.approved_content_hash:=null;
      else
        new.status:='approved'; new.approved_content_hash:=public.axp_resource_hash(old.input);
      end if;
    end if;
    new.input:=public.axp_resource_campaign_input(new.input);
    new.updated_at:=clock_ms;
  else
    if tg_op='INSERT' then
      perform 1 from public.axp_account_apps where id=new.app_id and organization_id=new.organization_id for update;
      if not found then raise exception using errcode='PT404',message='not_found'; end if;
      if (select count(*) from public.axp_account_app_credentials where app_id=new.app_id and revoked_at is null and expires_at>clock_ms)>=10 then
        raise exception using errcode='PT409',message='limit_exceeded';
      end if;
      if new.revoked_at is not null then raise exception using errcode='PT400',message='invalid_input'; end if;
      new.label:=public.axp_account_text(to_jsonb(new.label),120);
      if new.key_hash is null or new.key_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode='PT400',message='invalid_input'; end if;
      new.created_at:=clock_ms; new.expires_at:=clock_ms+2592000000;
    else
      if new.app_id is distinct from old.app_id or new.key_hash is distinct from old.key_hash or
         new.expires_at is distinct from old.expires_at or new.label is distinct from old.label then
        raise exception using errcode='PT400',message='invalid_input';
      end if;
      if old.revoked_at is not null then
        if new.revoked_at is distinct from old.revoked_at then raise exception using errcode='PT409',message='credential_not_active'; end if;
      elsif new.revoked_at is not null then new.revoked_at:=clock_ms;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Even writing the identical input is an edit, never an approval shortcut.
-- BEFORE triggers run alphabetically: this marker runs before the guard.
create function public.axp_account_campaign_edit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.status:='draft'; return new; end;
$$;
create trigger axp_account_campaigns_edit before update of input on public.axp_account_campaigns
  for each row execute function public.axp_account_campaign_edit();
create trigger axp_account_campaigns_guard before insert or update on public.axp_account_campaigns
  for each row execute function public.axp_account_resource_guard();
create trigger axp_account_credentials_guard before insert or update on public.axp_account_app_credentials
  for each row execute function public.axp_account_resource_guard();

alter table public.axp_account_campaigns enable row level security;
alter table public.axp_account_app_credentials enable row level security;
create policy axp_account_campaigns_owner on public.axp_account_campaigns to authenticated
  using(exists(select 1 from public.axp_account_orgs o where o.id=organization_id))
  with check(exists(select 1 from public.axp_account_orgs o where o.id=organization_id));
create policy axp_account_credentials_owner on public.axp_account_app_credentials to authenticated
  using(exists(select 1 from public.axp_account_orgs o where o.id=organization_id))
  with check(exists(select 1 from public.axp_account_orgs o where o.id=organization_id));

-- An invoker view lets owner operations project whole metadata records without
-- selecting the secret digest. Underlying column grants and RLS remain required.
create view public.axp_account_credential_metadata with(security_invoker=true) as
  select id,organization_id,app_id,label,created_at,expires_at,revoked_at from public.axp_account_app_credentials;

create function public.axp_account_campaign_dto(row_value public.axp_account_campaigns) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('id',row_value.id,'organizationId',row_value.organization_id,
    'advertiserId',row_value.advertiser_id,'version',row_value.version,'status',row_value.status,
    'input',row_value.input,'approvedContentHash',row_value.approved_content_hash,
    'createdAt',row_value.created_at,'updatedAt',row_value.updated_at,'servingStatus','not_connected');
$$;
create function public.axp_account_credential_dto(row_value public.axp_account_credential_metadata) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('id',row_value.id,'organizationId',row_value.organization_id,
    'appId',row_value.app_id,'publisherId','app:'||row_value.app_id,'label',row_value.label,
    'scopes',jsonb_build_array('opportunities:write','opportunities:read','delivery:write','delivery:read'),
    'createdAt',row_value.created_at,'expiresAt',row_value.expires_at,'revokedAt',row_value.revoked_at);
$$;

create function public.axp_account_resource_operation(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := (public.axp_account_identity()->>'id')::uuid;
  org_id uuid;
  app_id_value uuid;
  campaign_id uuid;
  key_id uuid;
  new_id uuid;
  campaign_row public.axp_account_campaigns;
  credential_row public.axp_account_credential_metadata;
  result jsonb;
  resource_input jsonb;
  key_digest text;
  key_label text;
  clock_ms bigint;
  expected_version numeric;
begin
  case operation
    when 'campaigns' then perform public.axp_account_exact(payload,array['orgId']);
    when 'campaign' then perform public.axp_account_exact(payload,array['orgId','campaignId']);
    when 'approveCampaign' then perform public.axp_account_exact(payload,array['orgId','campaignId','expectedVersion']);
    when 'saveCampaign' then perform public.axp_account_exact(payload,array['orgId','input','campaignId']);
    when 'appCredentials' then perform public.axp_account_exact(payload,array['orgId','appId']);
    when 'issueAppCredential' then perform public.axp_account_exact(payload,array['orgId','appId','input']);
    when 'revokeAppCredential' then perform public.axp_account_exact(payload,array['orgId','appId','keyId']);
    when 'rotateAppCredential' then perform public.axp_account_exact(payload,array['orgId','appId','keyId','input']);
    else raise exception using errcode='PT400',message='invalid_input';
  end case;
  org_id:=public.axp_resource_uuid(payload->'orgId');
  perform 1 from public.axp_account_orgs where id=org_id and owner_id=actor;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  if operation='campaigns' then
    select coalesce(jsonb_agg(public.axp_account_campaign_dto(c) order by c.created_at,c.id),'[]')
      into result from public.axp_account_campaigns c where c.organization_id=org_id;
    return result;
  end if;
  if operation in ('campaign','approveCampaign','saveCampaign') then
    if operation<>'saveCampaign' or payload->'campaignId'<>'null'::jsonb then
      campaign_id:=public.axp_resource_uuid(payload->'campaignId');
      select * into campaign_row from public.axp_account_campaigns where id=campaign_id and organization_id=org_id for update;
      if not found then raise exception using errcode='PT404',message='not_found'; end if;
    end if;
    if operation='saveCampaign' then
      resource_input:=public.axp_resource_campaign_input(payload->'input');
      if campaign_id is null then
        insert into public.axp_account_campaigns(organization_id,input) values(org_id,resource_input) returning * into campaign_row;
      else
        update public.axp_account_campaigns set input=resource_input,status='draft'
          where id=campaign_id and organization_id=org_id returning * into campaign_row;
      end if;
    elsif operation='approveCampaign' then
      if jsonb_typeof(payload->'expectedVersion') is distinct from 'number' then
        raise exception using errcode='PT400',message='invalid_input';
      end if;
      expected_version:=(payload->>'expectedVersion')::numeric;
      if expected_version<1 or expected_version>9007199254740991 or expected_version<>trunc(expected_version) then
        raise exception using errcode='PT400',message='invalid_input';
      end if;
      -- campaign_row was read FOR UPDATE: no edit can slip between this check
      -- and approval. The caller confirms the exact version it displayed.
      if campaign_row.version<>expected_version then
        raise exception using errcode='PT409',message='campaign_version_conflict';
      end if;
      update public.axp_account_campaigns set status='approved' where id=campaign_id and organization_id=org_id returning * into campaign_row;
    end if;
    return public.axp_account_campaign_dto(campaign_row);
  end if;

  app_id_value:=public.axp_resource_uuid(payload->'appId');
  -- Rotation locks the parent BEFORE the old row; issuance uses the same lock.
  perform 1 from public.axp_account_apps where id=app_id_value and organization_id=org_id for update;
  if not found then raise exception using errcode='PT404',message='not_found'; end if;
  if operation='appCredentials' then
    select coalesce(jsonb_agg(public.axp_account_credential_dto(c) order by c.created_at,c.id),'[]') into result
      from public.axp_account_credential_metadata c where c.app_id=app_id_value and c.organization_id=org_id;
    return result;
  end if;
  if operation in ('revokeAppCredential','rotateAppCredential') then
    key_id:=public.axp_resource_uuid(payload->'keyId');
    -- Lock the base row using only granted metadata columns. FOR UPDATE on the
    -- read-only metadata view would require an unnecessary view UPDATE grant.
    select id,organization_id,app_id,label,created_at,expires_at,revoked_at
      into credential_row from public.axp_account_app_credentials
      where id=key_id and app_id=app_id_value and organization_id=org_id for update;
    if not found then raise exception using errcode='PT404',message='not_found'; end if;
    clock_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
    if operation='rotateAppCredential' and (credential_row.revoked_at is not null or credential_row.expires_at<=clock_ms) then
      raise exception using errcode='PT409',message='credential_not_active';
    end if;
    update public.axp_account_app_credentials set revoked_at=coalesce(revoked_at,clock_ms)
      where id=key_id and app_id=app_id_value and organization_id=org_id;
    if operation='revokeAppCredential' then
      select * into credential_row from public.axp_account_credential_metadata where id=key_id;
      return public.axp_account_credential_dto(credential_row);
    end if;
  end if;
  -- A failed validation/unique/quota check rolls back old revocation as well.
  perform public.axp_account_exact(payload->'input',array['label','keyHash']);
  key_label:=public.axp_account_text(payload->'input'->'label',120);
  key_digest:=payload->'input'->>'keyHash';
  if jsonb_typeof(payload->'input'->'keyHash') is distinct from 'string' or key_digest !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  insert into public.axp_account_app_credentials(organization_id,app_id,label,key_hash)
    values(org_id,app_id_value,key_label,key_digest) returning id into new_id;
  select * into credential_row from public.axp_account_credential_metadata where id=new_id;
  return public.axp_account_credential_dto(credential_row);
exception
  when sqlstate 'PT400' or sqlstate 'PT401' or sqlstate 'PT404' or sqlstate 'PT409' then raise;
  when unique_violation then raise exception using errcode='PT409',message='credential_hash_conflict';
  when others then raise exception using errcode='PT503',message='store_unavailable';
end;
$$;

-- The only anonymous capability: exact digest equality from a 256-bit random
-- credential, no dynamic SQL, identity argument or arbitrary lookup. Never return
-- the digest or a table record. Existing confirmed owner must still be live.
create function public.axp_resolve_app_credential(key_hash text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if key_hash is null or length(key_hash)<>64 or key_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  select jsonb_build_object('credential',public.axp_account_credential_dto(m),'app',public.axp_account_app_dto(a)) into result
    from public.axp_account_app_credentials c
    join public.axp_account_credential_metadata m on m.id=c.id
    join public.axp_account_apps a on a.id=c.app_id and a.organization_id=c.organization_id
    join public.axp_account_orgs o on o.id=c.organization_id
    join auth.users u on u.id=o.owner_id and u.email_confirmed_at is not null
    where c.key_hash=$1 and c.revoked_at is null and c.expires_at>floor(extract(epoch from statement_timestamp())*1000)::bigint;
  return result;
exception when others then raise exception using errcode='PT503',message='store_unavailable';
end;
$$;

revoke all on public.axp_account_campaigns,public.axp_account_app_credentials,public.axp_account_credential_metadata from public,anon,authenticated;
grant select on public.axp_account_campaigns,public.axp_account_credential_metadata to authenticated;
grant select(id,organization_id,app_id,label,created_at,expires_at,revoked_at)
  on public.axp_account_app_credentials to authenticated;
grant insert(organization_id,input),update(input,status) on public.axp_account_campaigns to authenticated;
grant insert(organization_id,app_id,label,key_hash),update(revoked_at) on public.axp_account_app_credentials to authenticated;

revoke all on function public.axp_resource_json(jsonb),public.axp_resource_hash(jsonb),public.axp_resource_units(text),
  public.axp_resource_campaign_input(jsonb),public.axp_resource_uuid(jsonb),public.axp_account_resource_guard(),public.axp_account_campaign_edit(),
  public.axp_account_campaign_dto(public.axp_account_campaigns),
  public.axp_account_credential_dto(public.axp_account_credential_metadata),
  public.axp_account_resource_operation(text,jsonb),public.axp_resolve_app_credential(text) from public,anon,authenticated;
grant execute on function public.axp_resource_json(jsonb),public.axp_resource_hash(jsonb),public.axp_resource_units(text),
  public.axp_resource_campaign_input(jsonb),public.axp_resource_uuid(jsonb),
  public.axp_account_campaign_dto(public.axp_account_campaigns),
  public.axp_account_credential_dto(public.axp_account_credential_metadata),public.axp_account_resource_operation(text,jsonb) to authenticated;
grant execute on function public.axp_resolve_app_credential(text) to anon,authenticated;
commit;
