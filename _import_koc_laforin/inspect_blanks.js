const fs=require('fs');
function parseCsv(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1];if(q){if(ch==='"'&&nx==='"'){cell+='"';i++;}else if(ch==='"'){q=false;}else cell+=ch;}else{if(ch==='"')q=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell='';}else if(ch!=='\r')cell+=ch;}} if(cell.length||row.length){row.push(cell);rows.push(row);} return rows;}
const rows=parseCsv(fs.readFileSync('_import_koc_laforin/danh_sach_koc.csv','utf8')).slice(1);
const blanks=rows.filter(r=>r[0] && !String(r[7]||'').trim()).slice(0,20).map(r=>({name:r[0], link:r[1], status:r[5], owner:r[6]}));
console.log(JSON.stringify(blanks,null,2));
