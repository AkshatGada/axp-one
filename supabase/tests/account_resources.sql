-- Run whole-file AFTER both account migrations as migration owner. Uses only
-- fresh fictional Auth identities. All helpers/records/grants ROLLBACK; no cloud
-- execution authority is conveyed by this file. No provider/payment interaction.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
create temporary table axp_resource_state(key text primary key,value jsonb not null) on commit drop;
grant select,insert,update on axp_resource_state to authenticated,anon;
do $$begin
  execute format('grant usage on schema %I to authenticated,anon',
    (select nspname from pg_namespace where oid=pg_my_temp_schema()));
end;$$;
create function pg_temp.resource_assert(ok boolean,label text) returns void
language plpgsql security invoker set search_path='' as $$
begin if ok is not true then raise exception 'acceptance_failed: %',label; end if; end;
$$;
create function pg_temp.resource_expect(query text,code text,state text) returns void
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
insert into axp_resource_state values('a',to_jsonb(gen_random_uuid())),('b',to_jsonb(gen_random_uuid())),
  ('input','{"name":"Fixture campaign","productDescription":"Hardware wallet","approvedText":"Keep keys offline.","contextHints":["offline storage"],"declaredCapabilities":["hardware_wallet"],"maxBidBaseUnits":"40","budgetCapBaseUnits":"1000","settlementNetwork":"solana-devnet"}');
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
  select (value#>>'{}')::uuid,'authenticated','authenticated','axp-resource-'||(value#>>'{}')||'@example.invalid',now(),now(),now()
  from axp_resource_state where key in ('a','b');

do $$declare relation text; col text;
begin
  perform pg_temp.resource_assert((select not prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid='public.axp_account_resource_operation(text,jsonb)'::regprocedure),'owner RPC invoker/fixed path');
  perform pg_temp.resource_assert((select prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid='public.axp_resolve_app_credential(text)'::regprocedure),'resolver definer/fixed path');
  perform pg_temp.resource_assert(not has_function_privilege('anon','public.axp_account_resource_operation(text,jsonb)','EXECUTE'),'anon owner RPC denied');
  perform pg_temp.resource_assert(has_function_privilege('anon','public.axp_resolve_app_credential(text)','EXECUTE'),'narrow anon resolver');
  perform pg_temp.resource_assert(not has_column_privilege('authenticated','public.axp_account_app_credentials','key_hash','SELECT,UPDATE'),'hash not readable/editable');
  perform pg_temp.resource_assert(has_column_privilege('authenticated','public.axp_account_app_credentials','key_hash','INSERT'),'own-app hash issuance');
  foreach relation in array array['axp_account_campaigns','axp_account_app_credentials'] loop
    perform pg_temp.resource_assert((select relrowsecurity from pg_class where oid=('public.'||relation)::regclass),relation||' RLS');
    perform pg_temp.resource_assert(not has_table_privilege('anon','public.'||relation,'SELECT,INSERT,UPDATE,DELETE'),relation||' anon denied');
    perform pg_temp.resource_assert(not has_table_privilege('authenticated','public.'||relation,'DELETE,TRUNCATE,TRIGGER'),relation||' no destructive access');
    foreach col in array array['id','created_at'] loop
      perform pg_temp.resource_assert(not has_column_privilege('authenticated','public.'||relation,col,'INSERT,UPDATE'),relation||' protected '||col);
    end loop;
    perform pg_temp.resource_assert(not has_column_privilege('authenticated','public.'||relation,'organization_id','UPDATE'),relation||' immutable org');
  end loop;
  perform pg_temp.resource_assert(not has_column_privilege('authenticated','public.axp_account_campaigns','advertiser_id','INSERT,UPDATE'),'derived advertiser');
  perform pg_temp.resource_assert(not has_column_privilege('authenticated','public.axp_account_campaigns','approved_content_hash','INSERT,UPDATE'),'derived approval hash');
  perform pg_temp.resource_assert(not has_column_privilege('authenticated','public.axp_account_app_credentials','expires_at','INSERT,UPDATE'),'derived expiry');
end;$$;

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_resource_state where key='a'),'role','authenticated')::text,true);
do $$declare org jsonb; other_org jsonb; app jsonb; other_app jsonb; advertiser jsonb; campaign jsonb; approved jsonb; changed jsonb; cred jsonb; replacement jsonb; payload jsonb; input jsonb; i integer;
begin
  perform public.axp_account_operation('ensureUser','{}');
  org:=public.axp_account_operation('createOrganization','{"name":"Resource owner A"}');
  other_org:=public.axp_account_operation('createOrganization','{"name":"Other A org"}');
  advertiser:=public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',org->'id','input',jsonb_build_object('name','Brand A','website','https://a.example.invalid','description','Declared only')));
  app:=public.axp_account_operation('saveApp',jsonb_build_object('orgId',org->'id','appId',null,'input',jsonb_build_object('name','App A','website','https://a.example.invalid','allowedOrigins',jsonb_build_array('https://a.example.invalid'),'blockedCategories',jsonb_build_array('gambling'),'payout',null)));
  other_app:=public.axp_account_operation('saveApp',jsonb_build_object('orgId',org->'id','appId',null,'input',jsonb_build_object('name','App A2','website','https://a2.example.invalid','allowedOrigins','[]'::jsonb,'blockedCategories','[]'::jsonb,'payout',null)));
  insert into axp_resource_state values('org_a',org->'id'),('other_org',other_org->'id'),('app_a',app->'id'),('other_app',other_app->'id');
  input:=(select value from axp_resource_state where key='input');
  payload:=jsonb_build_object('orgId',org->'id','campaignId',null,'input',input);
  campaign:=public.axp_account_resource_operation('saveCampaign',payload);
  insert into axp_resource_state values('campaign_a',campaign->'id');
  perform public.axp_account_exact(campaign,array['id','organizationId','advertiserId','version','status','input','approvedContentHash','createdAt','updatedAt','servingStatus']);
  perform pg_temp.resource_assert(campaign->'advertiserId'=advertiser->'id' and campaign->>'version'='1' and campaign->>'status'='draft' and campaign->'approvedContentHash'='null'::jsonb and campaign->>'servingStatus'='not_connected','campaign derived draft DTO');
  perform pg_temp.resource_assert(public.axp_account_resource_operation('campaigns',jsonb_build_object('orgId',org->'id'))=jsonb_build_array(campaign),'campaign list');
  approved:=public.axp_account_resource_operation('approveCampaign',jsonb_build_object('orgId',org->'id','campaignId',campaign->'id','expectedVersion',1));
  perform pg_temp.resource_assert(approved->>'approvedContentHash'=public.axp_resource_hash(input) and approved->>'status'='approved' and approved->>'version'='1','exact saved approval');
  -- Fixed independent SHA-256 vector is also checked by JS tests.
  perform pg_temp.resource_assert(public.axp_resource_json('{"z":["x",2],"a":"😀"}')='{"a":"😀","z":["x",2]}','canonical JSON bytes');
  changed:=public.axp_account_resource_operation('saveCampaign',payload||jsonb_build_object('campaignId',campaign->'id'));
  perform pg_temp.resource_assert(changed->>'version'='2' and changed->>'status'='draft' and changed->'approvedContentHash'='null'::jsonb and changed->'createdAt'=campaign->'createdAt','even identical edit clears approval');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','approveCampaign',jsonb_build_object('orgId',org->'id','campaignId',campaign->'id','expectedVersion',1)),'campaign_version_conflict','PT409');
  perform pg_temp.resource_assert(public.axp_account_resource_operation('campaign',jsonb_build_object('orgId',org->'id','campaignId',campaign->'id'))->>'status'='draft','stale approval leaves draft unchanged');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','approveCampaign',jsonb_build_object('orgId',org->'id','campaignId',campaign->'id','expectedVersion',0)),'invalid_input','PT400');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','approveCampaign',jsonb_build_object('orgId',org->'id','campaignId',campaign->'id')),'missing_field','PT400');
  perform public.axp_account_resource_operation('approveCampaign',jsonb_build_object('orgId',org->'id','campaignId',campaign->'id','expectedVersion',2));
  update public.axp_account_campaigns as c set input=c.input where c.id=(campaign->>'id')::uuid;
  changed:=public.axp_account_resource_operation('campaign',jsonb_build_object('orgId',org->'id','campaignId',campaign->'id'));
  perform pg_temp.resource_assert(changed->>'version'='3' and changed->>'status'='draft' and changed->'approvedContentHash'='null'::jsonb,'direct identical edit also clears approval');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','campaign',jsonb_build_object('orgId',other_org->'id','campaignId',campaign->'id')),'not_found','PT404');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','saveCampaign',jsonb_build_object('orgId',other_org->'id','campaignId',null,'input',input)),'not_found','PT404');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','saveCampaign',payload||jsonb_build_object('input',input||'{"ownerId":"forged"}')),'unknown_field','PT400');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','saveCampaign',payload||jsonb_build_object('input',input||'{"maxBidBaseUnits":"4001"}')),'spend_limit_exceeded','PT400');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','saveCampaign',payload||jsonb_build_object('input',input||'{"approvedText":"private@example.invalid"}')),'private_content','PT400');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','saveCampaign',payload||jsonb_build_object('input',input||jsonb_build_object('name',repeat(chr(128512),61)))),'invalid_input','PT400');
  for i in 2..100 loop perform public.axp_account_resource_operation('saveCampaign',payload); end loop;
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','saveCampaign',payload),'limit_exceeded','PT409');
  perform public.axp_account_resource_operation('saveCampaign',payload||jsonb_build_object('campaignId',campaign->'id'));

  payload:=jsonb_build_object('orgId',org->'id','appId',app->'id','input',jsonb_build_object('label','Key A','keyHash',repeat('a',64)));
  cred:=public.axp_account_resource_operation('issueAppCredential',payload);
  insert into axp_resource_state values('key_a',cred->'id'),('credential_a',cred);
  perform public.axp_account_exact(cred,array['id','organizationId','appId','publisherId','label','scopes','createdAt','expiresAt','revokedAt']);
  perform pg_temp.resource_assert(cred->>'publisherId'='app:'||(app->>'id') and (cred->>'expiresAt')::bigint-(cred->>'createdAt')::bigint=2592000000,'credential app scope and expiry');
  perform pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('a',64))->'credential'=cred,'resolver credential');
  perform pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('a',64))->'app'=app,'resolver full app restrictions DTO');
  perform pg_temp.resource_assert(public.axp_account_resource_operation('appCredentials',jsonb_build_object('orgId',org->'id','appId',app->'id'))=jsonb_build_array(cred),'metadata list excludes hashes');
  for i in 1..9 loop perform public.axp_account_resource_operation('issueAppCredential',payload||jsonb_build_object('input',jsonb_build_object('label','Additional','keyHash',lpad(to_hex(i),64,'0')))); end loop;
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','issueAppCredential',payload||jsonb_build_object('input',jsonb_build_object('label','Overflow','keyHash',repeat('f',64)))),'limit_exceeded','PT409');
  -- Duplicate hash after revocation must roll back that revocation atomically.
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','rotateAppCredential',payload||jsonb_build_object('keyId',cred->'id')),'credential_hash_conflict','PT409');
  perform pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('a',64)) is not null,'failed rotation preserved live original');
  replacement:=public.axp_account_resource_operation('rotateAppCredential',payload||jsonb_build_object('keyId',cred->'id','input',jsonb_build_object('label','Rotated','keyHash',repeat('b',64))));
  insert into axp_resource_state values('rotated_a',replacement->'id');
  perform pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('a',64)) is null and public.axp_resolve_app_credential(repeat('b',64)) is not null,'rotation atomic old dead new live at quota');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','rotateAppCredential',payload||jsonb_build_object('keyId',cred->'id')),'credential_not_active','PT409');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','revokeAppCredential',jsonb_build_object('orgId',org->'id','appId',other_app->'id','keyId',replacement->'id')),'not_found','PT404');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','appCredentials',jsonb_build_object('orgId',other_org->'id','appId',app->'id')),'not_found','PT404');
  cred:=public.axp_account_resource_operation('revokeAppCredential',jsonb_build_object('orgId',org->'id','appId',app->'id','keyId',replacement->'id'));
  perform pg_temp.resource_assert(public.axp_account_resource_operation('revokeAppCredential',jsonb_build_object('orgId',org->'id','appId',app->'id','keyId',replacement->'id'))=cred,'revocation idempotent');
  perform pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('b',64)) is null,'revoked key never resolves');
  perform pg_temp.resource_expect(format('update public.axp_account_app_credentials set revoked_at=null where id=%L',replacement->>'id'),'credential_not_active','PT409');
  -- A second app can independently issue while the first is at quota.
  perform public.axp_account_resource_operation('issueAppCredential',payload||jsonb_build_object('appId',other_app->'id','input',jsonb_build_object('label','Other app','keyHash',repeat('c',64))));
