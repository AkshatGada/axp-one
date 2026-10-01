import {readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
// Only this repository's tests. Ignored SDK package stores contain vendor tests.
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):e.name.endsWith('.test.mjs')?[join(dir,e.name)]:[]);}
const phase5=process.argv.includes('--phase5-report');
const report=phase5||process.argv.includes('--phase4-report');
const result=spawnSync(process.execPath,['--test',...(report?['--test-reporter=tap']:[]),...files(resolve('tests')).sort()],{stdio:report?'pipe':'inherit',encoding:'utf8',maxBuffer:8*1024**2});
if(report){const phase=phase5?'phase5':'phase4';const count=name=>Number(result.stdout?.match(new RegExp(`^# ${name} (\\d+)$`,'m'))?.[1]??-1);const summary={schemaVersion:`axp.${phase}-test-report.v1`,observedAt:new Date().toISOString(),scope:'repository tests/ only; ignored vendor tests excluded',command:`npm test -- --${phase}-report`,exitCode:result.status,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped')};writeFileSync(resolve(`artifacts/${phase}/test-report.json`),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(result.status!==0){process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');}}
process.exitCode=result.status??1;
