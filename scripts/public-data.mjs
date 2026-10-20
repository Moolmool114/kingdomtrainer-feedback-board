const ORIGIN='https://kingdomtrainer-feedback.classybud9.chatgpt.site';
export const STATUSES=['待核查','需补充信息','排查中','已确认','修复中','待验证','已修复','待评估','已采纳','计划中','制作中','测试中','已完成','暂缓处理','无法复现','重复反馈','暂不采纳'];
export const IN_PROGRESS=['排查中','已确认','修复中','待验证','已采纳','计划中','制作中','测试中'];
const keys=['id','number','title','summary','kind','status','reply','createdAt','updatedAt','reportCount'];
export function safeItem(v){
 const out={};for(const key of keys)out[key]=v?.[key];
 if(!Number.isSafeInteger(out.id)||out.id<1||out.number!=='KT-'+String(out.id).padStart(3,'0')||!Number.isSafeInteger(out.reportCount)||out.reportCount<0)throw Error('invalid_public_record');
 for(const [key,max,min] of [['title',100,1],['summary',1800,1],['reply',3000,0]])if(typeof out[key]!=='string'||out[key].length>max||out[key].length<min)throw Error('invalid_public_text');
 if(!['问题','建议','体验'].includes(out.kind)||!STATUSES.includes(out.status)||!Number.isFinite(Date.parse(out.createdAt))||!Number.isFinite(Date.parse(out.updatedAt)))throw Error('invalid_public_state');
 return out;
}
export async function collect(fetcher=fetch){
 const items=[],seen=new Set();let cursor=null,total=null,last;
 for(let page=0;page<200;page++){
  const url=ORIGIN+'/api/issues'+(cursor?'?before='+cursor:'');
  const response=await fetcher(url,{headers:{'User-Agent':'KingdomTrainer-Public-Feedback-Sync/1.0',Accept:'application/json'},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('public_source_http_'+response.status);
  const raw=await response.text();if(raw.length>1024*1024)throw Error('public_source_too_large');
  const data=JSON.parse(raw);if(!Array.isArray(data.items)||data.items.length>50)throw Error('invalid_public_page');
  if(!Number.isSafeInteger(data.stats?.total)||data.stats.total<0)throw Error('invalid_total');
  if(total===null)total=data.stats.total;else if(total!==data.stats.total)throw Error('source_changed_during_sync');
  for(const v of data.items){const i=safeItem(v);if(seen.has(i.id))throw Error('repeated_id');seen.add(i.id);items.push(i);}
  last=data.updatedAt;
  if(data.nextCursor===null){
   if(items.length!==total)throw Error('incomplete_source');
   const stats={total:items.length,progress:items.filter(i=>IN_PROGRESS.includes(i.status)).length,done:items.filter(i=>['已修复','已完成'].includes(i.status)).length};
   const claimReceipts=await collectClaims(fetcher,new Set(items.map(i=>i.id)));
   return {items,claimReceipts,nextCursor:null,stats,updatedAt:items.length?items.map(i=>i.updatedAt).sort().at(-1):last,syncedAt:new Date().toISOString()};
  }
  if(!Number.isSafeInteger(data.nextCursor)||data.nextCursor<1||(cursor!==null&&data.nextCursor>=cursor))throw Error('invalid_cursor');cursor=data.nextCursor;
 }
 throw Error('source_page_limit');
}
export async function collectClaims(fetcher,publicIds){
 const items=[],seen=new Set();let cursor='';
 for(let page=0;page<200;page++){
  const r=await fetcher(ORIGIN+'/api/claim-receipts'+(cursor?'?after='+cursor:''),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('claim_source_http_'+r.status);
  const text=await r.text();if(text.length>1024*1024)throw Error('claim_source_too_large');const data=JSON.parse(text);
  if(!Array.isArray(data.items)||data.items.length>500)throw Error('invalid_claim_page');
  for(const row of data.items){
   if(!row||!/^[a-f0-9]{64}$/.test(row.verifier)||seen.has(row.verifier)||!Array.isArray(row.issues)||!row.issues.length||row.issues.some(id=>!Number.isSafeInteger(id)||!publicIds.has(id)))throw Error('invalid_claim_receipt');
   seen.add(row.verifier);items.push({verifier:row.verifier,issues:[...new Set(row.issues)].sort((a,b)=>a-b)});
  }
  if(data.nextCursor===null)return items;
  if(!/^[a-f0-9]{64}$/.test(data.nextCursor)||data.nextCursor<=cursor)throw Error('invalid_claim_cursor');cursor=data.nextCursor;
 }
 throw Error('claim_page_limit');
}
