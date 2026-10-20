import {mkdir,readFile,writeFile} from 'node:fs/promises';
const html=await readFile('web/index.html','utf8');
if(!html.includes("api('./issues.json'+")||html.includes('/api/admin')||html.includes('tally.so/'))throw Error('unsafe_public_frontend');
// Direct uploads do not run npm. The function is made self-contained here.
const data=(await readFile('scripts/public-data.mjs','utf8')).replace(/^export /gm,'');
const fn=(await readFile('edge-functions/api/board.js','utf8')).replace("import {collect} from '../../scripts/public-data.mjs';",data);
if(/^import\s/m.test(fn)||/node:|TALLY_SIGNING_SECRET|ADMIN_EMAIL/.test(fn))throw Error('unsafe_edge_bundle');
await mkdir('edge-site/edge-functions/api',{recursive:true});
await writeFile('edge-site/index.html',html.replaceAll("api('./issues.json'+","api('./api/board'+").replace('备份公示 · 定时同步','作者确认后公开 · 自动同步'));
await writeFile('edge-site/edge-functions/api/board.js',fn);
await writeFile('edge-site/edgeone.json',JSON.stringify({headers:[{source:'/*',headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'no-referrer'}]}]}));
await writeFile('edge-site/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\n');
console.log('Prepared direct-upload package: public frontend and read-only live function.');
