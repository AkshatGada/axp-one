import {schemas} from './schema.mjs';

// Dependency-free validation of the bounded schema vocabulary used here.
// Not advertised as a general JSON Schema/OpenAPI validator.
export function validate(name,value){return check(schemas[name],value,'$');}
function check(schema,value,path) {
  if(!schema)throw new Error(`unknown_schema:${path}`);
  if(schema.$ref)return check(schemas[schema.$ref.split('/').at(-1)],value,path);
  if(schema.anyOf){for(const candidate of schema.anyOf){try{check(candidate,value,path);return value;}catch{}}throw new Error(`anyOf:${path}`);}
  if(Object.hasOwn(schema,'const')&&value!==schema.const)throw new Error(`const:${path}`);
  if(schema.enum&&!schema.enum.includes(value))throw new Error(`enum:${path}`);
  if(schema.type){
    const ok=schema.type==='null'?value===null:schema.type==='array'?Array.isArray(value):schema.type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):schema.type==='integer'?Number.isSafeInteger(value):schema.type==='number'?typeof value==='number'&&Number.isFinite(value):typeof value===schema.type;
    if(!ok)throw new Error(`type:${path}`);
  }
  if(schema.pattern&&!new RegExp(schema.pattern).test(value))throw new Error(`pattern:${path}`);
  if(schema===schemas.AmountBaseUnits&&BigInt(value)>18446744073709551615n)throw new Error(`u64:${path}`);
  if(schema.type==='array')value.forEach((item,i)=>check(schema.items,item,`${path}[${i}]`));
  if(schema.type==='object'){
    for(const key of schema.required??[])if(!Object.hasOwn(value,key))throw new Error(`required:${path}.${key}`);
    for(const [key,item] of Object.entries(value)){
      const property=schema.properties?.[key];
      if(property)check(property,item,`${path}.${key}`);
      else if(schema.additionalProperties===false)throw new Error(`additionalProperties:${path}.${key}`);
      else if(typeof schema.additionalProperties==='object')check(schema.additionalProperties,item,`${path}.${key}`);
    }
  }
  return value;
}
