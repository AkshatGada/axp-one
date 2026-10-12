-- Additive backend-private financial records. AFTER profiles/resources/serving.
-- Authored only: applying to cloud requires separate explicit authorization.
begin;

create table public.axp_account_financial_records (
  key text collate "C" primary key,
  revision bigint not null check (revision between 1 and 9007199254740991),
  value jsonb not null check (jsonb_typeof(value)='object'),
  updated_at bigint not null,
  check (octet_length(public.axp_resource_json(jsonb_build_object('key',key,'revision',revision,'value',value))) <= 262144)
);
create index axp_account_financial_resource on public.axp_account_financial_records
  ((value->>'kind'),(value->>'resourceId'),key);
create index axp_account_financial_counterparty on public.axp_account_financial_records
  ((value->>'counterpartyAppId'),key) where value->>'kind'='channel';
create unique index axp_account_financial_channel_binding on public.axp_account_financial_records
  ((value->>'resourceId'),(value->>'counterpartyAppId')) where value->>'kind'='channel';
-- No policies: neither people nor SDKs can read even a single private record.
alter table public.axp_account_financial_records enable row level security;

create function public.axp_financial_record(record_key text, record_revision bigint, record_value jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare
  field text;
  result jsonb;
  uuid_pattern constant text := '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
begin
  if record_key is null or record_key !~ ('^(wallet-challenge:'||uuid_pattern||'|wallet:(funding|payout):'||uuid_pattern||'|channel:'||uuid_pattern||')$') or
     record_revision is null or record_revision not between 1 and 9007199254740991 or
     jsonb_typeof(record_value) is distinct from 'object' or
     coalesce(record_value->>'kind','') not in ('wallet_challenge','wallet_binding','channel') then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  foreach field in array array['organizationId','ownerId','resourceId'] ||
    case when record_value->>'kind'='channel' then array['counterpartyAppId','counterpartyOrgId','counterpartyOwnerId'] else array[]::text[] end loop
    if jsonb_typeof(record_value->field) is distinct from 'string' or length(record_value->>field) not between 1 and 128 or
       record_value->>field ~ '[[:space:]\x01-\x1f\x7f]' then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
  end loop;
  if record_value->>'kind'='channel' then
    if record_key not like 'channel:%' or jsonb_typeof(record_value->'terms') is distinct from 'object' or
       jsonb_typeof(record_value->'terms'->'payee') is distinct from 'string' or
       length(record_value->'terms'->>'payee') not between 1 and 128 or
       record_value->'terms'->>'payee' ~ '[[:space:]\x01-\x1f\x7f]' or
       jsonb_typeof(record_value->'termsHash') is distinct from 'string' or record_value->>'termsHash' !~ '^[a-f0-9]{64}$' or
       jsonb_typeof(record_value->'createdAt') is distinct from 'number' or record_value->>'createdAt' !~ '^(0|[1-9][0-9]*)$' or
       (record_value->>'createdAt')::numeric > 9007199254740991 then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
  else
    if coalesce(record_value->>'purpose','') not in ('funding','payout') or
       (record_value->>'kind'='wallet_challenge' and record_key not like 'wallet-challenge:%') or
       (record_value->>'kind'='wallet_binding' and record_key <> 'wallet:'||(record_value->>'purpose')||':'||(record_value->>'resourceId')) then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
  end if;
  result:=jsonb_build_object('key',record_key,'revision',record_revision,'value',record_value);
  if octet_length(public.axp_resource_json(result))>262144 then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  return result;
end;
$$;

-- Fixed capability only. SECURITY DEFINER is necessary: service_role receives
-- EXECUTE, never table privileges. No dynamic SQL, arbitrary query or owner JWT.
create function public.axp_account_financial_operation(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  k text;
  v jsonb;
  prior public.axp_account_financial_records;
  next_revision bigint;
  result jsonb;
  field text;
  state_fields constant text[] := array['phase','servingEnabled','protocolChannelId','authorizedBaseUnits','paidBaseUnits',
    'refundBaseUnits','feeAndRentLamports','vouchers','open','close','pendingVoucher'];
  consumption_fields constant text[] := array['consumedAt','proofHash','verifiedBinding'];
begin
  case operation
    when 'get' then perform public.axp_account_exact(payload,array['key']);
    when 'create' then perform public.axp_account_exact(payload,array['key','value']);
    when 'cas' then perform public.axp_account_exact(payload,array['key','revision','value']);
    when 'list' then perform public.axp_account_exact(payload,array['kind','resourceId']);
    else raise exception using errcode='PT400',message='invalid_input';
  end case;
  if operation='list' then
    if coalesce(payload->>'kind','') not in ('wallet_challenge','wallet_binding','channel') or
       jsonb_typeof(payload->'resourceId') is distinct from 'string' or length(payload->>'resourceId') not between 1 and 128 or
       payload->>'resourceId' ~ '[[:space:]\x01-\x1f\x7f]' then
      raise exception using errcode='PT400',message='invalid_input';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('key',r.key,'revision',r.revision,'value',r.value) order by r.key),'[]'::jsonb)
      into result from (select key,revision,value from public.axp_account_financial_records
        where value->>'kind'=payload->>'kind' and (value->>'resourceId'=payload->>'resourceId' or
          payload->>'kind'='channel' and value->>'counterpartyAppId'=payload->>'resourceId') order by key limit 100) r;
    return result;
  end if;
  k:=payload->>'key';
  if jsonb_typeof(payload->'key') is distinct from 'string' or k !~
    '^(wallet-challenge:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|wallet:(funding|payout):[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|channel:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$' then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  if operation='get' then
    select jsonb_build_object('key',key,'revision',revision,'value',value) into result
      from public.axp_account_financial_records where key=k;
    return result;
  end if;
  v:=payload->'value';
  if operation='create' then
    result:=public.axp_financial_record(k,1,v);
    -- Verify the real resource graph, not merely an asserted org/owner tuple.
    -- SHARE locks keep deletion/ownership mutation from racing creation. We do
    -- NOT cascade financial obligations when account declarations are removed.
    if v->>'kind'='channel' or v->>'purpose'='funding' then
      perform 1 from public.axp_account_campaigns c join public.axp_account_orgs o on o.id=c.organization_id
        where c.id::text=v->>'resourceId' and o.id::text=v->>'organizationId' and o.owner_id::text=v->>'ownerId' for share of c,o;
    else
      perform 1 from public.axp_account_apps a join public.axp_account_orgs o on o.id=a.organization_id
        where a.id::text=v->>'resourceId' and o.id::text=v->>'organizationId' and o.owner_id::text=v->>'ownerId' for share of a,o;
    end if;
    if not found then raise exception using errcode='PT404',message='not_found'; end if;
    if v->>'kind'='channel' then
      perform 1 from public.axp_account_apps a join public.axp_account_orgs o on o.id=a.organization_id
        where a.id::text=v->>'counterpartyAppId' and o.id::text=v->>'counterpartyOrgId' and o.owner_id::text=v->>'counterpartyOwnerId' for share of a,o;
      if not found then raise exception using errcode='PT404',message='not_found'; end if;
      -- Per-app serialization is needed even when two campaign/app pairs differ.
      -- A first app's native publisher identity cannot be redirected later.
      perform pg_advisory_xact_lock(hashtextextended('axp-account-payee:'||(v->>'counterpartyAppId'),0));
      if exists(select 1 from public.axp_account_financial_records where key=k) then
        raise exception using errcode='PT409',message='financial_conflict';
      end if;
      if exists(select 1 from public.axp_account_financial_records where value->>'kind'='channel' and
        value->>'resourceId'=v->>'resourceId' and value->>'counterpartyAppId'=v->>'counterpartyAppId') then
        raise exception using errcode='PT409',message='channel_binding_exists';
      end if;
      if exists(select 1 from public.axp_account_financial_records where value->>'kind'='channel' and
        value->>'counterpartyAppId'=v->>'counterpartyAppId' and value->'terms'->'payee' is distinct from v->'terms'->'payee') then
        raise exception using errcode='PT409',message='channel_payee_conflict';
      end if;
    end if;
    insert into public.axp_account_financial_records(key,revision,value,updated_at)
      values(k,1,v,floor(extract(epoch from clock_timestamp())*1000)::bigint);
    return result;
  end if;

  if jsonb_typeof(payload->'revision') is distinct from 'number' or payload->>'revision' !~ '^[1-9][0-9]*$' or
     (payload->>'revision')::numeric >= 9007199254740991 then
    raise exception using errcode='PT400',message='invalid_input';
  end if;
  next_revision:=(payload->>'revision')::bigint+1;
  result:=public.axp_financial_record(k,next_revision,v);
  select * into prior from public.axp_account_financial_records where key=k for update;
  if not found or prior.revision<>next_revision-1 then raise exception using errcode='PT409',message='financial_conflict'; end if;
  foreach field in array array['kind','organizationId','ownerId','resourceId'] ||
    case when prior.value->>'kind'='channel' then array[]::text[] else array['purpose'] end loop
    if prior.value->field is distinct from v->field then raise exception using errcode='PT409',message='financial_conflict'; end if;
  end loop;
  if prior.value->>'kind'='channel' and (prior.value-state_fields) is distinct from (v-state_fields) then
    raise exception using errcode='PT409',message='financial_conflict';
  end if;
  if prior.value->>'kind'='wallet_challenge' then
    if (prior.value-consumption_fields) is distinct from (v-consumption_fields) or
       (prior.value->'consumedAt' is not null and prior.value->'consumedAt'<>'null'::jsonb and prior.value is distinct from v) then
      raise exception using errcode='PT409',message='financial_conflict';
    end if;
    if v->'consumedAt' is null or v->'consumedAt'='null'::jsonb then
      if prior.value is distinct from v then raise exception using errcode='PT409',message='financial_conflict'; end if;
    else
      if jsonb_typeof(v->'consumedAt') is distinct from 'number' or v->>'consumedAt' !~ '^[1-9][0-9]*$' or
         (v->>'consumedAt')::numeric > 9007199254740991 or jsonb_typeof(v->'proofHash') is distinct from 'string' or
         v->>'proofHash' !~ '^[a-f0-9]{64}$' or v->'verifiedBinding'->>'kind' is distinct from 'wallet_binding' or
         jsonb_typeof(v->'verifiedBinding'->'verifiedAt') is distinct from 'number' or
         v->'verifiedBinding'->>'verifiedAt' !~ '^(0|[1-9][0-9]*)$' or (v->'verifiedBinding'->>'verifiedAt')::numeric>9007199254740991 then
        raise exception using errcode='PT409',message='financial_conflict';
      end if;
      foreach field in array array['id','resourceId','organizationId','ownerId','purpose','network','address'] loop
        if v->'verifiedBinding'->field is distinct from prior.value->field then
          raise exception using errcode='PT409',message='financial_conflict';
        end if;
      end loop;
    end if;
  end if;
  update public.axp_account_financial_records set revision=next_revision,value=v,
    updated_at=floor(extract(epoch from clock_timestamp())*1000)::bigint where key=k and revision=prior.revision;
  if not found then raise exception using errcode='PT409',message='financial_conflict'; end if;
  return result;
exception
  when sqlstate 'PT400' then raise exception using errcode='PT400',message='invalid_input';
  when sqlstate 'PT404' or sqlstate 'PT409' then raise;
  when unique_violation then raise exception using errcode='PT409',message='financial_conflict';
  when others then raise exception using errcode='PT503',message='store_unavailable';
end;
$$;

-- Supabase defaults may otherwise grant service/public DML. BYPASSRLS does not
-- bypass ACLs; even service_role must use the fixed operation, never the table.
revoke all on public.axp_account_financial_records from public,anon,authenticated,service_role;
revoke all on function public.axp_financial_record(text,bigint,jsonb),
  public.axp_account_financial_operation(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.axp_account_financial_operation(text,jsonb) to service_role;
commit;
