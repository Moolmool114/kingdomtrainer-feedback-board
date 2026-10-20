import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {collect} from './public-data.mjs';
export {safeItem,collect,collectClaims,STATUSES,IN_PROGRESS} from './public-data.mjs';
export async function build(){
 // Read every page and validate it before writing any publication artifact.
 const data=await collect();
 const html=await readFile('web/index.html','utf8');
 if(!html.includes("api('./issues.json'+")||html.includes('TALLY_SIGNING_SECRET')||html.includes('/api/admin'))throw Error('public_html_contract');
 await mkdir('site',{recursive:true});await copyFile('web/index.html','site/index.html');await copyFile('web/.nojekyll','site/.nojekyll');
 await writeFile('site/issues.json',JSON.stringify(data));await writeFile('site/robots.txt','User-agent: *\nAllow: /\n');
 console.log(JSON.stringify({publicItems:data.items.length,privateFieldsExported:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await build();
