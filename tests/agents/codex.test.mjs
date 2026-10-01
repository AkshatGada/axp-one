import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {readFile,stat,access} from 'node:fs/promises';
import {hash,validateDecision} from '../../packages/contracts/index.mjs';
import {campaignFixtures,opportunityFixture} from '../../packages/contracts/fixtures.mjs';
import {CODEX_MODEL,codexBuyer,organicAnswer,runCodexJSON} from '../../packages/dsp/codex.mjs';

const answerSchema={type:'object',additionalProperties:false,properties:{answer:{type:'string'}},required:['answer']};
const usage={input_tokens:17,output_tokens:11};
const completedEvents=value=>[
  {type:'thread.started',thread_id:'fixture-only'},
  {type:'item.completed',item:{type:'reasoning',text:'Fixture reasoning'}},
  {type:'item.completed',item:{type:'agent_message',text:JSON.stringify(value)}},
  {type:'turn.completed',usage},
];

// Never starts an executable: only the Node stream/child-event seam is simulated.
function fixture({value={answer:'Compare booking workflows, expense capture and integration needs.'},events,raw,code=0,stderr='',hang=false,launchError}={}) {
  const calls=[];
  const spawnImpl=(executable,args,options)=>{
    const child=new EventEmitter();
    child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();
    const call={executable,args:[...args],options,prompt:'',kills:[]};calls.push(call);
    child.kill=signal=>{call.kills.push(signal);queueMicrotask(()=>child.emit('close',null));return true;};
    child.stdin.setEncoding('utf8');child.stdin.on('data',data=>{call.prompt+=data;});
    child.stdin.on('finish',async()=>{
      try {
        const path=args[args.indexOf('--output-schema')+1];
        call.schema=JSON.parse(await readFile(path,'utf8'));
        call.schemaMode=(await stat(path)).mode&0o777;
        if(launchError)return child.emit('error',Object.assign(new Error('fixture launch failed'),{code:launchError}));
        if(hang)return;
        const output=raw??(events??completedEvents(value)).map(event=>JSON.stringify(event)).join('\n');
        // Split JSONL across chunks and leave the last line without a newline.
        const cut=Math.floor(output.length/2);
        child.stdout.write(output.slice(0,cut));child.stdout.write(output.slice(cut));
        child.stderr.write(stderr);child.emit('close',code);
      }catch(error){child.emit('error',error);}
    });
    return child;
  };
  return {calls,spawnImpl};
}

test('organic answer preserves schema, provenance and invocation-only CLI settings',async()=>{
  const f=fixture();
  const result=await organicAnswer('Find a tool for corporate travel booking and automatic expense capture.',{spawnImpl:f.spawnImpl,executable:'/fixture/existing-codex',model:'wrong',effort:'high',args:['--dangerously-bypass-approvals-and-sandbox']});
  const [call]=f.calls;
  assert.equal(call.executable,'/fixture/existing-codex');
  const dir=call.args[call.args.indexOf('-C')+1];
  assert.deepEqual(call.args,['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--json','--color','never','-C',dir,'-m','gpt-6.1-sol','-c','model_reasoning_effort="low"','-c','project_doc_max_bytes=0','-c','web_search="disabled"','--output-schema',`${dir}/response.schema.json`,'-']);
  assert.equal(call.options.cwd,dir);
  assert.deepEqual(call.options.stdio,['pipe','pipe','pipe']);
  assert.ok(!call.args.includes(call.prompt));
  assert.deepEqual(call.schema,answerSchema);assert.equal(call.schemaMode,0o600);
  assert.equal(result.value.answer,'Compare booking workflows, expense capture and integration needs.');
  assert.deepEqual({...result.provenance,elapsedMs:0},{engine:'codex',model:CODEX_MODEL,effort:'low',runtime:'codex-cli',elapsedMs:0,inputHash:hash({prompt:call.prompt,schema:call.schema}),usage,status:'completed',toolUse:'none',invocationScoped:true});
  assert.ok(result.provenance.elapsedMs>=0);
  await assert.rejects(access(dir),{code:'ENOENT'});
});

