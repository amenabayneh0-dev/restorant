const c=require('crypto');const secret=require('fs').readFileSync('/tmp/prest/secret.txt','utf8').trim();
const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
module.exports=(claims)=>{const h=b({alg:'HS256',typ:'JWT'}),p=b({exp:Math.floor(Date.now()/1000)+86400,...claims});
 return `${h}.${p}.${c.createHmac('sha256',secret).update(h+'.'+p).digest('base64url')}`;};
if(require.main===module)console.log(module.exports(JSON.parse(process.argv[2])));
