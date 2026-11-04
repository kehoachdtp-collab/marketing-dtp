
/* UI-only: no TikTok API calls, no tokens and no automatic Google Sheets writes. */
(function(){
'use strict';
const STORE_KEY='mkt_sale_tiktok_sheet_config';
const DATA_KEY='mkt_sale_koc_tiktok_snapshots';
const HEADERS=[
'ID bài đăng','Mẫu quảng cáo','Tài khoản TikTok','Loại nội dung sáng tạo',
'Nguồn nội dung sáng tạo','Trạng thái','Trạng thái thứ cấp khám phá','Thời gian đăng',
'Chi phí','Số lượng đơn hàng SKU','Chi phí cho mỗi đơn hàng','Doanh thu gộp',
'Số lượt hiển thị quảng cáo sản phẩm','Số lượt nhấp vào quảng cáo sản phẩm',
'Tỷ lệ nhấp vào quảng cáo sản phẩm','Tỷ lệ chuyển đổi quảng cáo',
'Tỷ lệ xem video quảng cáo trong 2 giây','Tỷ lệ xem video quảng cáo trong 6 giây',
'Tỷ lệ xem 25% thời lượng video quảng cáo','Tỷ lệ xem 50% thời lượng video quảng cáo',
'Tỷ lệ xem 75% thời lượng video quảng cáo','Tỷ lệ xem 100% thời lượng video quảng cáo',
'Đơn vị tiền tệ'
];
const KNOWN=new Set([0,1,2,7,8,9,11,12]);
const state={tab:'overview',query:'',limit:15};
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0).toLocaleString('vi-VN');
const money=x=>num(x)+' đ';
const fmt=(x)=>esc(String(x||''));
const admin=()=>typeof isDemoAdmin==='function'&&isDemoAdmin();
function config(){const c=getStore(STORE_KEY,{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{}}
function snapshots(){const x=getStore(DATA_KEY,[]);return Array.isArray(x)?x.filter(s=>s&&Array.isArray(s.rows)):[]}
function latest(){return snapshots().sort((a,b)=>String(b.end||'').localeCompare(String(a.end||'')))[0]||null}
function rows(){return latest()?.rows||[]}
function uniq(){return new Set(rows().map(r=>String(r.creator||'').trim()).filter(Boolean)).size}
function badge(t,type){return '<span class="tgs-pill '+(type||'')+'">'+esc(t)+'</span>'}
function svg(type){const map={
sheet:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12M15 9v12"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/>',
data:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 3 18 3 18 0V5M3 12c0 3 18 3 18 0"/>',
shield:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
download:'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>'};
return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(map[type]||map.info)+'</svg>'}
function stat(label,value,note){
return '<div class="tgs-stat"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></div>'
}
function head(){
const c=config();
return '<header class="tgs-head"><div><div class="tgs-kicker">TIKTOK SHOP / DATA AUTOMATION</div>'+
'<h1>Đồng bộ TikTok → Google Sheets</h1><p>Quản lý nguồn dữ liệu Creative Data và cấu hình nhận báo cáo hằng ngày.</p></div>'+
'<div class="tgs-head-actions">'+badge(c.spreadsheetUrl?'Đã lưu link · chưa xác thực':'Chưa kết nối Google Sheets',c.spreadsheetUrl?'amber':'')+
'<button class="tgs-btn primary" data-tgs-action="configure">'+svg('sheet')+' Cấu hình Sheets</button></div></header>'+
'<div class="tgs-warning">'+svg('info')+' <div><b>Trạng thái thực:</b> Đã có báo cáo TikTok lưu trong Supabase, nhưng chưa xác minh quyền truy cập API Creative/GMV Max, chưa cấp quyền ghi Google Sheets và <b>chưa bật đồng bộ tự động</b>. Giao diện này không yêu cầu nhập token hoặc AppSecret.</div></div>'+
'<div class="tgs-stats">'+stat('Báo cáo nguồn đã lưu',String(snapshots().length),'Các kỳ báo cáo có trong kho')+
stat('Dòng video / creative',num(rows().length),'Báo cáo gần nhất')+
stat('Tài khoản TikTok',num(uniq()),'Trong báo cáo gần nhất')+
stat('Trường dữ liệu có sẵn','8 / 23','1 trường khác có thể tính lại')+'</div>';
}
function tabs(){
return '<nav class="tgs-tabs" role="tablist">'+[['overview','Tổng quan & kết nối'],['mapping','Cấu trúc 23 cột'],['history','Lịch sử & kiểm tra']].map(([id,name])=>'<button type="button" role="tab" aria-selected="'+(state.tab===id)+'" data-tgs-tab="'+id+'" class="'+(state.tab===id?'active':'')+'">'+name+'</button>').join('')+'</nav>';
}
function field(label,input,hint){
return '<div class="tgs-field"><label class="tgs-label">'+esc(label)+'</label>'+input+(hint?'<small>'+hint+'</small>':'')+'</div>';
}
function configPanel(){
const c=config(),disabled=admin()?'':' disabled',hours=['06:00','07:00','08:00','09:00','12:00'];
const url='<input name="spreadsheetUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value="'+esc(c.spreadsheetUrl||'')+'"'+disabled+'>';
const name='<input name="sheetName" maxlength="70" required value="'+esc(c.sheetName||'CREATIVE_DAILY')+'"'+disabled+'>';
const time='<select name="hour"'+disabled+'>'+hours.map(h=>'<option value="'+h+'"'+((c.hour||'07:00')===h?' selected':'')+'>'+h+' (UTC+7)</option>').join('')+'</select>';
return '<section class="tgs-panel"><div class="tgs-panel-head"><div><h2>Thiết lập Google Sheets</h2><p>Bạn có thể gửi link Sheet sau và bổ sung ở đây.</p></div>'+svg('sheet')+'</div>'+
'<div class="tgs-panel-body"><form id="tgs-config-form">'+field('Link Google Sheets',url,'Lưu link để chuẩn bị kết nối, chưa tự cấp quyền ghi Sheet.')+
'<div class="tgs-form-columns">'+field('Tên trang tính nhận dữ liệu',name)+field('Giờ cập nhật dự kiến',time)+'</div>'+
'<div class="tgs-config-note">'+svg('calendar')+' <span>Dự kiến: chạy mỗi ngày, lấy dữ liệu hôm trước và đối soát lại 7 ngày gần nhất (múi giờ Việt Nam).</span></div>'+
'<div class="tgs-form-actions"><button class="tgs-btn primary" type="submit"'+disabled+'>Lưu cấu hình</button>'+
'<button class="tgs-btn" type="button" disabled title="Chưa triển khai dịch vụ đồng bộ">Đồng bộ ngay</button></div>'+
'<p class="tgs-sub-note">'+(admin()?'Lưu chỉ lưu cấu hình; lịch chạy chưa được kích hoạt.':'Chỉ quản trị viên có quyền lưu cấu hình.')+'</p>'+
'</form></div></section>';
}
function step(index,title,text,done,status){
return '<div class="tgs-step"><span class="tgs-step-num '+(done?'done':'')+'">'+index+'</span><div class="text"><b>'+esc(title)+'</b><small>'+esc(text)+'</small></div><span class="status">'+esc(status)+'</span></div>'
}
function connectionPanel(){
const c=config();
return '<section class="tgs-panel"><div class="tgs-panel-head"><div><h2>Tình trạng kết nối</h2><p>Chỉ hiển thị trạng thái đã thực hiện được xác minh.</p></div></div>'+
'<div class="tgs-steps">'+step('01','Dữ liệu TikTok','Có kỳ dữ liệu Creative Data đã lưu',!!latest(),latest()?'Đã có':'Chưa có')+
step('02','API Creative / GMV Max','Cần kiểm tra quyền truy cập',false,'Chưa kiểm tra')+
step('03','Google Sheets',c.spreadsheetUrl?'Đã lưu link, chưa xác thực':'Bạn sẽ gửi link sau',false,'Chưa kết nối')+
step('04','Đồng bộ hằng ngày','Chưa triển khai tác vụ trên máy chủ',false,'Chưa kích hoạt')+'</div></section>';
}
function preview(){
const s=latest(),q=state.query.trim().toLocaleLowerCase('vi');
const data=rows().filter(r=>!q||String(r.creator||'').toLocaleLowerCase('vi').includes(q)||String(r.id||'').includes(q)||String(r.content||'').toLocaleLowerCase('vi').includes(q));
return '<section class="tgs-panel"><div class="tgs-panel-head"><div><h2>Dữ liệu TikTok đang có</h2>'+
'<p>'+(s?'Kỳ '+esc(s.start)+' – '+esc(s.end)+' • Mã sản phẩm '+esc(s.productId||'—'):'Chưa có báo cáo nguồn')+'</p></div>'+
'<button class="tgs-btn" data-tgs-action="csv">'+svg('download')+' Tải mẫu 23 cột</button></div>'+
'<div class="tgs-tools"><input id="tgs-search" value="'+esc(state.query)+'" placeholder="Tìm tên KOC, ID video hoặc nội dung..."><small>'+num(data.length)+' dòng</small></div>'+
'<div class="tgs-table-scroll"><table class="tgs-table"><thead><tr><th>ID video</th><th>Tài khoản TikTok</th><th>Ngày air</th><th>Chi phí Ads</th><th>Số đơn</th><th>GMV</th><th>Hiển thị</th></tr></thead><tbody>'+
(data.length?data.slice(0,state.limit).map(r=>'<tr><td class="id">'+esc(r.id||'')+'</td><td><b>'+esc(r.creator||'')+'</b><small>'+esc(String(r.content||'').slice(0,80))+'</small></td><td>'+esc(r.posted||r.air||'—')+'</td><td class="num">'+money(r.spent||r.ads)+'</td><td class="num">'+num(r.orders)+'</td><td class="num">'+money(r.gmv)+'</td><td class="num">'+num(r.impressions)+'</td></tr>').join(''):'<tr><td colspan="7" class="tgs-empty">Chưa có dữ liệu phù hợp.</td></tr>')+
'</tbody></table></div>'+(data.length>state.limit?'<div class="tgs-panel-body"><button class="tgs-btn" data-tgs-action="more">Xem thêm 20 dòng</button></div>':'')+
'<div class="tgs-table-footer">Dữ liệu đang lưu là <b>báo cáo theo kỳ</b>, không phải số liệu từng ngày. Chưa có đồng bộ tự động nên không cộng chồng doanh thu của các kỳ báo cáo.</div></section>';
}
function overview(){
return '<div class="tgs-columns">'+configPanel()+connectionPanel()+'</div>'+
'<div class="tgs-coverage"><div><span>Độ phủ dữ liệu so với Excel gốc</span><b>8 / 23 cột</b></div><div class="tgs-track"><div></div></div><small>Còn 14 cột cần API/báo cáo đầy đủ; 1 cột chi phí/đơn có thể tính từ hai chỉ số đã lưu.</small></div>'+preview();
}
function mapping(){
return '<section class="tgs-panel"><div class="tgs-panel-head"><div><h2>Danh mục 23 cột theo Excel nguồn</h2><p>Giữ nguyên tên cột, không tự điền chỉ số chưa có.</p></div><button class="tgs-btn" data-tgs-action="csv">Tải mẫu CSV</button></div>'+
'<div class="tgs-meta">'+
'<span class="tgs-meta-item"><i class="tgs-dot green"></i>8 cột đã có</span>'+
'<span class="tgs-meta-item"><i class="tgs-dot blue"></i>1 cột có thể tính</span>'+
'<span class="tgs-meta-item"><i class="tgs-dot amber"></i>14 cột cần kết nối</span></div>'+
'<div class="tgs-table-scroll"><table class="tgs-table tgs-map"><thead><tr><th>#</th><th>Tên cột trong file</th><th>Trạng thái</th><th>Nguồn dữ liệu</th></tr></thead><tbody>'+
HEADERS.map((h,i)=>'<tr><td>'+String(i+1).padStart(2,'0')+'</td><td><b>'+esc(h)+'</b></td><td>'+
(i===10?badge('Tính được',''):KNOWN.has(i)?badge('Đã lưu','green'):badge('Cần API / Excel','amber'))+'</td><td>'+
(i===10?'Tính từ chi phí / số đơn':KNOWN.has(i)?'Supabase · Báo cáo TikTok':'Chưa có trong bản lưu hiện tại')+'</td></tr>').join('')+'</tbody></table></div>'+
'<div class="tgs-table-footer">Không suy đoán lượt nhấp, tỷ lệ xem video hoặc trạng thái quảng cáo từ các dữ liệu chưa được lưu. Cần so sánh kết quả API với file Excel trước khi kích hoạt.</div></section>';
}
function check(done,text){return '<div class="tgs-check"><i class="'+(done?'done':'')+'">'+(done?'✓':'○')+'</i>'+esc(text)+'</div>'}
function history(){
const s=latest(),c=config();
return '<div class="tgs-columns">'+
'<section class="tgs-panel"><div class="tgs-panel-head"><div><h2>Lịch sử dữ liệu nguồn</h2><p>Chưa có nhật ký chạy đồng bộ tự động.</p></div>'+svg('data')+'</div>'+
(s?'<div class="tgs-timeline"><span class="tgs-timeline-icon">'+svg('data')+'</span><div><strong>Đã lưu báo cáo Creative Data</strong><p>Kỳ '+esc(s.start)+' → '+esc(s.end)+' • '+num(s.rows.length)+' dòng</p><small>'+esc(s.fileName||'Báo cáo Creative Data TikTok')+'</small></div></div>':'<div class="tgs-empty">Chưa có dữ liệu nguồn.</div>')+
'<div class="tgs-table-footer">Chưa chạy tác vụ đồng bộ hằng ngày và chưa ghi dữ liệu lên Google Sheets.</div></section>'+
'<section class="tgs-panel"><div class="tgs-panel-head"><div><h2>Điều kiện trước khi bật tự động</h2><p>Đây là checklist triển khai, không phải các thao tác đã chạy.</p></div></div>'+
'<div class="tgs-checks">'+check(!!s,'Có dữ liệu Creative Data đối chiếu')+
check(false,'Xác minh quyền API TikTok Shop Analytics')+
check(false,'Kiểm tra API Creative / quảng cáo GMV Max')+
check(!!c.spreadsheetUrl,'Đã nhận link Google Sheets')+
check(false,'Cấp quyền ghi Google Sheets an toàn')+
check(false,'Thiết lập lịch chạy phía máy chủ')+
check(false,'Đối chiếu đủ 23 cột và xử lý trùng kỳ')+'</div></section></div>'+
'<div class="tgs-warning">'+svg('shield')+'<div>Không gửi AccessToken, RefreshToken hay AppSecret trong Google Sheets hoặc mã nguồn GitHub. Khi triển khai API, khóa phải nằm trong kho bí mật phía máy chủ.</div></div>';
}
function render(){
return '<div class="tgs" id="tgs-root">'+head()+tabs()+
(state.tab==='overview'?overview():state.tab==='mapping'?mapping():history())+'</div>';
}
function rerender(){if(typeof saleRerender==='function')saleRerender()}
function csv(){
const line=HEADERS.map(x=>'"'+x.replace(/"/g,'""')+'"').join(',')+'\r\n';
const blob=new Blob(['\ufeff',line],{type:'text/csv;charset=utf-8'});
const uri=URL.createObjectURL(blob),a=document.createElement('a');
a.href=uri;a.download='TikTok_Creative_23_cot_mau.csv';document.body.appendChild(a);a.click();a.remove();
setTimeout(()=>URL.revokeObjectURL(uri),1500);
}
document.addEventListener('click',e=>{
if(!e.target.closest('#tgs-root'))return;
const t=e.target.closest('[data-tgs-tab]');if(t){state.tab=t.dataset.tgsTab;rerender();return}
const a=e.target.closest('[data-tgs-action]');if(!a)return;
if(a.dataset.tgsAction==='configure'){state.tab='overview';rerender();document.querySelector('#tgs-config-form input[name="spreadsheetUrl"]')?.focus()}
if(a.dataset.tgsAction==='csv')csv();
if(a.dataset.tgsAction==='more'){state.limit+=20;rerender()}
});
document.addEventListener('input',e=>{
if(e.target.id!=='tgs-search')return;
state.query=e.target.value;state.limit=15;const pos=e.target.selectionStart;
rerender();const f=document.getElementById('tgs-search');
if(f){f.focus();if(pos!=null)f.setSelectionRange(pos,pos)}
});
document.addEventListener('submit',e=>{
if(e.target.id!=='tgs-config-form')return;e.preventDefault();
if(!admin()){typeof toast==='function'&&toast('Chỉ quản trị viên được lưu cấu hình');return}
const f=e.target;
const url=String(f.elements.spreadsheetUrl.value||'').trim();
const sheetName=String(f.elements.sheetName.value||'').trim();
const hour=String(f.elements.hour.value||'07:00');
const match=url?url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/):null;
if(url&&!match){typeof toast==='function'&&toast('Link Google Sheets không hợp lệ');return}
if(!sheetName){typeof toast==='function'&&toast('Nhập tên sheet');return}
setStore(STORE_KEY,{spreadsheetUrl:url,spreadsheetId:match?match[1]:'',sheetName,hour,timezone:'Asia/Bangkok',
mode:'creative_video_daily',enabled:false,verified:false,updatedAt:new Date().toISOString()});
typeof toast==='function'&&toast(url?'Đã lưu link. Chưa kích hoạt kết nối API và lịch đồng bộ.':'Đã lưu lịch dự kiến. Hãy bổ sung link Sheet sau.');
rerender();
});
window.TiktokSheetsUI={render};
})();