test('organic guidance options are bounded and never forward advertising/runtime context',async()=>{
  const inputs=[];
  for(const guidance of ['general','travel','software']) {
    const f=fixture();
    await organicAnswer('Compare corporate travel software.',{guidance,spawnImpl:f.spawnImpl,campaigns:'CAMPAIGN_SENTINEL',profiles:'PROFILE_SENTINEL',bids:'BID_SENTINEL',winningAd:'AD_SENTINEL',context:'CONTEXT_SENTINEL'});
    inputs.push(f.calls[0].prompt);
    assert.ok(f.calls[0].prompt.includes('Compare corporate travel software.'));
    for(const sentinel of ['CAMPAIGN_SENTINEL','PROFILE_SENTINEL','BID_SENTINEL','AD_SENTINEL','CONTEXT_SENTINEL'])assert.ok(!f.calls[0].prompt.includes(sentinel));
    assert.match(f.calls[0].prompt,/no advertisements, campaigns, profiles, bids or sponsor data/);
  }
  assert.match(inputs[0],/Follow the actual task; do not assume it is a hotel search/);
  assert.match(inputs[1],/travel-planning guidance/);
  assert.match(inputs[2],/software-selection or implementation guidance/);
  const f=fixture();
  await organicAnswer('Compare corporate travel software.',{spawnImpl:f.spawnImpl});
  assert.equal(f.calls[0].prompt,inputs[0]);
});

test('child environment excludes credentials, payment authority and alternate auth configuration',async t=>{
  const secretNames=['AXP_CODEX_BIN','AXP_ADMIN_TOKEN','AXP_PAYMENT_SECRET','AXP_JEV_API_KEY','JEV_API_KEY','JEV_TOKEN','OPENAI_API_KEY','ANTHROPIC_API_KEY','API_KEY','PAYMENT_PRIVATE_KEY','SOLANA_PRIVATE_KEY','WALLET_SEED','AWS_SECRET_ACCESS_KEY','DATABASE_URL','CODEX_HOME','CODEX_API_KEY','NODE_OPTIONS','HTTP_PROXY'];
  const keys=[...secretNames,'HOME','PATH'];
  const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  t.after(()=>{for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}});
  for(const key of secretNames)process.env[key]=`fixture-secret-${key}`;
  process.env.HOME='/fixture/normal-home';process.env.PATH='/fixture/runtime-bin';
  const f=fixture();await organicAnswer('Compare travel software.',{spawnImpl:f.spawnImpl});
  assert.equal(f.calls[0].executable,'fixture-secret-AXP_CODEX_BIN');
  const {env}=f.calls[0].options;
  assert.equal(env.HOME,'/fixture/normal-home');assert.equal(env.PATH,'/fixture/runtime-bin');
  for(const key of secretNames)assert.equal(Object.hasOwn(env,key),false,key);
  assert.ok(Object.keys(env).every(key=>['HOME','PATH','TMPDIR','TMP','TEMP','LANG','LC_ALL','LC_CTYPE','TZ'].includes(key)));
  assert.ok(!JSON.stringify(env).includes('fixture-secret-'));
});

test('portable PATH executable is the default; explicit executable overrides remain supported',async t=>{
  const saved=process.env.AXP_CODEX_BIN;delete process.env.AXP_CODEX_BIN;
  t.after(()=>{if(saved===undefined)delete process.env.AXP_CODEX_BIN;else process.env.AXP_CODEX_BIN=saved;});
  const f=fixture();await organicAnswer('Plan a journey.',{spawnImpl:f.spawnImpl});
  assert.equal(f.calls[0].executable,'codex');
});

test('each invocation has independent arguments, workdir and input hash',async()=>{
  const f=fixture();
  const [a,b]=await Promise.all(['Plan a journey.','Compare software.'].map(prompt=>organicAnswer(prompt,{spawnImpl:f.spawnImpl})));
  assert.notEqual(f.calls[0].options.cwd,f.calls[1].options.cwd);
  assert.notEqual(f.calls[0].args,f.calls[1].args);assert.notEqual(a.provenance.inputHash,b.provenance.inputHash);
  for(const call of f.calls)await assert.rejects(access(call.options.cwd),{code:'ENOENT'});
});

