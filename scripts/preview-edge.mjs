import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import handler from '../edge-site/edge-functions/api/board.js';
createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1:48732').pathname;
  if(path==='/api/board'){
   const r=await handler({request:new Request('http://127.0.0.1:48732'+req.url,{method:req.method})});
   res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
  }else if(path==='/'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile('edge-site/index.html'));
  }else{res.writeHead(404);res.end();}
 }catch{res.writeHead(503);res.end('Preview unavailable');}
}).listen(48732,'127.0.0.1',()=>console.log('Read-only live preview: http://127.0.0.1:48732'));
