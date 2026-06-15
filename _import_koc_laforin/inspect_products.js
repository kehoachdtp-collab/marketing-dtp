const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const url=(html.match(/const SUPA_URL\s*=\s*'([^']+)'/)||[])[1];
const key=(html.match(/const SUPA_KEY\s*=\s*'([^']+)'/)||[])[1];
async function rpc(fn, body){ const res=await fetch(`${url}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body||{})}); const text=await res.text(); if(!res.ok) throw new Error(`${fn} ${res.status} ${text}`); return text?JSON.parse(text):null; }
(async()=>{ const rows=await rpc('kv_get_all',{}); const p=rows.find(r=>r.key==='mkt_sale_product_master')?.payload||[]; console.log(JSON.stringify(p,null,2)); })().catch(e=>{console.error(e.message); process.exit(1);});
