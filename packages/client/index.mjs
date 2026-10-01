import {operations} from './schema.mjs';

export class ClientError extends Error {
  constructor(code,status=0){super(code);this.name='ClientError';this.code=code;this.status=status;}
}

/** Thin local browser transport. No payment SDK, wallet, voucher or retry logic. */
export function createClient({baseURL,surface='replay',fetch:fetchImpl=globalThis.fetch,EventSource:EventSourceImpl=globalThis.EventSource}={}) {
  if(!['runtime','replay'].includes(surface))throw new ClientError('invalid_client_surface');
  const base=new URL(baseURL);
  if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new ClientError('local_origin_required');
  if(typeof fetchImpl!=='function')throw new ClientError('fetch_unavailable');
  let csrf=null;
  async function request(op,{id,body,lastEventId}={}) {
    // Check before bootstrap or any other fetch; even nonfinancial POST is refused.
    if(surface==='replay'&&op.method!=='GET')throw new ClientError('replay_read_only');
    if(op.surface!==surface)throw new ClientError('client_surface_mismatch');
    if(op.method==='POST'&&!csrf)throw new ClientError('bootstrap_required');
    const path=op.path.replace('{id}',encodeURIComponent(id??''));
    const headers={Accept:op.format==='sse'?'text/event-stream':'application/json'};
    if(lastEventId!==undefined)headers['Last-Event-ID']=String(lastEventId);
    if(op.method==='POST')Object.assign(headers,{'Content-Type':'application/json','x-axp-csrf':csrf});
    const response=await fetchImpl(new URL(path,base).href,{method:op.method,headers,credentials:'same-origin',cache:'no-store',redirect:'error',...(op.method==='POST'?{body:JSON.stringify(body??{})}:{})});
    if(!response.ok){let error;try{error=(await response.json()).error;}catch{}throw new ClientError(typeof error==='string'?error:'http_error',response.status);}
    if(op.format==='sse')return response;
    const value=await response.json();
    if(op.name==='bootstrap'){
      if(typeof value.csrf!=='string'||!value.csrf)throw new ClientError('invalid_bootstrap');
      csrf=value.csrf;
    }
    return value;
  }
  const client={surface};
  for(const op of operations.filter(o=>o.name&&o.format==='json'))client[op.name]=(...args)=>{
    const id=op.path.includes('{id}')?args.shift():undefined;
    return request(op,{id,body:args[0]});
  };
  client.replayEvents=async(lastEventId)=>{
    const response=await request(operations.find(o=>o.name==='replayEvents'),{lastEventId});
    // Finite main-owned replay: EOF completes. No timers or auto-retry.
    const frames=(await response.text()).replace(/\r\n/g,'\n').split('\n\n');
    return frames.filter(frame=>frame.split('\n').some(line=>line.startsWith('data:'))).map(frame=>{
      let id='',event='message';const data=[];
      for(const line of frame.split('\n')){
        if(line.startsWith('id:'))id=line.slice(3).replace(/^ /,'');
        if(line.startsWith('event:'))event=line.slice(6).replace(/^ /,'');
        if(line.startsWith('data:'))data.push(line.slice(5).replace(/^ /,''));
      }
      return {id,event,data:JSON.parse(data.join('\n'))};
    });
  };
  client.openEvents=({onEvent,onReset,onError})=>{
    if(typeof EventSourceImpl!=='function')throw new ClientError('eventsource_unavailable');
    const source=new EventSourceImpl(new URL(surface==='replay'?'/v1/replay/events':'/v1/events',base).href);
    source.onmessage=message=>{try{onEvent(JSON.parse(message.data),message);}catch(e){source.close();throw e;}};
    source.addEventListener('reset',()=>onReset?.());
    source.onerror=event=>{
      // Native EventSource otherwise reconnects forever at a finite replay EOF.
      // Explicit resume uses replayEvents(lastEventId), which can set the header.
      if(surface==='replay')source.close();
      onError?.(event);
    };
    return source;
  };
  return Object.freeze(client);
}
