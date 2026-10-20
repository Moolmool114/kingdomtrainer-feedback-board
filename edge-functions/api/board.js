import {collect} from '../../scripts/public-data.mjs';

// Read only the already-approved public APIs. Caller headers, URLs and cookies
// are never forwarded. No Tally credentials, reports or attachments are used.
export function createBoardHandler(fetcher=fetch, now=Date.now) {
 let cached=null,expires=0,pending=null;
 const reply=(body,status=200)=>new Response(body,{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
 }});
 async function snapshot(){
  if(cached&&now()<expires)return cached;
  if(pending)return pending;
  pending=(async()=>{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),6000);
   try{
    const data=await collect((url,options)=>fetcher(url,{
     ...options,redirect:'error',cache:'no-store',credentials:'omit',
     signal:controller.signal,
    }));
    const body=JSON.stringify({...data,syncMode:'live'});
    if(new TextEncoder().encode(body).byteLength>2*1024*1024)throw Error('snapshot_too_large');
    cached=body;expires=now()+10000;return body;
   }finally{clearTimeout(timeout);}
  })();
  try{return await pending;}finally{pending=null;}
 }
 return async ({request})=>{
  if(!['GET','HEAD'].includes(request.method))return reply('{"error":"method_not_allowed"}',405);
  if(request.method==='HEAD')return reply(null);
  try{return reply(await snapshot());}
  catch{return reply('{"error":"public_source_unavailable"}',503);}
 };
}
export default createBoardHandler();
