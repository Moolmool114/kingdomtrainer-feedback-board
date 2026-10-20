import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
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
   return {items,nextCursor:null,stats,updatedAt:items.length?items.map(i=>i.updatedAt).sort().at(-1):last,syncedAt:new Date().toISOString()};
  }
  if(!Number.isSafeInteger(data.nextCursor)||data.nextCursor<1||(cursor!==null&&data.nextCursor>=cursor))throw Error('invalid_cursor');cursor=data.nextCursor;
 }
 throw Error('source_page_limit');
}
export async function build(){
 // Read every page and validate it before writing any publication artifact.
 const data=await collect();
 const html=await readFile('web/index.html','utf8');
 if(!html.includes("api('./issues.json'+")||html.includes('TALLY_SIGNING_SECRET')||html.includes('/api/admin'))throw Error('public_html_contract');
 await mkdir('site',{recursive:true});await copyFile('web/index.html','site/index.html');await copyFile('web/.nojekyll','site/.nojekyll');
 await writeFile('site/issues.json',JSON.stringify(data));await writeFile('site/robots.txt','User-agent: *\nAllow: /\n');
 console.log(JSON.stringify({publicItems:data.items.length,privateFieldsExported:false,origin:ORIGIN}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await build();