test('tool items are rejected at every lifecycle phase, including unknown tool kinds',async t=>{
  for(const type of ['command_execution','mcp_tool_call','web_search','file_change','dynamic_tool_call','future_tool']) {
    for(const phase of ['started','updated','completed'])await t.test(`${type} ${phase}`,async()=>{
      const f=fixture({events:[{type:`item.${phase}`,item:{type}},...completedEvents({answer:'Must not be accepted'})]});
      await assert.rejects(organicAnswer('Plan a journey.',{spawnImpl:f.spawnImpl}),/agent_tool_use_not_allowed/);
      assert.deepEqual(f.calls[0].kills,['SIGTERM']);
      await assert.rejects(access(f.calls[0].options.cwd),{code:'ENOENT'});
    });
  }
});

test('invalid or incomplete output cannot acquire completed provenance',async t=>{
  const cases=[
    ['malformed JSONL',{raw:'not-json\n'},'agent_invalid_events'],
    ['invalid event shape',{raw:'null\n'},'agent_invalid_events'],
    ['failed turn',{events:[{type:'turn.failed'},...completedEvents({answer:'no'})]},'agent_execution_failed'],
    ['error event',{events:[{type:'error'},...completedEvents({answer:'no'})]},'agent_execution_failed'],
    ['error item',{events:[{type:'item.completed',item:{type:'error'}},...completedEvents({answer:'no'})]},'agent_execution_failed'],
    ['missing completion',{events:completedEvents({answer:'no'}).slice(0,-1)},'agent_result_missing'],
    ['missing message',{events:[{type:'turn.completed'}]},'agent_result_missing'],
    ['invalid message JSON',{events:[{type:'item.completed',item:{type:'agent_message',text:'not-json'}},{type:'turn.completed'}]},'agent_invalid_json'],
    ...[null,[],{}, {answer:1},{answer:'ok',sponsor:'not allowed'}].map((value,index)=>[`schema ${index}`,{value},'agent_invalid_output']),
  ];
  for(const [name,options,error] of cases)await t.test(name,async()=>{
    const f=fixture(options);await assert.rejects(organicAnswer('Plan a journey.',{spawnImpl:f.spawnImpl}),new RegExp(error));
    assert.equal(f.calls.length,1);await assert.rejects(access(f.calls[0].options.cwd),{code:'ENOENT'});
  });
});

test('codexBuyer retains its API and single-campaign advisory projection',async()=>{
  const campaign=campaignFixtures()[0],opportunity={...opportunityFixture(),id:'o-fixture',rawChat:'PRIVATE_CHAT',competitorBids:'COMPETITOR_BIDS'};
  const value={decision:'bid',creativeVersionId:campaign.creatives[0].creativeVersionId,relevanceLevel:3,commercialIntentLevel:2,evidenceFieldIds:['declaredConstraints'],reasonCodes:['task_fit']};
  const f=fixture({value});const result=await codexBuyer({...campaign,competitors:'COMPETITOR_CAMPAIGNS',apiKey:'BUYER_SECRET'},opportunity,{spawnImpl:f.spawnImpl});
  validateDecision(result,campaign,opportunity);assert.equal(result.decision,'bid');assert.equal(result.relevance,1);assert.equal(result.commercialIntent,2/3);assert.equal(result.conversionProbability,null);
  assert.match(result.agentRunId,/^codex-/);assert.equal(result.engineProvenance.engine,'codex');
  const packet=JSON.parse(f.calls[0].prompt.split('\n').at(-1));
  assert.equal(packet.campaign.campaignVersionId,campaign.campaignVersionId);
  for(const field of ['budgetCapBaseUnits','maxBidBaseUnits','channelId','competitors','apiKey'])assert.equal(packet.campaign[field],undefined);
  for(const sentinel of ['PRIVATE_CHAT','COMPETITOR_BIDS','COMPETITOR_CAMPAIGNS','BUYER_SECRET'])assert.ok(!f.calls[0].prompt.includes(sentinel));
});

test('buyer output rejects unknown authority, levels, IDs and evidence',async t=>{
  const c=campaignFixtures()[0],o={...opportunityFixture(),id:'o'};
  const value={decision:'bid',creativeVersionId:c.creatives[0].creativeVersionId,relevanceLevel:3,commercialIntentLevel:3,evidenceFieldIds:['declaredConstraints'],reasonCodes:['fit']};
  for(const override of [{amount:'999'},{engineProvenance:{}},{opportunityId:'spoof'},{relevanceLevel:4},{commercialIntentLevel:1.5},{reasonCodes:[1]},{creativeVersionId:'competitor'},{evidenceFieldIds:['invented']}])await t.test(JSON.stringify(override),async()=>{
    const f=fixture({value:{...value,...override}});await assert.rejects(codexBuyer(c,o,{spawnImpl:f.spawnImpl}));assert.equal(f.calls.length,1);
  });
});

