import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['node_modules','vendor'].includes(e.name)?files(join(dir,e.name)):/\.test\.(mjs|js)$/.test(e.name)?[join(dir,e.name)]:[]);
const fresh=join(root,'experiments/sdk-pilot/app');
const groups=[{name:'repository',files:files(join(root,'tests'))},{name:'historical-cleanroom',files:[...files(join(root,'experiments/sdk-cleanroom')).filter(f=>!f.includes('/baseline-app/'))]},...(existsSync(fresh)?[{name:'fresh-integration',files:files(fresh)}]:[])];
const results=[];
for(const group of groups){
 if(!group.files.length)throw new Error(`missing_tests:${group.name}`);
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...group.files.sort()],{cwd:root,env:{...process.env,...(process.argv.includes('--http')?{AXP_SDK_HTTP_TEST:'1',...(group.name==='fresh-integration'?{PILOT_HTTP_TEST:'1'}:{})}:{})},encoding:'utf8',maxBuffer:8*1024**2});
 const count=name=>Number(result.stdout?.match(new RegExp(`^# ${name} (\\d+)$`,'m'))?.[1]??-1);
 const row={name:group.name,exitCode:result.status,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped')};results.push(row);console.log(JSON.stringify(row));
 if(result.status!==0){process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');}
}
const packagePath='artifacts/sdk-pilot/axp-publisher-sdk-0.2.0.tgz',digest=createHash('sha256').update(readFileSync(join(root,packagePath))).digest('hex');
const report={schemaVersion:'sdk-pilot-verification.v1',observedAt:new Date().toISOString(),financialMode:'synthetic',providerExecution:'fixture',paidProviderCalls:0,walletOperations:0,package:{path:packagePath,sha256:digest},groups:results,freshAgentIntegrationPresent:existsSync(fresh),httpEnabled:process.argv.includes('--http'),limitations:['No live-model or native-payment execution in this SDK exercise.','Insertion assertion is not viewability or human attention.','Fresh session is same model family, not unbiased external certification.']};
mkdirSync(join(root,'artifacts/sdk-pilot'),{recursive:true});writeFileSync(join(root,'artifacts/sdk-pilot/verification.json'),JSON.stringify(report,null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
