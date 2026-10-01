import {writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildOpenAPI,schemas,operations} from './schema.mjs';

function type(s) {
  if(s.$ref)return s.$ref.split('/').at(-1);
  if(Object.hasOwn(s,'const'))return JSON.stringify(s.const);
  if(s.enum)return s.enum.map(JSON.stringify).join(' | ');
  if(s.anyOf)return s.anyOf.map(type).join(' | ');
  if(s.type==='null')return 'null';
  if(s.type==='number'||s.type==='integer')return 'number';
  if(s.type==='boolean')return 'boolean';
  if(s.type==='string')return 'string';
  if(s.type==='array')return `Array<${type(s.items)}>`;
  if(s.type==='object'){
    const fields=Object.entries(s.properties??{}).map(([k,v])=>`${JSON.stringify(k)}${s.required?.includes(k)?'':'?'}: ${type(v)};`);
    if(s.additionalProperties)fields.push(`[key: string]: ${s.additionalProperties===true?'JsonValue':type(s.additionalProperties)};`);
    return `{ ${fields.join(' ')} }`;
  }
  throw new Error('unsupported_schema');
}
export function generatedFiles() {
  const dto=Object.entries(schemas).map(([name,s])=>`export type ${name} = ${type(s)};`).join('\n');
  const methods=operations.filter(o=>o.name&&o.format!=='sse').map(o=>{
    const args=[...(o.path.includes('{id}')?['id: string']:[]),...(o.request&&o.request!=='EmptyRequest'?[`body: ${o.request}`]:[])];
    return `  ${o.name}(${args.join(', ')}): Promise<${o.response}>;`;
  }).join('\n');
  const declarations=`// Generated from schema.mjs by generate.mjs; do not edit.\n${dto}\n\nexport type ClientSurface = 'runtime' | 'replay';\nexport interface ClientOptions { baseURL: string; surface?: ClientSurface; fetch?: typeof globalThis.fetch; EventSource?: typeof globalThis.EventSource; }\nexport interface EventHandlers { onEvent(event: JsonObject, message: MessageEvent): void; onReset?(): void; onError?(event: Event): void; }\nexport interface AxpClient {\n  readonly surface: ClientSurface;\n${methods}\n  replayEvents(lastEventId?: string): Promise<Array<{id: string; event: string; data: JsonObject}>>;\n  openEvents(handlers: EventHandlers): EventSource;\n}\nexport declare class ClientError extends Error { code: string; status: number; constructor(code: string, status?: number); }\nexport declare function createClient(options: ClientOptions): AxpClient;\n`;
  return {'openapi.json':`${JSON.stringify(buildOpenAPI(),null,2)}\n`,'index.d.mts':declarations};
}
export function generate({check=false}={}) {
  for(const [name,content] of Object.entries(generatedFiles())){
    const url=new URL(name,import.meta.url);
    if(check){if(readFileSync(url,'utf8')!==content)throw new Error(`generated_contract_drift:${name}`);}
    else writeFileSync(url,content);
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){generate({check:process.argv.includes('--check')});console.log('Frontend OpenAPI/DTO parity OK');}
