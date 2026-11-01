// Only the official MCP SDK speaks to HSP. Profile mappings are reviewed against
// captured schemas, never guessed from an old sandbox SDK or built by a model.
import {loadHspDependency} from './loader.mjs';
import {hash} from '../contracts/index.mjs';
import {ENDPOINT,TOOLS,check,schemaFingerprint} from './config.mjs';
function data(result){check(!result.isError,'hsp_tool_error',502);if(result.structuredContent)return result.structuredContent;const text=result.content?.filter(v=>v.type==='text').map(v=>v.text).join('\n');try{return JSON.parse(text);}catch{check(false,'hsp_response_shape',502);}}
export async function connectHsp({allowlisted=false,profile=null}={}){
 check(allowlisted,'hsp_allowlisting_required',503);
 const {Client,StreamableHTTPClientTransport}=await loadHspDependency('@modelcontextprotocol/client');
 const client=new Client({name:'axp-hsk-hsp',version:'0.1.0'});
 await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT),{reconnectionOptions:{maxRetries:0}}));
 const tools=[];let cursor;do{const page=await client.listTools(cursor?{cursor}:{});tools.push(...page.tools);cursor=page.nextCursor;}while(cursor);
 const fingerprint=schemaFingerprint(tools);
 const {AjvJsonSchemaValidator}=await loadHspDependency('@modelcontextprotocol/client/validators/ajv');const validator=new AjvJsonSchemaValidator();
 const call=async(name,input)=>{check(TOOLS.includes(name),'hsp_tool_invalid');const tool=tools.find(t=>t.name===name);check(validator.getValidator(tool.inputSchema)(input).valid,'hsp_input_schema_mismatch');const result=data(await client.callTool({name,arguments:input},undefined,{timeout:45000}));if(tool.outputSchema)check(validator.getValidator(tool.outputSchema)(result).valid,'hsp_output_schema_mismatch');return result;};
 if(!profile)return {tools,fingerprint,call,close:()=>client.close()};
 check(profile.reviewed===true&&profile.fingerprint===fingerprint&&profile.config,'hsp_schema_review_required',503);
 check(profile.chainConfigHash===hash(await call('get_chain_config',{})),'hsp_chain_configuration_changed',503);
 // Templates contain the exact reviewed create_order cart input. $path denotes
 // a value from saved AXP terms/HSP output; interpolation does not construct JWTs.
 const at=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
 const template=(value,vars)=>{if(typeof value==='string'&&value.startsWith('$')){const found=at(vars,value.slice(1));check(found!==undefined,'hsp_profile_mapping_missing');return found;}if(Array.isArray(value))return value.map(v=>template(v,vars));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,template(v,vars)]));return value;};
 const invoke=async(name,vars)=>{const mapping=profile.operations?.[name];check(mapping?.input&&mapping?.output,'hsp_schema_review_required',503);const raw=await call(name,template(mapping.input,vars));return Object.fromEntries(Object.entries(mapping.output).map(([key,path])=>{const optional=path.startsWith('?');const value=at(raw,optional?path.slice(1):path);check(value!==undefined||optional,'hsp_response_shape',502);return [key,value];}).filter(([,value])=>value!==undefined));};
 return {execution:'actual-hsp-qa',config:profile.config,invoke,close:()=>client.close()};
}
