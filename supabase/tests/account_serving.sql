-- Run whole-file as migration owner AFTER profiles, resources, serving migrations.
-- Isolated stub needs service_role NOLOGIN before chaining serving.sql. Everything
-- below rolls back. Fixture JWT claims/SQL roles are not cloud/Auth acceptance.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
create temporary table axp_serving_state(key text primary key,value jsonb not null) on commit drop;
grant select,insert,update on axp_serving_state to authenticated,anon,service_role;
do $$begin
  execute format('grant usage on schema %I to authenticated,anon,service_role',
    (select nspname from pg_namespace where oid=pg_my_temp_schema()));
end;$$;
create function pg_temp.serving_assert(ok boolean,label text) returns void
language plpgsql security invoker set search_path='' as $$
begin if ok is not true then raise exception 'acceptance_failed: %',label; end if; end;
$$;
create function pg_temp.serving_expect(query text,code text,state text) returns void
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
insert into axp_serving_state values('a',to_jsonb(gen_random_uuid())),('b',to_jsonb(gen_random_uuid())),
  ('unconfirmed',to_jsonb(gen_random_uuid())),
  ('input','{"name":"Fixture campaign","productDescription":"Hardware wallet","approvedText":"Keep keys offline.","contextHints":["offline storage"],"declaredCapabilities":["hardware_wallet"],"maxBidBaseUnits":"40","budgetCapBaseUnits":"1000","settlementNetwork":"solana-devnet"}');
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
  select (value#>>'{}')::uuid,'authenticated','authenticated','axp-serving-'||(value#>>'{}')||'@example.invalid',
    case when key='unconfirmed' then null else now() end,now(),now()
  from axp_serving_state where key in ('a','b','unconfirmed');

do $$declare col text; role_name text;
begin
  perform pg_temp.serving_assert((select not prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid='public.axp_account_serving_operation(text,jsonb)'::regprocedure),'owner invoker/fixed path');
  perform pg_temp.serving_assert((select prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid='public.axp_network_campaigns()'::regprocedure),'catalogue definer/fixed path');
  perform pg_temp.serving_assert((select relrowsecurity from pg_class where oid='public.axp_account_campaign_serving'::regclass),'enrollment RLS');
  foreach role_name in array array['anon','authenticated'] loop
    perform pg_temp.serving_assert(not has_function_privilege(role_name,'public.axp_network_campaigns()','EXECUTE'),role_name||' catalogue denied');
  end loop;
  perform pg_temp.serving_assert(has_function_privilege('service_role','public.axp_network_campaigns()','EXECUTE'),'service-only catalogue');
  perform pg_temp.serving_assert(not has_function_privilege('service_role','public.axp_account_serving_operation(text,jsonb)','EXECUTE'),'service not owner RPC');
  perform pg_temp.serving_assert(not has_function_privilege('anon','public.axp_account_serving_operation(text,jsonb)','EXECUTE'),'anon not owner RPC');
  perform pg_temp.serving_assert(not has_table_privilege('service_role','public.axp_account_campaign_serving','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER'),'no new service table grants');
  perform pg_temp.serving_assert(not has_table_privilege('anon','public.axp_account_campaign_serving','SELECT,INSERT,UPDATE,DELETE'),'anon enrollment denied');
  perform pg_temp.serving_assert(not has_table_privilege('authenticated','public.axp_account_campaign_serving','DELETE,TRUNCATE,TRIGGER'),'no destructive owner grants');
  foreach col in array array['approved_content_hash','financial_mode','updated_at','advertiser_id','advertiser_name','advertiser_website'] loop
    perform pg_temp.serving_assert(not has_column_privilege('authenticated','public.axp_account_campaign_serving',col,'INSERT,UPDATE'),'derived column '||col);
  end loop;
  foreach col in array array['campaign_id','organization_id'] loop
    perform pg_temp.serving_assert(not has_column_privilege('authenticated','public.axp_account_campaign_serving',col,'UPDATE'),'immutable binding '||col);
  end loop;
end;$$;

set local role anon;
select pg_temp.serving_expect('select public.axp_network_campaigns()',null,'42501');
select pg_temp.serving_expect('select * from public.axp_account_campaign_serving',null,'42501');
select pg_temp.serving_expect('select public.axp_account_serving_operation(''campaignServing'',''{}'')',null,'42501');

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_serving_state where key='unconfirmed'),'role','authenticated')::text,true);
select pg_temp.serving_expect('select public.axp_account_serving_operation(''campaignServing'',''{}'')','unauthorized','PT401');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_serving_state where key='a'),'role','authenticated')::text,true);
do $$declare org jsonb; other_org jsonb; advertiser jsonb; campaign jsonb; payload jsonb; enrollment jsonb; input jsonb;
begin
  perform public.axp_account_operation('ensureUser','{}');
  org:=public.axp_account_operation('createOrganization','{"name":"Serving A"}');
  other_org:=public.axp_account_operation('createOrganization','{"name":"Other A organization"}');
  advertiser:=public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',org->'id',
    'input',jsonb_build_object('name','Brand A','website','https://a.example.invalid','description','Fixture only')));
  input:=(select value from axp_serving_state where key='input');
  campaign:=public.axp_account_resource_operation('saveCampaign',jsonb_build_object('orgId',org->'id','campaignId',null,'input',input));
  insert into axp_serving_state values('org_a',org->'id'),('other_org',other_org->'id'),('campaign_a',campaign->'id'),('advertiser_a',advertiser->'id');
  payload:=jsonb_build_object('orgId',org->'id','campaignId',campaign->'id');
  perform pg_temp.serving_assert(public.axp_account_serving_operation('campaignServing',payload) is null,'owned absent enrollment = null');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":1,"enabled":true}'),'campaign_approval_required','PT409');
  perform pg_temp.serving_expect(format('insert into public.axp_account_campaign_serving(campaign_id,organization_id,version,enabled) values(%L,%L,1,true)',
    campaign->>'id',org->>'id'),'campaign_approval_required','PT409');
  perform pg_temp.serving_assert(public.axp_account_serving_operation('campaignServing',payload) is null,'failed enable has no row');
  campaign:=public.axp_account_resource_operation('approveCampaign',payload||'{"expectedVersion":1}');
  insert into axp_serving_state values('original_a',campaign);
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":2,"enabled":true}'),'campaign_version_conflict','PT409');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":1,"enabled":"true"}'),'invalid_input','PT400');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":1.5,"enabled":true}'),'invalid_input','PT400');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":1,"enabled":true,"ownerId":"forged"}'),'unknown_field','PT400');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"enabled":true}'),'missing_field','PT400');
  enrollment:=public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":1,"enabled":true}');
  perform public.axp_account_exact(enrollment,array['campaignId','organizationId','version','approvedContentHash','enabled','financialMode','updatedAt']);
  perform pg_temp.serving_assert(enrollment->'campaignId'=campaign->'id' and enrollment->'organizationId'=org->'id'
    and enrollment->'version'='1' and enrollment->'enabled'='true' and enrollment->>'financialMode'='synthetic'
    and enrollment->'approvedContentHash'=campaign->'approvedContentHash','frozen exact enrollment DTO');
  perform pg_temp.serving_assert(public.axp_account_resource_operation('campaign',payload)=campaign,'enable cannot rewrite original campaign');
  perform public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":1,"enabled":false}');
  perform pg_temp.serving_assert(public.axp_account_resource_operation('campaign',payload)=campaign,'pause cannot rewrite original campaign');
  perform public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":1,"enabled":true}');
  perform public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',org->'id',
    'input',jsonb_build_object('name','Changed Brand A','website','https://changed.example.invalid','description','Changed fixture')));
  perform public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":1,"enabled":true}');
  perform pg_temp.serving_assert((select advertiser_name='Brand A' and advertiser_website='https://a.example.invalid/'
    from public.axp_account_campaign_serving where campaign_id=(campaign->>'id')::uuid),'enabled snapshot fixed across profile edits/repeated enable');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set version=2 where campaign_id=%L',campaign->>'id'),
    'campaign_version_conflict','PT409');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set approved_content_hash=%L where campaign_id=%L',repeat('b',64),campaign->>'id'),null,'42501');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set organization_id=%L where campaign_id=%L',other_org->>'id',campaign->>'id'),null,'42501');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)','campaignServing',payload||jsonb_build_object('orgId',other_org->'id')),'not_found','PT404');
  perform pg_temp.serving_expect('select public.axp_network_campaigns()',null,'42501');