end;$$;

-- Actual privilege failures under authenticated, not owner-bypass assertions.
select pg_temp.resource_expect('select key_hash from public.axp_account_app_credentials',null,'42501');
select pg_temp.resource_expect('select * from public.axp_account_app_credentials',null,'42501');
select pg_temp.resource_expect('update public.axp_account_app_credentials set key_hash=repeat(''f'',64)',null,'42501');
select pg_temp.resource_expect('update public.axp_account_app_credentials set expires_at=0',null,'42501');
select pg_temp.resource_expect('update public.axp_account_campaigns set version=99',null,'42501');
select pg_temp.resource_expect('update public.axp_account_campaigns set advertiser_id=gen_random_uuid()',null,'42501');
select pg_temp.resource_expect('update public.axp_account_campaigns set organization_id=gen_random_uuid()',null,'42501');
select pg_temp.resource_expect('update public.axp_account_campaigns set approved_content_hash=repeat(''f'',64)',null,'42501');
select pg_temp.resource_expect('delete from public.axp_account_app_credentials',null,'42501');
select pg_temp.resource_expect('delete from public.axp_account_campaigns',null,'42501');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select value#>>'{}' from axp_resource_state where key='b'),'role','authenticated')::text,true);
do $$declare org jsonb; app jsonb; campaign jsonb; input jsonb; payload jsonb; op text;
begin
  perform public.axp_account_operation('ensureUser','{}');
  org:=public.axp_account_operation('createOrganization','{"name":"Resource owner B"}');
  perform public.axp_account_operation('saveAdvertiser',jsonb_build_object('orgId',org->'id','input',jsonb_build_object('name','Brand B','website','https://b.example.invalid','description','Independent')));
  app:=public.axp_account_operation('saveApp',jsonb_build_object('orgId',org->'id','appId',null,'input',jsonb_build_object('name','App B','website','https://b.example.invalid','allowedOrigins',jsonb_build_array('https://b.example.invalid'),'blockedCategories',jsonb_build_array('alcohol'),'payout',null)));
  insert into axp_resource_state values('org_b',org->'id'),('app_b',app->'id');
  input:=(select value from axp_resource_state where key='input');
  campaign:=public.axp_account_resource_operation('saveCampaign',jsonb_build_object('orgId',org->'id','campaignId',null,'input',input));
  perform pg_temp.resource_assert((select count(*)=1 from public.axp_account_campaigns),'second advertiser independently scoped');
  perform pg_temp.resource_assert((select count(*)=0 from public.axp_account_credential_metadata),'second owner cannot read first keys');
  perform public.axp_account_resource_operation('issueAppCredential',jsonb_build_object('orgId',org->'id','appId',app->'id','input',jsonb_build_object('label','B key','keyHash',repeat('d',64))));
  payload:=jsonb_build_object('orgId',(select value from axp_resource_state where key='org_a'));
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','campaigns',payload),'not_found','PT404');
  foreach op in array array['campaign','approveCampaign'] loop
    perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)',op,payload||jsonb_build_object('campaignId',(select value from axp_resource_state where key='campaign_a'))||case when op='approveCampaign' then '{"expectedVersion":1}'::jsonb else '{}'::jsonb end),'not_found','PT404');
    perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)',op,jsonb_build_object('orgId',org->'id','campaignId',gen_random_uuid())||case when op='approveCampaign' then '{"expectedVersion":1}'::jsonb else '{}'::jsonb end),'not_found','PT404');
  end loop;
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','saveCampaign',payload||jsonb_build_object('campaignId',null,'input',input)),'not_found','PT404');
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','appCredentials',payload||jsonb_build_object('appId',(select value from axp_resource_state where key='app_a'))),'not_found','PT404');
  foreach op in array array['revokeAppCredential','rotateAppCredential'] loop
    payload:=jsonb_build_object('orgId',org->'id','appId',app->'id','keyId',(select value from axp_resource_state where key='key_a'));
    if op='rotateAppCredential' then payload:=payload||jsonb_build_object('input',jsonb_build_object('label','Stolen','keyHash',repeat('e',64))); end if;
    perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)',op,payload),'not_found','PT404');
  end loop;
  perform pg_temp.resource_expect(format('insert into public.axp_account_app_credentials(organization_id,app_id,label,key_hash) values(%L,%L,%L,%L)',org->>'id',(select value#>>'{}' from axp_resource_state where key='app_a'),'Forged app',repeat('e',64)),'not_found','PT404');
  perform pg_temp.resource_expect(format('insert into public.axp_account_campaigns(organization_id,input) values(%L,%L)',(select value#>>'{}' from axp_resource_state where key='org_a'),input),'not_found','PT404');
  update public.axp_account_campaigns set status='approved' where id=(select (value#>>'{}')::uuid from axp_resource_state where key='campaign_a');
  perform pg_temp.resource_assert(not found,'foreign direct approval invisible');
end;$$;

-- Test expiry with owner-only fixture clock manipulation: never sleep or alter
-- real records. Trigger is disabled only for this fixture setup, then restored.
reset role;
alter table public.axp_account_app_credentials disable trigger axp_account_credentials_guard;
update public.axp_account_app_credentials set created_at=1,expires_at=2592000001 where key_hash=repeat('d',64);
alter table public.axp_account_app_credentials enable trigger axp_account_credentials_guard;
set local role authenticated;
select pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('d',64)) is null,'expired key resolver denied');
do $$declare payload jsonb;
begin
  payload:=jsonb_build_object('orgId',(select value from axp_resource_state where key='org_b'),'appId',(select value from axp_resource_state where key='app_b'),
    'keyId',(select to_jsonb(id) from public.axp_account_credential_metadata where app_id=(select (value#>>'{}')::uuid from axp_resource_state where key='app_b')),
    'input',jsonb_build_object('label','Expired','keyHash',repeat('e',64)));
  perform pg_temp.resource_expect(format('select public.axp_account_resource_operation(%L,%L::jsonb)','rotateAppCredential',payload),'credential_not_active','PT409');
end;$$;

-- Future accidental column grants still cannot bypass trigger invariants.
reset role;
grant update(app_id,key_hash,expires_at) on public.axp_account_app_credentials to authenticated;
grant update(advertiser_id,approved_content_hash,version,organization_id) on public.axp_account_campaigns to authenticated;
set local role authenticated;
select pg_temp.resource_expect('update public.axp_account_app_credentials set key_hash=repeat(''e'',64)','invalid_input','PT400');
select pg_temp.resource_expect('update public.axp_account_app_credentials set expires_at=expires_at+1','invalid_input','PT400');
select pg_temp.resource_expect('update public.axp_account_campaigns set version=99','invalid_input','PT400');
select pg_temp.resource_expect('update public.axp_account_campaigns set advertiser_id=gen_random_uuid()','not_found','PT404');

reset role;
update auth.users set email_confirmed_at=null where id=(select (value#>>'{}')::uuid from axp_resource_state where key='b');
set local role authenticated;
select pg_temp.resource_expect('select public.axp_account_resource_operation(''campaigns'',''{}'')','unauthorized','PT401');

reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select pg_temp.resource_expect('select public.axp_account_resource_operation(''campaigns'',''{}'')',null,'42501');
select pg_temp.resource_expect('select * from public.axp_account_campaigns',null,'42501');
select pg_temp.resource_expect('select * from public.axp_account_app_credentials',null,'42501');
select pg_temp.resource_expect('select * from public.axp_account_credential_metadata',null,'42501');
select pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('a',64)) is null,'anon revoked denied');
select pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('d',64)) is null,'anon expired denied');
select pg_temp.resource_assert(public.axp_resolve_app_credential('raw-key') is null,'malformed resolver denied');
select pg_temp.resource_assert(public.axp_resolve_app_credential(null) is null,'null resolver denied');
select pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('f',64)) is null,'unknown resolver denied');
select pg_temp.resource_assert(public.axp_resolve_app_credential(repeat('c',64))->'app'->'id'=(select value from axp_resource_state where key='other_app'),'anon live exact hash resolution only');
select pg_temp.resource_assert(not(public.axp_resolve_app_credential(repeat('c',64))->'credential' ?| array['keyHash','key_hash','apiKey']),'resolver no digest/raw key');
reset role;
rollback;