test('codexBuyer preserves skip and nullable abstain results without fabricating bids',async()=>{
  const c=campaignFixtures()[0],o={...opportunityFixture(),id:'o'};
  for(const value of [
    {decision:'skip',creativeVersionId:c.creatives[0].creativeVersionId,relevanceLevel:1,commercialIntentLevel:3,evidenceFieldIds:['declaredConstraints'],reasonCodes:['soft_fit']},
    {decision:'abstain',creativeVersionId:null,relevanceLevel:null,commercialIntentLevel:null,evidenceFieldIds:[],reasonCodes:['insufficient_evidence']},
  ]) {
    const f=fixture({value});const result=await codexBuyer(c,o,{spawnImpl:f.spawnImpl});
    validateDecision(result,c,o);assert.equal(result.decision,value.decision);
    assert.equal(result.relevance,value.relevanceLevel===null?null:value.relevanceLevel/3);
    assert.equal(result.commercialIntent,value.commercialIntentLevel===null?null:value.commercialIntentLevel/3);
    assert.equal(result.amountBaseUnits,undefined);assert.equal(f.calls.length,1);
  }
});

test('input and guidance bounds reject before spawning; exactly 2000 characters are accepted',async()=>{
  const f=fixture();
  for(const prompt of [undefined,null,{},'', '   ','a'.repeat(2001)])await assert.rejects(organicAnswer(prompt,{spawnImpl:f.spawnImpl}),/invalid_prompt/);
  for(const guidance of ['hotel-only','__proto__','AD_SENTINEL',null,{}])await assert.rejects(organicAnswer('Plan a journey.',{guidance,spawnImpl:f.spawnImpl}),/invalid_guidance/);
  for(const prompt of ['', 'a'.repeat(32769),'旅'.repeat(11000)])await assert.rejects(runCodexJSON(prompt,answerSchema,{spawnImpl:f.spawnImpl}),/invalid_prompt/);
  for(const timeoutMs of [0,-1,NaN,Infinity,1.5,120001])await assert.rejects(runCodexJSON('valid',answerSchema,{timeoutMs,spawnImpl:f.spawnImpl}),/invalid_agent_timeout/);
  const c=campaignFixtures()[0],o={...opportunityFixture(),id:'o'};
  await assert.rejects(codexBuyer({...c,creatives:[{...c.creatives[0],approvedText:'x'.repeat(32768)}]},o,{spawnImpl:f.spawnImpl}),/invalid_prompt/);
  assert.equal(f.calls.length,0);
  await organicAnswer('a'.repeat(2000),{spawnImpl:f.spawnImpl});assert.equal(f.calls.length,1);
  await runCodexJSON('a'.repeat(32768),answerSchema,{spawnImpl:f.spawnImpl});assert.equal(f.calls.length,2);
});

test('timeout, launch and nonzero-exit failures remain bounded without retries',async t=>{
  for(const [name,options,error] of [
    ['timeout',{hang:true},'agent_timeout'],
    ['launch',{launchError:'ENOENT'},'agent_launch_failed:ENOENT'],
    ['unsupported model',{code:1,stderr:'model is not supported'},'agent_model_unsupported'],
    ['capacity',{code:1,stderr:'at capacity'},'agent_capacity_unavailable'],
    ['execution',{code:1,stderr:'other error'},'agent_execution_failed'],
    ['output limit',{raw:'x'.repeat(1024*1024+1)},'agent_output_limit'],
  ])await t.test(name,async()=>{
    const f=fixture(options);const keepAlive=setTimeout(()=>{},1000);
    try{await assert.rejects(organicAnswer('Plan a journey.',{spawnImpl:f.spawnImpl,timeoutMs:name==='timeout'?20:120000}),new RegExp(error));}
    finally{clearTimeout(keepAlive);}
    assert.equal(f.calls.length,1);await assert.rejects(access(f.calls[0].options.cwd),{code:'ENOENT'});
  });
});