end;$$;

set local role service_role;
do $$declare rows jsonb; expected jsonb;
begin
  rows:=public.axp_network_campaigns();
  expected:=(select value from axp_serving_state where key='original_a');
  perform pg_temp.serving_assert(jsonb_array_length(rows)=1 and rows->0->'campaign'=expected,'trusted catalogue exact approved campaign');
  perform pg_temp.serving_assert((select count(*)=3 from jsonb_object_keys(rows->0))
    and (rows->0) ?& array['campaign','advertiser','enrollment'],'exact catalogue envelope');
  perform pg_temp.serving_assert((select count(*)=3 from jsonb_object_keys(rows->0->'advertiser'))
    and (rows->0->'advertiser') ?& array['id','name','website'],'exact snapshot DTO');
  perform pg_temp.serving_assert(rows->0->'advertiser'->>'name'='Brand A','catalogue uses snapshot, not current profile');
  perform pg_temp.serving_expect('select * from public.axp_account_campaign_serving',null,'42501');
  perform pg_temp.serving_expect('select public.axp_account_serving_operation(''campaignServing'',''{}'')',null,'42501');
end;$$;

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_serving_state where key='b'),'role','authenticated')::text,true);
do $$declare org jsonb; advertiser jsonb; campaign jsonb; payload jsonb; foreign_payload jsonb;
begin
  perform public.axp_account_operation('ensureUser','{}');
  org:=public.axp_account_operation('createOrganization','{"name":"Serving B"}');
  advertiser:=public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',org->'id',
    'input',jsonb_build_object('name','Brand B','website','https://b.example.invalid','description','Fixture only')));
  campaign:=public.axp_account_resource_operation('saveCampaign',jsonb_build_object('orgId',org->'id','campaignId',null,
    'input',(select value from axp_serving_state where key='input')||'{"settlementNetwork":"tempo-testnet"}'));
  payload:=jsonb_build_object('orgId',org->'id','campaignId',campaign->'id');
  perform public.axp_account_resource_operation('approveCampaign',payload||'{"expectedVersion":1}');
  -- Exercise the granted direct-write path, not just the RPC.
  insert into public.axp_account_campaign_serving(campaign_id,organization_id,version,enabled)
    values((campaign->>'id')::uuid,(org->>'id')::uuid,1,true);
  insert into axp_serving_state values('org_b',org->'id'),('campaign_b',campaign->'id'),('advertiser_b',advertiser->'id');
  foreign_payload:=jsonb_build_object('orgId',(select value from axp_serving_state where key='org_a'),
    'campaignId',(select value from axp_serving_state where key='campaign_a'));
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)','campaignServing',foreign_payload),'not_found','PT404');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)','setCampaignServing',foreign_payload||'{"expectedVersion":1,"enabled":false}'),'not_found','PT404');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)','campaignServing',foreign_payload||jsonb_build_object('orgId',org->'id')),'not_found','PT404');
  perform pg_temp.serving_assert((select count(*) from public.axp_account_campaign_serving)=1,'owner B cannot enumerate A via table RLS');
  update public.axp_account_campaign_serving set enabled=false where campaign_id=(foreign_payload->>'campaignId')::uuid;
  perform pg_temp.serving_assert((select enabled from public.axp_account_campaign_serving where campaign_id=(campaign->>'id')::uuid),'foreign update does not affect own row');
  perform pg_temp.serving_expect(format('insert into public.axp_account_campaign_serving(campaign_id,organization_id,version,enabled) values(%L,%L,1,true)',
    foreign_payload->>'campaignId',org->>'id'),'not_found','PT404');
