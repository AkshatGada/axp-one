-- Migration owner, AFTER profiles/resources/serving/finance. Entire fixture
-- rolls back. SQL roles and JWT claims here are fixtures, not hosted Auth proof.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
create temporary table axp_finance_state(key text primary key,value jsonb not null) on commit drop;
grant select,insert,update on axp_finance_state to authenticated,anon,service_role;
do $$begin execute format('grant usage on schema %I to authenticated,anon,service_role',
  (select nspname from pg_namespace where oid=pg_my_temp_schema())); end;$$;
create function pg_temp.finance_assert(ok boolean,label text) returns void
language plpgsql security invoker set search_path='' as $$
begin if ok is not true then raise exception 'acceptance_failed: %',label; end if; end;
$$;
create function pg_temp.finance_expect(query text,code text,state text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  begin execute query;
  exception when others then
    if sqlstate=state and (code is null or sqlerrm=code) then return; end if;
    raise exception 'unexpected_error: %, % (expected %, %)',sqlstate,sqlerrm,state,code;
  end;
  raise exception 'acceptance_failed: expected % / %',state,code;
end;
$$;
insert into axp_finance_state values('a',to_jsonb(gen_random_uuid())),('b',to_jsonb(gen_random_uuid())),
  ('input','{"name":"Finance fixture","productDescription":"Hardware wallet","approvedText":"Keep keys offline.","contextHints":["offline storage"],"declaredCapabilities":["hardware_wallet"],"maxBidBaseUnits":"40","budgetCapBaseUnits":"1000","settlementNetwork":"solana-devnet"}');
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
  select (value#>>'{}')::uuid,'authenticated','authenticated','axp-finance-'||(value#>>'{}')||'@example.invalid',now(),now(),now()
    from axp_finance_state where key in ('a','b');

do $$declare r text; p text;
begin
  perform pg_temp.finance_assert((select relrowsecurity from pg_class where oid='public.axp_account_financial_records'::regclass),'finance RLS');
  perform pg_temp.finance_assert((select count(*)=0 from pg_policy where polrelid='public.axp_account_financial_records'::regclass),'no public/owner policies');
  perform pg_temp.finance_assert((select prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid='public.axp_account_financial_operation(text,jsonb)'::regprocedure),'fixed definer RPC');
  foreach r in array array['anon','authenticated','service_role'] loop
    foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      perform pg_temp.finance_assert(not has_table_privilege(r,'public.axp_account_financial_records',p),r||' denied '||p);
    end loop;
    perform pg_temp.finance_assert(not has_function_privilege(r,'public.axp_financial_record(text,bigint,jsonb)','EXECUTE'),r||' denied helper');
    perform pg_temp.finance_assert(has_function_privilege(r,'public.axp_account_financial_operation(text,jsonb)','EXECUTE')=(r='service_role'),r||' RPC ACL');
  end loop;
end;$$;
set local role anon;
select pg_temp.finance_expect('select public.axp_account_financial_operation(''list'',''{}'')',null,'42501');
select pg_temp.finance_expect('select * from public.axp_account_financial_records',null,'42501');
select pg_temp.finance_expect('insert into public.axp_account_financial_records values(''secret'',1,''{}'',0)',null,'42501');
set local role authenticated;
select pg_temp.finance_expect('select public.axp_account_financial_operation(''list'',''{}'')',null,'42501');
select pg_temp.finance_expect('select * from public.axp_account_financial_records',null,'42501');
select pg_temp.finance_expect('update public.axp_account_financial_records set value=''{}''',null,'42501');
select pg_temp.finance_expect('delete from public.axp_account_financial_records',null,'42501');

-- Build the real declaration graph through existing owner RPCs/triggers/RLS.
do $$declare actor text; org jsonb; app jsonb; campaign jsonb;
begin
  foreach actor in array array['a','b'] loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_finance_state where key=actor),'role','authenticated')::text,true);
    perform public.axp_account_operation('ensureUser','{}');
    org:=public.axp_account_operation('createOrganization',jsonb_build_object('name','Finance '||actor));
    perform public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',org->'id','input',
      jsonb_build_object('name','Fixture '||actor,'website','https://fixture.example.invalid','description','Fixture only')));
    app:=public.axp_account_operation('saveApp',jsonb_build_object('orgId',org->'id','appId',null,'input',
      '{"name":"Fixture app","website":"https://app.example.invalid","allowedOrigins":["https://app.example.invalid"],"blockedCategories":[],"payout":null}'::jsonb));
    campaign:=public.axp_account_resource_operation('saveCampaign',jsonb_build_object('orgId',org->'id','campaignId',null,
      'input',(select value from axp_finance_state where key='input')));
    insert into axp_finance_state values('org_'||actor,org->'id'),('app_'||actor,app->'id'),('campaign_'||actor,campaign->'id');
    if actor='a' then
      campaign:=public.axp_account_resource_operation('saveCampaign',jsonb_build_object('orgId',org->'id','campaignId',null,
        'input',(select value from axp_finance_state where key='input')));
      insert into axp_finance_state values('campaign_a2',campaign->'id');
    end if;
  end loop;
