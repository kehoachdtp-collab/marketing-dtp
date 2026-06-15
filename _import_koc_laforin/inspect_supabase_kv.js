const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const url=(html.match(/const SUPA_URL\s*=\s*'([^']+)'/)||[])[1];
const key=(html.match(/const SUPA_KEY\s*=\s*'([^']+)'/)||[])[1];
if(!url||!key) throw new Error('Supabase config not found in public index.html');
async function rpc(fn, body){ const res=await fetch(`${url}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body||{})}); const text=await res.text(); if(!res.ok) throw new Error(`${fn} ${res.status} ${text}`); return text?JSON.parse(text):null; }
(async()=>{ const rows=await rpc('kv_get_all',{}); for(const r of rows){ let len=Array.isArray(r.payload)?r.payload.length:(r.payload&&typeof r.payload==='object'?Object.keys(r.payload).length:0); if(String(r.key).includes('koc')||String(r.key).includes('sale')) console.log(`${r.key}\t${len}\t${r.updated_at}`); } })().catch(e=>{console.error(e.message); process.exit(1);});