end;$$;
set local role service_role;
select pg_temp.serving_assert(jsonb_array_length(public.axp_network_campaigns())=2,'two owners share catalogue without rail aggregation');

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_serving_state where key='a'),'role','authenticated')::text,true);
do $$declare payload jsonb; old_enrollment jsonb; changed jsonb;
begin
  payload:=jsonb_build_object('orgId',(select value from axp_serving_state where key='org_a'),'campaignId',(select value from axp_serving_state where key='campaign_a'));
  old_enrollment:=public.axp_account_serving_operation('campaignServing',payload);
  -- Even an identical direct edit is a new version; BEFORE guard invalidates
  -- enrollment without changing its historical version/approval snapshot.
  update public.axp_account_campaigns set input=input where id=(payload->>'campaignId')::uuid;
  changed:=public.axp_account_serving_operation('campaignServing',payload);
  perform pg_temp.serving_assert(changed->'enabled'='false' and changed->'version'=old_enrollment->'version'
    and changed->'approvedContentHash'=old_enrollment->'approvedContentHash','direct edit invalidates historical opt-in');
  perform pg_temp.serving_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)',
    'approveCampaign',payload||'{"expectedVersion":1}'),'campaign_version_conflict','PT409');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":1,"enabled":false}'),'campaign_version_conflict','PT409');
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":2,"enabled":true}'),'campaign_approval_required','PT409');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set enabled=true where campaign_id=%L',payload->>'campaignId'),
    'campaign_version_conflict','PT409');
  changed:=public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":2,"enabled":false}');
  perform pg_temp.serving_assert(changed->'approvedContentHash'='null','current draft can be explicitly disabled');
  perform public.axp_account_resource_operation('approveCampaign',payload||'{"expectedVersion":2}');
  perform pg_temp.serving_assert(public.axp_account_serving_operation('campaignServing',payload)->'enabled'='false','reapproval does not opt in');