end;$$;

set local role service_role;
select pg_temp.finance_expect('select * from public.axp_account_financial_records',null,'42501');
select pg_temp.finance_expect('insert into public.axp_account_financial_records values(''secret'',1,''{}'',0)',null,'42501');
select pg_temp.finance_expect('update public.axp_account_financial_records set value=''{}''',null,'42501');
select pg_temp.finance_expect('delete from public.axp_account_financial_records',null,'42501');
select pg_temp.finance_expect('truncate public.axp_account_financial_records',null,'42501');
do $$declare v jsonb; bad jsonb; binding jsonb; consumed jsonb; k text; r jsonb; field text; n integer; rows jsonb;
begin
  v:=jsonb_build_object('kind','wallet_challenge','id',gen_random_uuid(),'resourceId',(select value from axp_finance_state where key='campaign_a'),
    'organizationId',(select value from axp_finance_state where key='org_a'),'ownerId',(select value from axp_finance_state where key='a'),
    'purpose','funding','origin','https://fixture.example.invalid','network','solana-devnet','address','fixture-address','nonce','fixture-nonce',
    'message','Fixture challenge bytes','createdAt',100,'expiresAt',1000,'consumedAt',null);
  k:='wallet-challenge:'||(v->>'id');
  perform pg_temp.finance_assert(public.axp_account_financial_operation('get',jsonb_build_object('key',k)) is null,'absent = null');
  -- Each forged ownership component is independently rejected, not trusted.
  foreach field in array array['resourceId','organizationId','ownerId'] loop
    bad:=v||jsonb_build_object(field,gen_random_uuid());
    perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',jsonb_build_object('key',k,'value',bad)),'not_found','PT404');
  end loop;
  bad:=v||jsonb_build_object('resourceId',(select value from axp_finance_state where key='app_a'));
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',jsonb_build_object('key',k,'value',bad)),'not_found','PT404');
  r:=public.axp_account_financial_operation('create',jsonb_build_object('key',k,'value',v));
  perform pg_temp.finance_assert(r=jsonb_build_object('key',k,'revision',1,'value',v),'exact backend-private record');
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',jsonb_build_object('key',k,'value',v)),'financial_conflict','PT409');
  foreach field in array array['id','resourceId','organizationId','ownerId','origin','network','address','message','nonce','purpose','createdAt','expiresAt'] loop
    bad:=v||jsonb_build_object(field,case when field in ('createdAt','expiresAt') then to_jsonb(9999) when field='purpose' then to_jsonb('payout'::text) else to_jsonb(gen_random_uuid()::text) end);
    perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',jsonb_build_object('key',k,'revision',1,'value',bad)),'financial_conflict','PT409');
  end loop;
  binding:=jsonb_build_object('kind','wallet_binding','id',v->'id','purpose',v->'purpose','resourceId',v->'resourceId',
    'organizationId',v->'organizationId','ownerId',v->'ownerId','network',v->'network','address',v->'address','verifiedAt',200);
  consumed:=v||jsonb_build_object('consumedAt',300,'proofHash',repeat('d',64),'verifiedBinding',binding);
  bad:=consumed||jsonb_build_object('verifiedBinding',binding||'{"address":"redirect"}');
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',jsonb_build_object('key',k,'revision',1,'value',bad)),'financial_conflict','PT409');
  r:=public.axp_account_financial_operation('cas',jsonb_build_object('key',k,'revision',1,'value',consumed));
  perform pg_temp.finance_assert(r->>'revision'='2','one-way consume revision');
  foreach field in array array['consumedAt','proofHash','verifiedBinding'] loop
    bad:=consumed||jsonb_build_object(field,'null'::jsonb);
    perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',jsonb_build_object('key',k,'revision',2,'value',bad)),'financial_conflict','PT409');
  end loop;
  r:=public.axp_account_financial_operation('cas',jsonb_build_object('key',k,'revision',2,'value',consumed));
  perform pg_temp.finance_assert(r->>'revision'='3','idempotent identical consumed record remains consumed');
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',jsonb_build_object('key',k,'revision',2,'value',consumed)),'financial_conflict','PT409');
  perform pg_temp.finance_assert(public.axp_account_financial_operation('get',jsonb_build_object('key',k))=r,'stale CAS unchanged');
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',jsonb_build_object('key','wallet-challenge:'||gen_random_uuid(),'revision',1,'value',v)),'financial_conflict','PT409');
  -- A new verified proof can replace a wallet address, never the historic channel.
  k:='wallet:funding:'||(binding->>'resourceId');
  perform public.axp_account_financial_operation('create',jsonb_build_object('key',k,'value',binding));
  binding:=binding||jsonb_build_object('address','future-proof-address','id',gen_random_uuid(),'verifiedAt',400);
  r:=public.axp_account_financial_operation('cas',jsonb_build_object('key',k,'revision',1,'value',binding));
  perform pg_temp.finance_assert(r->'value'->>'address'='future-proof-address','wallet rotation allowed');
  foreach field in array array['organizationId','ownerId'] loop
    perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',
      jsonb_build_object('key',k,'revision',2,'value',binding||jsonb_build_object(field,gen_random_uuid()))),'financial_conflict','PT409');
  end loop;
  -- App payout uses the app graph, not an advertiser campaign.
  binding:=binding||jsonb_build_object('purpose','payout','resourceId',(select value from axp_finance_state where key='app_b'),
    'organizationId',(select value from axp_finance_state where key='org_b'),'ownerId',(select value from axp_finance_state where key='b'));
  k:='wallet:payout:'||(binding->>'resourceId');
  perform public.axp_account_financial_operation('create',jsonb_build_object('key',k,'value',binding));
  bad:=binding||jsonb_build_object('resourceId',(select value from axp_finance_state where key='campaign_b'));
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',
    jsonb_build_object('key','wallet:payout:'||(bad->>'resourceId'),'value',bad)),'not_found','PT404');
  for n in 1..105 loop
    bad:=v||jsonb_build_object('id',gen_random_uuid());
    perform public.axp_account_financial_operation('create',jsonb_build_object('key','wallet-challenge:'||(bad->>'id'),'value',bad));
  end loop;
  rows:=public.axp_account_financial_operation('list',jsonb_build_object('kind','wallet_challenge','resourceId',v->'resourceId'));
  perform pg_temp.finance_assert(jsonb_array_length(rows)=100,'bounded listing over 106 records');
  perform pg_temp.finance_assert(public.axp_account_financial_operation('list',jsonb_build_object('kind','wallet_challenge','resourceId',gen_random_uuid()))='[]','foreign resource empty');
  -- Bounds and safe error vocabulary. No PostgreSQL diagnostics survive RPC.
  bad:=v||jsonb_build_object('payload',repeat('é',140000),'id',gen_random_uuid());
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',jsonb_build_object('key','wallet-challenge:'||(bad->>'id'),'value',bad)),'invalid_input','PT400');
  bad:=v||jsonb_build_object('wireBase64',repeat('x',15000),'id',gen_random_uuid());
  perform public.axp_account_financial_operation('create',jsonb_build_object('key','wallet-challenge:'||(bad->>'id'),'value',bad));
  perform pg_temp.finance_expect('select public.axp_account_financial_operation(''query'',''{}'')','invalid_input','PT400');
  perform pg_temp.finance_expect('select public.axp_account_financial_operation(''get'',''{"key":"channel:bad","sql":"private"}'')','invalid_input','PT400');
  perform pg_temp.finance_expect('select public.axp_account_financial_operation(''get'',''{"key":"channel:bad"}'')','invalid_input','PT400');
  perform pg_temp.finance_expect('select public.axp_account_financial_operation(''list'',''{"kind":"unknown","resourceId":"x"}'')','invalid_input','PT400');
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',jsonb_build_object('key',k,'revision',1.5,'value',binding)),'invalid_input','PT400');
end;$$;

