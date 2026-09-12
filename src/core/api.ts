import type { Catalog, ModelResult } from './types';
export async function catalog():Promise<Catalog> {
  const response=await fetch('/api/catalog'); if(!response.ok) throw new Error('世界数据暂时不可用'); return response.json();
}
export async function invoke(id:string,input:Record<string,unknown>,signal:AbortSignal,onToken?:(text:string)=>void):Promise<ModelResult> {
  const response=await fetch(`/api/modules/${encodeURIComponent(id)}/invoke`,{method:'POST',headers:{'Content-Type':'application/json',...(onToken?{Accept:'application/x-ndjson'}:{})},body:JSON.stringify(input),signal});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/x-ndjson')){const data=await response.json();if(!response.ok)throw new Error(data.error??'模型调用失败');return data;}
  const reader=response.body!.getReader(),decoder=new TextDecoder();let buffer='',result:ModelResult|undefined;
  const line=(s:string)=>{if(!s.trim())return;const event=JSON.parse(s);if(event.type==='error')throw new Error(event.error);if(event.type==='token')onToken?.(event.text);if(event.type==='done')result=event.result;};
  try{while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});let i;while((i=buffer.indexOf('\n'))>=0){line(buffer.slice(0,i));buffer=buffer.slice(i+1);}if(done)break;}line(buffer);if(!result)throw new Error('生成连接已中断，请重试');return result;}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