end;$$;
set local role service_role;
select pg_temp.serving_assert(jsonb_array_length(public.axp_network_campaigns())=1,'edited/reapproved A absent until explicit enable');

-- Defense in depth if a future migration accidentally broadens column grants.
reset role;
grant update(campaign_id,organization_id,approved_content_hash,advertiser_id,advertiser_name,advertiser_website,updated_at,financial_mode)
  on public.axp_account_campaign_serving to authenticated;
set local role authenticated;
do $$declare payload jsonb; campaign jsonb; i integer;
begin
  payload:=jsonb_build_object('orgId',(select value from axp_serving_state where key='org_a'),'campaignId',(select value from axp_serving_state where key='campaign_a'));
  perform public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":2,"enabled":true}');
  perform pg_temp.serving_assert((select advertiser_name='Changed Brand A' from public.axp_account_campaign_serving
    where campaign_id=(payload->>'campaignId')::uuid),'fresh opt-in snapshots changed profile');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set approved_content_hash=%L where campaign_id=%L',repeat('b',64),payload->>'campaignId'),'invalid_input','PT400');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set advertiser_name=%L where campaign_id=%L','Forged',payload->>'campaignId'),'invalid_input','PT400');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set advertiser_website=%L where campaign_id=%L','https://forged.test',payload->>'campaignId'),'invalid_input','PT400');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set advertiser_id=%L where campaign_id=%L',
    (select value#>>'{}' from axp_serving_state where key='advertiser_b'),payload->>'campaignId'),'invalid_input','PT400');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set financial_mode=%L where campaign_id=%L','devnet',payload->>'campaignId'),'invalid_input','PT400');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set organization_id=%L where campaign_id=%L',
    (select value#>>'{}' from axp_serving_state where key='other_org'),payload->>'campaignId'),'not_found','PT404');
  -- Add 99 approved, explicitly enabled A campaigns (100 per-org maximum).
  for i in 1..99 loop
    campaign:=public.axp_account_resource_operation('saveCampaign',jsonb_build_object('orgId',payload->'orgId','campaignId',null,
      'input',(select value from axp_serving_state where key='input')||jsonb_build_object('name','Bound fixture '||i)));
    perform public.axp_account_resource_operation('approveCampaign',jsonb_build_object('orgId',payload->'orgId','campaignId',campaign->'id','expectedVersion',1));
    perform public.axp_account_serving_operation('setCampaignServing',jsonb_build_object('orgId',payload->'orgId','campaignId',campaign->'id','expectedVersion',1,'enabled',true));
  end loop;
end;$$;
set local role service_role;
select pg_temp.serving_assert(jsonb_array_length(public.axp_network_campaigns())=100,'catalogue bounded at 100 across 101 enabled rows');

-- Confirmation revocation removes an owner's campaigns without touching rows.
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_serving_state where key='b'),'role','authenticated')::text,true);
do $$declare payload jsonb;
begin
  payload:=jsonb_build_object('orgId',(select value from axp_serving_state where key='org_b'),'campaignId',(select value from axp_serving_state where key='campaign_b'));
  perform public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":1,"enabled":false}');
  perform public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',payload->'orgId',
    'input','{"name":"Local profile","website":"http://localhost:1234/","description":"Fixture"}'::jsonb));
  perform pg_temp.serving_expect(format('select public.axp_account_serving_operation(%L,%L::jsonb)',
    'setCampaignServing',payload||'{"expectedVersion":1,"enabled":true}'),'campaign_destination_invalid','PT409');
  perform pg_temp.serving_expect(format('update public.axp_account_campaign_serving set enabled=true where campaign_id=%L',payload->>'campaignId'),
    'campaign_destination_invalid','PT409');
  perform public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',payload->'orgId',
    'input','{"name":"Brand B","website":"https://b.example.invalid/","description":"Fixture"}'::jsonb));
  perform public.axp_account_serving_operation('setCampaignServing',payload||'{"expectedVersion":1,"enabled":true}');
end;$$;
reset role;
update auth.users set email_confirmed_at=null where id=(select (value#>>'{}')::uuid from axp_serving_state where key='a');
set local role service_role;
select pg_temp.serving_assert(jsonb_array_length(public.axp_network_campaigns())=1,'unconfirmed owner excluded from trusted catalogue');
reset role;
rollback;
