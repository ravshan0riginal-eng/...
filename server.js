const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000;
const DATA_FILE=path.join(__dirname,'data','db.json');
const seed={users:{},queues:{},orgs:{},employees:{'demo@navbat.uz':{password:'123456',orgId:1,name:'NAVBAT Demo'}}};
const orgs=[
[1,'Asaka Bank','Banklar'],[2,'Kapital Bank','Banklar'],[3,'Hamkorbank','Banklar'],[4,'Ipoteka Bank','Banklar'],[5,'TBC Bank','Banklar'],
[6,'City Medical','Tibbiyot'],[7,'MedLine Clinic','Tibbiyot'],[8,'Shifo Hospital','Tibbiyot'],[9,'LabTest','Tibbiyot'],[10,'Family Clinic','Tibbiyot'],
[11,'Davlat xizmatlari markazi','Davlat'],[12,'YHXB xizmatlari','Davlat'],[13,'Soliq xizmatlari','Davlat'],[14,'Kadastr markazi','Davlat'],[15,'DXM Yunusobod','Davlat'],
[16,'Avto City Service','Avtoservis'],[17,'Best Auto','Avtoservis'],[18,'Auto Master','Avtoservis'],[19,'Speed Service','Avtoservis'],[20,'CarFix','Avtoservis'],
[21,"L'etole Beauty",'Salon'],[22,'The Barbershop','Salon'],[23,'Beauty Zone','Salon'],[24,'Shahra Studio','Salon'],[25,'Luxe Salon','Salon'],
[26,'Toshkent Davlat iqtisodiyot universiteti','Universitet'],[27,'Toshkent Axborot Texnologiyalari Universiteti','Universitet'],[28,"O‘zbekiston Milliy Universiteti",'Universitet'],[29,'Toshkent Kimyo Texnologiya Instituti','Universitet'],[30,'Tibbiyot Akademiyasi','Universitet']
].reduce((a,[id,name,cat])=>(a[id]={id,name,cat,serving:0,next:1},a),{});
if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE,JSON.stringify({...seed,orgs},null,2));
function db(){return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))} function save(d){fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2))}
function json(res,obj,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}})})}
function id(){return crypto.randomBytes(10).toString('hex')}
async function api(req,res,url){
 const d=db(), parts=url.pathname.split('/').filter(Boolean);
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'});return res.end()}
 if(req.method==='POST'&&url.pathname==='/api/user/login'){let b=await body(req);if(!b.phone)return json(res,{error:'Telefon raqami kerak'},400);let uid=d.users[b.phone]?.id||id();d.users[b.phone]={id:uid,phone:b.phone,name:b.name||'Foydalanuvchi'};save(d);return json(res,{user:d.users[b.phone]})}
 if(req.method==='GET'&&url.pathname==='/api/orgs')return json(res,{orgs:Object.values(d.orgs)});
 if(req.method==='GET'&&parts[0]==='api'&&parts[1]==='queue'&&parts[2]==='org'){
   const oid=Number(parts[3]);return json(res,{queues:Object.values(d.queues).filter(q=>q.orgId===oid&&q.status==='waiting').sort((a,b)=>a.number-b.number),org:d.orgs[oid]});
 }
 if(req.method==='POST'&&url.pathname==='/api/queue/take'){let b=await body(req);if(!b.userId||!b.orgId)return json(res,{error:'userId va orgId kerak'},400);if(Object.values(d.queues).some(q=>q.userId===b.userId&&q.status==='waiting'))return json(res,{error:'Sizda faol navbat bor'},409);let o=d.orgs[b.orgId];if(!o)return json(res,{error:'Tashkilot topilmadi'},404);let existing=Object.values(d.queues).filter(q=>q.orgId===o.id&&q.status==='waiting');let n=Math.min(100,Math.max(1,existing.length+1));if(existing.length>=100)return json(res,{error:'Bugungi navbat to‘ldi'},409);let q={id:id(),userId:b.userId,orgId:o.id,org:o.name,service:b.service||'Umumiy xizmat',number:n,remaining:existing.length,status:'waiting',created:new Date().toISOString()};d.queues[q.id]=q;save(d);return json(res,{queue:q})}
 if(req.method==='GET'&&parts[0]==='api'&&parts[1]==='queue'&&parts[2]==='user'){let qs=Object.values(d.queues).filter(q=>q.userId===parts[3]);return json(res,{queues:qs})}
 if(req.method==='POST'&&url.pathname==='/api/queue/cancel'){let b=await body(req),q=d.queues[b.queueId];if(!q)return json(res,{error:'Navbat topilmadi'},404);q.status='cancelled';q.cancelledAt=new Date().toISOString();save(d);return json(res,{queue:q})}
 if(req.method==='POST'&&url.pathname==='/api/org/login'){let b=await body(req),e=d.employees[b.email];if(!e||e.password!==b.password)return json(res,{error:'Login yoki parol xato'},401);return json(res,{employee:{email:b.email,orgId:e.orgId,name:e.name}})}
 if(req.method==='POST'&&url.pathname==='/api/org/next'){let b=await body(req);let waiting=Object.values(d.queues).filter(q=>q.orgId===Number(b.orgId)&&q.status==='waiting').sort((a,b)=>a.number-b.number);if(!waiting.length)return json(res,{error:'Kutayotgan navbat yo‘q'},404);let q=waiting[0];q.status='called';q.calledAt=new Date().toISOString();for(const x of waiting.slice(1))x.remaining=Math.max(0,x.remaining-1);save(d);return json(res,{queue:q})}
 if(req.method==='POST'&&url.pathname==='/api/org/complete'){let b=await body(req),q=d.queues[b.queueId];if(!q)return json(res,{error:'Navbat topilmadi'},404);q.status='completed';q.completedAt=new Date().toISOString();save(d);return json(res,{queue:q})}
 if(req.method==='GET'&&url.pathname==='/api/health')return json(res,{ok:true,service:'NAVBAT',time:new Date().toISOString()});
 return json(res,{error:'Not found'},404)
}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/'))return await api(req,res,u);let p=u.pathname==='/'?'/index.html':u.pathname;if(p==='/business')p='/business.html';let file=path.join(__dirname,'public',p);if(!file.startsWith(path.join(__dirname,'public')))return json(res,{error:'Forbidden'},403);fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found')}let ext=path.extname(file);let ct={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg'}[ext]||'text/plain';res.writeHead(200,{'Content-Type':ct});res.end(b)})}catch(e){json(res,{error:e.message},500)}});
server.listen(PORT,()=>console.log(`NAVBAT running on http://localhost:${PORT}`));
