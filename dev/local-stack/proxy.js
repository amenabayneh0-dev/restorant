// Local stand-in for a Supabase project: REST -> PostgREST, plus fake GoTrue (auth) and fake Storage.
const http=require('http'),fs=require('fs'),mk=require('./mkjwt.js'),{Client}=require('/home/claude/restorant/node_modules/pg');
const USERS={'admin@x.test':{id:'00000000-0000-0000-0000-0000000000a1',pw:'adminpw'},'counter@x.test':{id:'00000000-0000-0000-0000-0000000000c1',pw:'counterpw'},
 'kitchen@x.test':{id:'00000000-0000-0000-0000-0000000000b1',pw:'kitchenpw'},'nobody@x.test':{id:'00000000-0000-0000-0000-0000000000d1',pw:'nobodypw'}};
const created={}; const buckets=new Set(); fs.mkdirSync('/tmp/prest/storage',{recursive:true});
const userObj=(email,id)=>({id,aud:'authenticated',role:'authenticated',email,app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'});
const raw=r=>new Promise(res=>{const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res(Buffer.concat(c)))});
const dbq=async(sql,p)=>{const c=new Client({host:'/tmp/pg',port:5433,user:'postgres',database:process.env.DB||'app'});await c.connect();try{return await c.query(sql,p)}finally{await c.end()}};
http.createServer(async(req,res)=>{
 const send=(c,o,h={})=>{res.writeHead(c,{'content-type':'application/json',...h});res.end(JSON.stringify(o))};
 const u=req.url;
 if(u.startsWith('/auth/v1/token')){const j=JSON.parse((await raw(req)).toString()||'{}');const x=USERS[j.email]||created[j.email];
   if(!x||x.pw!==j.password)return send(400,{error:'invalid_grant',error_description:'Invalid login credentials'});
   return send(200,{access_token:mk({sub:x.id,role:'authenticated',email:j.email,aud:'authenticated'}),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'rt',user:userObj(j.email,x.id)});}
 if(u.startsWith('/auth/v1/admin/users')){
   if(req.method==='GET'){const rows=Object.entries(created).map(([email,x])=>userObj(email,x.id));return send(200,{users:rows,aud:'authenticated'});}
   const j=JSON.parse((await raw(req)).toString()||'{}');const id=require('crypto').randomUUID();created[j.email]={id,pw:j.password};
   await dbq('insert into auth.users(id,email) values($1,$2) on conflict do nothing',[id,j.email]);return send(200,userObj(j.email,id));}
 if(u.startsWith('/auth/v1/user')){try{const t=(req.headers.authorization||'').replace('Bearer ','');const p=JSON.parse(Buffer.from(t.split('.')[1],'base64url'));
   if(p.exp<Date.now()/1000)throw 0;return send(200,userObj(p.email,p.sub));}catch{return send(401,{msg:'bad jwt'})}}
 if(u.startsWith('/auth/v1/logout')){res.writeHead(204);return res.end()}
 if(u.startsWith('/storage/v1/bucket')){const j=JSON.parse((await raw(req)).toString()||'{}');if(buckets.has(j.name))return send(409,{statusCode:'409',error:'Duplicate',message:'The resource already exists'});buckets.add(j.name);return send(200,{name:j.name});}
 let m=u.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
 if(m&&req.method==='GET'){const f='/tmp/prest/storage/'+m[2].replace(/\//g,'__');if(!fs.existsSync(f)){res.writeHead(404);return res.end('nf')}res.writeHead(200,{'content-type':fs.readFileSync(f+'.type','utf8')});return res.end(fs.readFileSync(f));}
 m=u.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
 if(m&&(req.method==='POST'||req.method==='PUT')){const b=await raw(req);const f='/tmp/prest/storage/'+m[2].replace(/\//g,'__');
   const ct=(req.headers['content-type']||'');let data=b,type=ct;const bm=ct.match(/boundary=(.+)$/);
   if(bm){const parts=b.toString('binary').split('--'+bm[1]);const part=parts.find(p=>/filename=|name="file"|name=""/i.test(p))||parts[1];const i=part.indexOf('\r\n\r\n');
     type=(part.match(/Content-Type: ([^\r\n]+)/i)||[])[1]||'application/octet-stream';data=Buffer.from(part.slice(i+4).replace(/\r\n$/,''),'binary');}
   fs.writeFileSync(f,data);fs.writeFileSync(f+'.type',type);return send(200,{Key:m[1]+'/'+m[2],Id:'x'});}
 const path=u.replace(/^\/rest\/v1/,'')||'/';
 const r=http.request({host:'127.0.0.1',port:3001,path,method:req.method,headers:req.headers},p=>{res.writeHead(p.statusCode,p.headers);p.pipe(res)});
 r.on('error',e=>{res.writeHead(502);res.end(String(e))});req.pipe(r)}).listen(54321);