do $$declare v jsonb; k text; bad jsonb; r jsonb; field text; rows jsonb; second jsonb;
begin
  v:=jsonb_build_object('kind','channel','id',gen_random_uuid(),'resourceId',(select value from axp_finance_state where key='campaign_a'),
    'organizationId',(select value from axp_finance_state where key='org_a'),'ownerId',(select value from axp_finance_state where key='a'),
    'counterpartyAppId',(select value from axp_finance_state where key='app_b'),'counterpartyOrgId',(select value from axp_finance_state where key='org_b'),
    'counterpartyOwnerId',(select value from axp_finance_state where key='b'),'campaignVersion',1,'campaignContentHash',repeat('a',64),
    'terms',jsonb_build_object('payer','fixture-payer','payee','fixture-payee','depositBaseUnits','1000'),
    'termsHash',repeat('b',64),'createdAt',100,'phase','frozen','servingEnabled',false);
  k:='channel:'||(v->>'id');
  foreach field in array array['resourceId','organizationId','ownerId','counterpartyAppId','counterpartyOrgId','counterpartyOwnerId'] loop
    bad:=v||jsonb_build_object(field,gen_random_uuid());
    perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',jsonb_build_object('key',k,'value',bad)),'not_found','PT404');
  end loop;
  r:=public.axp_account_financial_operation('create',jsonb_build_object('key',k,'value',v));
  foreach field in array array['id','resourceId','organizationId','ownerId','counterpartyAppId','counterpartyOrgId','counterpartyOwnerId',
    'campaignVersion','campaignContentHash','terms','termsHash','createdAt','futureAddressBinding'] loop
    bad:=v||jsonb_build_object(field,case when field in ('campaignVersion','createdAt') then to_jsonb(2)
      when field='terms' then v->'terms'||'{"payee":"redirect"}'
      when field='termsHash' then to_jsonb(repeat('c',64)) else to_jsonb(gen_random_uuid()::text) end);
    perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','cas',jsonb_build_object('key',k,'revision',1,'value',bad)),'financial_conflict','PT409');
  end loop;
  v:=v||'{"phase":"funded","servingEnabled":true,"protocolChannelId":"native-fixture","open":{"status":"finalized","privateSignature":"fixture-only"},"close":null,"vouchers":[],"pendingVoucher":null,"authorizedBaseUnits":"0","paidBaseUnits":"0","refundBaseUnits":"0","feeAndRentLamports":"50"}';
  r:=public.axp_account_financial_operation('cas',jsonb_build_object('key',k,'revision',1,'value',v));
  perform pg_temp.finance_assert(r->'value'->'servingEnabled'='true' and r->>'revision'='2','servingEnabled mutable explicit opt-in');
  v:=v||'{"servingEnabled":false,"phase":"finalized"}';
  perform public.axp_account_financial_operation('cas',jsonb_build_object('key',k,'revision',2,'value',v));
  perform pg_temp.finance_assert(public.axp_account_financial_operation('get',jsonb_build_object('key',k))->'value'->'servingEnabled'='false','serving opt-out mutable');
  bad:=v||jsonb_build_object('id',gen_random_uuid());
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',jsonb_build_object('key','channel:'||(bad->>'id'),'value',bad)),'channel_binding_exists','PT409');
  second:=v||jsonb_build_object('id',gen_random_uuid(),'resourceId',(select value from axp_finance_state where key='campaign_a2'));
  bad:=second||jsonb_build_object('terms',second->'terms'||'{"payee":"redirect"}');
  perform pg_temp.finance_expect(format('select public.axp_account_financial_operation(%L,%L::jsonb)','create',jsonb_build_object('key','channel:'||(bad->>'id'),'value',bad)),'channel_payee_conflict','PT409');
  perform public.axp_account_financial_operation('create',jsonb_build_object('key','channel:'||(second->>'id'),'value',second));
  rows:=public.axp_account_financial_operation('list',jsonb_build_object('kind','channel','resourceId',v->'counterpartyAppId'));
  perform pg_temp.finance_assert(jsonb_array_length(rows)=2,'app channels match counterpartyAppId across campaigns');
  rows:=public.axp_account_financial_operation('list',jsonb_build_object('kind','channel','resourceId',v->'resourceId'));
  perform pg_temp.finance_assert(jsonb_array_length(rows)=1,'campaign channels match resourceId');
  rows:=public.axp_account_financial_operation('list',jsonb_build_object('kind','channel','resourceId',(select value from axp_finance_state where key='app_a')));
  perform pg_temp.finance_assert(rows='[]','other app cannot match channel list');
end;$$;
reset role;
rollback;
