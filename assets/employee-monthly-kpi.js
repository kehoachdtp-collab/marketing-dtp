/* KPI tháng nhân viên - dữ liệu Supabase KV riêng, không tự cộng số liệu mẫu. */
(function(){
'use strict';
const KEY='mkt_employee_kpi_monthly_v1';
const state={month:'2026-11',person:'ha',date:'2026-11-05',view:'day',editingTargets:false,loading:false,loaded:false,filter:''};
const N=x=>Number(x)||0;
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
const money=x=>num(x)+' ₫';
const validMonth=x=>/^\d{4}-(0[1-9]|1[0-2])$/.test(x);
const validDate=x=>/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(x);
const admin=()=>typeof canManageDemoUsers==='function'&&canManageDemoUsers();
const viewAllowed=()=>typeof canViewMod==='function'&&canViewMod('employeeTasks');
const getData=()=>{const r=getStore(KEY,{version:1,months:{}});return r&&typeof r==='object'&&!Array.isArray(r)?r:{version:1,months:{}}};
const getMonth=()=>getData().months?.[state.month]||null;
const person=()=>getMonth()?.people?.find(p=>p.id===state.person)||getMonth()?.people?.[0]||null;
const initPeople=[
{id:'ha',name:'Hạ',userId:'e0917733-1545-452e-bad6-70bf4331c89d',metrics:[]},
{id:'hong',name:'Hồng',userId:null,metrics:[]},
{id:'van',name:'Vân',userId:'b252870f-dcc8-4ccc-a9e9-8e7454c0b43a',metrics:[]}
];
const defaultsByPerson={
ha:[['tiktok_care_revenue','Doanh số TikTok Care','vnd','revenue',120000000],['tiktok_care_cost','Chi phí TikTok Care','vnd','cost',null],
['tiktok_zimo_revenue','Doanh số TikTok Zimo','vnd','revenue',25000000],['tiktok_zimo_cost','Chi phí TikTok Zimo','vnd','cost',null],
['fb_revenue','Doanh số Facebook','vnd','revenue',60000000],['fb_cost','Chi phí Facebook','vnd','cost',null],
['koc_booking','Booking KOC','koc','count',20],['page_shifts','Trực page','shift','count',30]],
hong:[['shopee_revenue','Doanh số Shopee','vnd','revenue',30000000],['shopee_cost','Chi phí Shopee','vnd','cost',null],
['koc_booking','Booking KOC','koc','count',20],['livestream','Livestream','shift','count',22],['page_shifts','Trực page','shift','count',30]],
van:[['video','Video sản xuất & đăng','video','count',30],['livestream','Livestream','shift','count',22],['koc_booking','Booking KOC','koc','count',20]]
};
const buildDefault=()=>initPeople.map(p=>({...p,metrics:(defaultsByPerson[p.id]||[]).map(([id,label,unit,kind,target])=>({id,label,unit,kind,target}))}));
function unit(m){return m.unit==='vnd'?'₫':m.unit==='koc'?'KOC':m.unit==='video'?'video':'ca';}
function formatted(m,x){return m.unit==='vnd'?money(x):num(x)+' '+unit(m);}
function pct(a,b){return b>0?Math.round(Math.min(999,(a/b)*1000))/10:0;}
function rowLogs(p,m){return (m?.logs||[]).filter(x=>x.personId===p.id);}
function activeMetrics(p){return (p?.metrics||[]).filter(m=>m&&m.id);}
function personOf(p){return p?.name||'Nhân viên';}
function rangeToday(date){const d=validDate(date)?date:state.month+'-01';return {a:d,b:d};}
function rangeWeek(date){
 const d=new Date(date+'T12:00:00'),day=(d.getDay()+6)%7;
 d.setDate(d.getDate()-day);const a=d.toISOString().slice(0,10);
 d.setDate(d.getDate()+6);return {a,b:d.toISOString().slice(0,10)};
}
function rangeMonth(){return {a:state.month+'-01',b:state.month+'-31'};}
function sumMetric(logs,id,range){return logs.filter(x=>x.metricId===id&&x.date>=range.a&&x.date<=range.b).reduce((s,x)=>s+N(x.actual),0);}
function hasMetric(logs,id,range){return logs.some(x=>x.metricId===id&&x.date>=range.a&&x.date<=range.b);}
function tag(label,c='neutral'){return '<span class="ek-badge '+c+'">'+esc(label)+'</span>';}
function stat(label,value,detail){return '<div class="ek-stat"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(detail)+'</small></div>';}
function topHeader(m){
 const p=person(),all=(m?.people||[]),monthLabel=state.month.split('-').reverse().join('/');
 return '<div class="ek-header"><div><div class="ek-kicker">PLANNING DEPARTMENT / KPI</div><h1>KPI nhân viên · Tháng '+esc(monthLabel)+'</h1><p>Chỉ tiêu cố định theo tháng • Kết quả nhập hằng ngày • Tự tổng hợp tuần và lũy kế.</p></div>'+
 '<div class="ek-header-controls"><label>Tháng <input id="ek-month" type="month" value="'+esc(state.month)+'"></label>'+
 (admin()?'<button class="ek-btn" data-ek-action="copy">Sao chép KPI sang tháng khác</button>':'')+'</div></div>'+
 '<div class="ek-person-list">'+all.map(x=>'<button data-ek-person="'+esc(x.id)+'" class="ek-person '+(p?.id===x.id?'selected':'')+'"><span class="ek-avatar">'+esc(x.name.slice(0,1))+'</span><span><b>'+esc(x.name)+'</b><small>'+activeMetrics(x).length+' chỉ tiêu tháng</small></span></button>').join('')+'</div>';
}
function compact(m){
 const p=person(),logs=rowLogs(p,m),monthRange=rangeMonth();
 const targeted=activeMetrics(p).filter(x=>x.kind!=='cost'&&typeof x.target==='number');
 const meet=targeted.filter(x=>hasMetric(logs,x.id,monthRange)&&sumMetric(logs,x.id,monthRange)>=x.target).length;
 const unreported=targeted.filter(x=>!hasMetric(logs,x.id,monthRange)).length;
 const days=new Set(logs.filter(x=>x.date>=monthRange.a&&x.date<=monthRange.b).map(x=>x.date));
 return '<div class="ek-stats">'+
 stat('Số chỉ tiêu tháng',String(activeMetrics(p).length),targeted.length+' mục có mức hoàn thành')+
 stat('Chỉ tiêu đạt',meet+' / '+targeted.length,'Chỉ tính chỉ tiêu có mục tiêu số')+
 stat('Ngày đã báo cáo',String(days.size),'Có ít nhất một chỉ số được nhập')+
 stat('Chưa có kết quả',String(unreported),'Chỉ tiêu chưa phát sinh bản ghi')+
 '</div>';
}
function targetRows(m){
 const p=person(),logs=rowLogs(p,m),month=rangeMonth(),today=rangeToday(state.date),week=rangeWeek(state.date),can=admin();
 return activeMetrics(p).map(metric=>{
  const actual=sumMetric(logs,metric.id,month),daily=sumMetric(logs,metric.id,today),weekly=sumMetric(logs,metric.id,week);
  const monthInput=hasMetric(logs,metric.id,month),dayInput=hasMetric(logs,metric.id,today),weekInput=hasMetric(logs,metric.id,week);
  const target=metric.target,hasTarget=typeof target==='number'&&Number.isFinite(target);
  const achievement=hasTarget&&target>0&&metric.kind!=='cost'&&monthInput?pct(actual,target):null;
  const progress=achievement!==null?'<div class="ek-bar"><i style="width:'+Math.min(achievement,100)+'%"></i></div>':'';
  const targetView=state.editingTargets&&can?'<input type="number" class="ek-edit-target" min="0" step="'+(metric.unit==='vnd'?'1':'1')+'" data-ek-target="'+esc(metric.id)+'" value="'+(hasTarget?target:'')+'" placeholder="Chưa thiết lập">':
     (hasTarget?formatted(metric,target):'<span class="ek-muted">Chưa thiết lập</span>');
  const labelClass=metric.kind==='cost'?'ek-cost-label':'';
  const stateText=metric.kind==='cost'?
     tag('Theo dõi chi phí','blue'):
     !hasTarget?tag('Chưa đặt mức','neutral'):
     !monthInput?tag('Chưa cập nhật','neutral'):
     achievement>=100?tag('Đạt','green'):
     tag('Đang thực hiện','amber');
  return '<tr><td><b class="'+labelClass+'">'+esc(metric.label)+'</b><small>'+esc(metric.kind==='cost'?'Chi phí thực tế, không chấm đạt khi chưa có ngân sách':'KPI tháng')+'</small></td>'+
   '<td>'+targetView+'</td><td>'+ (dayInput?formatted(metric,daily):'<span class="ek-muted">—</span>')+'</td>'+
   '<td>'+(weekInput?formatted(metric,weekly):'<span class="ek-muted">—</span>')+'</td>'+
   '<td><b>'+ (monthInput?formatted(metric,actual):'<span class="ek-muted">Chưa cập nhật</span>')+'</b>'+progress+'</td>'+
   '<td>'+(achievement===null?'—':num(achievement)+'%')+'</td><td>'+stateText+'</td></tr>';
 }).join('');
}
function progressPanel(m){
 const p=person(),can=admin();
 return '<section class="ek-panel"><div class="ek-panel-head"><div><h2>Tiến độ thực hiện KPI</h2><p>Ngày '+esc(state.date.split('-').reverse().join('/'))+' • Tuần theo thứ Hai–Chủ nhật • Lũy kế tháng '+esc(state.month)+'</p></div>'+
 (can?'<button class="ek-btn" data-ek-action="editTargets">'+(state.editingTargets?'Hủy sửa mục tiêu':'Chỉnh mục tiêu tháng')+'</button>':'')+'</div>'+
 '<div class="ek-scroll"><table class="ek-table"><thead><tr><th>Hạng mục công việc</th><th>Mục tiêu tháng</th><th>Hôm nay</th><th>Trong tuần</th><th>Lũy kế tháng</th><th>% đạt</th><th>Tình trạng</th></tr></thead><tbody>'+
 (targetRows(m)||'<tr><td colspan="7">Tháng này chưa có chỉ tiêu.</td></tr>')+'</tbody></table></div>'+
 (state.editingTargets&&can?'<div class="ek-panel-actions">'+
 '<button class="ek-btn ek-primary" data-ek-action="saveTargets">Lưu mục tiêu tháng</button>'+
 '<small>Mức chi phí để trống sẽ tiếp tục không chấm đạt/vượt ngân sách.</small></div>':'')+
 '</section>';
}
function dayEntry(m){
 const p=person(),can=admin(),logs=rowLogs(p,m),today=rangeToday(state.date);
 return '<section class="ek-panel"><div class="ek-panel-head"><div><h2>Nhập kết quả ngày</h2><p>Nhập số thực tế phát sinh, không phải số lũy kế. Cùng ngày và chỉ tiêu sẽ được cập nhật, không cộng trùng.</p></div>'+tag('Ngày '+state.date,'blue')+'</div>'+
 '<div class="ek-day-body"><form id="ek-daily-form"><label class="ek-field-date">Ngày báo cáo<input name="date" id="ek-date" type="date" min="'+esc(state.month+'-01')+'" max="'+esc(state.month+'-31')+'" value="'+esc(state.date)+'" required></label>'+
 '<div class="ek-daily-grid">'+activeMetrics(p).map(metric=>{
   const value=logs.find(x=>x.date===today.a&&x.metricId===metric.id);
   return '<label><span>'+esc(metric.label)+' <em>('+esc(unit(metric))+')</em></span><input name="'+esc(metric.id)+'" data-ek-actual="'+esc(metric.id)+'" type="number" step="1" min="0" placeholder="Chưa cập nhật" value="'+(value?esc(value.actual):'')+'" '+(can?'':'disabled')+'></label>';
 }).join('')+'</div>'+
 '<div class="ek-note-row"><label>Ghi chú công việc trong ngày<textarea id="ek-note" rows="2" placeholder="Điểm nổi bật, khó khăn, hướng xử lý..." '+(can?'':'disabled')+'>'+esc((m.logs||[]).find(x=>x.personId===p.id&&x.date===state.date&&x.dailyNote)?.dailyNote||'')+'</textarea></label></div>'+
 (can?'<div class="ek-save-row"><button class="ek-btn ek-primary" type="submit" id="ek-save">Lưu kết quả ngày vào Supabase</button><small>Để trống = chưa báo cáo, nhập 0 = xác nhận không phát sinh.</small></div>':'<p class="ek-muted">Tài khoản hiện tại chỉ có quyền xem báo cáo.</p>')+
 '</form></div></section>';
}
function chart(m){
 const p=person(),logs=rowLogs(p,m),period=rangeMonth();
 const rev=activeMetrics(p).filter(x=>x.kind==='revenue').map(x=>({x,v:sumMetric(logs,x.id,period)}));
 const total=rev.reduce((s,x)=>s+x.v,0);
 const sales=rev.map(x=>'<div class="ek-chart-line"><span>'+esc(x.x.label.replace(/^Doanh số /,''))+'</span><div class="ek-chart-track"><i style="width:'+Math.max(0,Math.min(100,total>0?x.v/Math.max(total,1)*100:0))+'%"></i></div><b>'+money(x.v)+'</b></div>').join('');
 return '<section class="ek-panel"><div class="ek-panel-head"><div><h2>Tổng quan hiệu quả tháng</h2><p>Biểu đồ doanh số theo từng kênh (nếu đã có dữ liệu).</p></div></div><div class="ek-chart">'+
 (rev.length?(logs.length?sales:'<div class="ek-empty">Chưa có doanh số thực tế được nhập trong tháng.</div>'):'<div class="ek-empty">Nhân viên này không có KPI doanh thu.</div>')+
 '</div></section>';
}
function history(m){
 const p=person(),entries=(m.logs||[]).filter(x=>x.personId===p.id).sort((a,b)=>b.date.localeCompare(a.date)),all=activeMetrics(p);
 return '<section class="ek-panel"><div class="ek-panel-head"><div><h2>Lịch sử cập nhật</h2><p>Lưu theo ngày, theo người và theo chỉ tiêu.</p></div></div>'+
 '<div class="ek-scroll"><table class="ek-table ek-hist"><thead><tr><th>Ngày</th><th>Chỉ tiêu</th><th>Thực tế</th><th>Ghi chú</th></tr></thead><tbody>'+
 (entries.length?entries.slice(0,50).map(x=>{const metric=all.find(y=>y.id===x.metricId);return '<tr><td>'+esc(x.date)+'</td><td>'+esc(metric?.label||x.metricId)+'</td><td><b>'+ (metric?formatted(metric,x.actual):num(x.actual))+'</b></td><td>'+esc(x.dailyNote||'')+'</td></tr>'}).join(''):'<tr><td colspan="4" class="ek-empty">Chưa có kết quả ngày nào được ghi nhận.</td></tr>')+
 '</tbody></table></div></section>';
}
function workNotice(m){
 const p=person(),name=personOf(p);
 return '<div class="ek-next"><div><b>📋 Công việc phát sinh</b><span> Những việc không cố định hằng tháng vẫn được quản lý riêng: giao việc, deadline, trạng thái và hoàn thành.</span></div>'+
 '<button class="ek-btn" data-ek-action="tasks">Mở theo dõi công việc</button></div>'+
 (p.id==='hong'&&!p.userId?'<div class="ek-caution">⚠️ Chưa gán KPI của “Hồng” cho tài khoản đăng nhập cụ thể vì hệ thống có nhiều hồ sơ tên Hồng. Quản trị viên hãy chọn đúng nhân viên ở phần liên kết tài khoản.</div>':'');
}
function accountLink(m){
 const p=person(),users=typeof demoGetUsers==='function'?demoGetUsers():[];
 const match=users.find(x=>x.id===p.userId),can=admin();
 return '<div class="ek-account"><span>Hồ sơ nhân viên: <b>'+esc(p.name)+'</b> · '+(match?esc(match.displayName||match.username):'Chưa liên kết tài khoản')+'</span>'+
 (can?'<button class="ek-btn" data-ek-action="link">Liên kết tài khoản</button>':'')+'</div>';
}
function render(){
 if(!viewAllowed())return '<div class="ek-empty">Không có quyền truy cập KPI nhân viên.</div>';
 if(!state.loaded&&!state.loading&&typeof demoCurrentUser==='function'&&demoCurrentUser()?.id){
  state.loading=true;
  Promise.resolve().then(async()=>{
   try{
    const remote=await mktApi.kvGet(KEY);
    if(remote&&remote.months){localStorage.setItem(KEY,JSON.stringify(remote));}
   }catch(e){console.warn('[monthlyKPI] initial Supabase load failed',e)}
   finally{state.loading=false;state.loaded=true;if(typeof curMod!=='undefined'&&curMod==='employeeTasks'&&typeof employeeDashboardTab!=='undefined'&&employeeDashboardTab==='monthly')renderDashboardSafe();}
  });
 }
 const m=getMonth();
 if(!m)return '<div class="ek-app"><div class="ek-header"><div><h1>KPI tháng '+esc(state.month)+'</h1><p>Tháng này chưa được thiết lập chỉ tiêu.</p></div>'+
 (admin()?'<button class="ek-btn ek-primary" data-ek-action="copy">Sao chép KPI tháng trước</button>':'')+'</div><div class="ek-empty">Chọn tháng 11/2026 để xem các mục tiêu đã thiết lập; có thể sao chép bộ mục tiêu sang tháng mới.</div></div>';
 if(!m.people?.some(p=>p.id===state.person))state.person=m.people?.[0]?.id||'ha';
 if(!state.date.startsWith(state.month))state.date=state.month+'-01';
 return '<div id="ek-app" class="ek-app">'+topHeader(m)+accountLink(m)+compact(m)+progressPanel(m)+
 '<div class="ek-two-col">'+dayEntry(m)+chart(m)+'</div>'+workNotice(m)+history(m)+'</div>';
}
function renderDashboardSafe(){if(typeof render==='function')render();}
async function save(next){
 const caller=demoCurrentUser();
 if(!admin()||!caller?.id)throw new Error('Chỉ quản trị viên được cập nhật KPI.');
 const revision=new Date().toISOString()+'-'+Math.random().toString(36).slice(2,9);
 next.updatedAt=revision;
 await mktApi.kvSet(KEY,next,caller.id);
 const server=await mktApi.kvGet(KEY);
 if(server?.updatedAt!==revision)throw new Error('Supabase chưa xác nhận bản KPI mới lưu.');
 localStorage.setItem(KEY,JSON.stringify(server));
 state.loaded=true;
 if(typeof _kvSetKnown==='function')_kvSetKnown(KEY,server);
 return true;
}
function clone(){return JSON.parse(JSON.stringify(getData()));}
async function recordDaily(form){
 const month=state.month,day=String(form.elements.date.value||'');
 if(!validDate(day)||!day.startsWith(month))throw new Error('Ngày báo cáo phải thuộc tháng '+month+'.');
 const out=clone(),m=out.months?.[month],p=m?.people?.find(x=>x.id===state.person);
 if(!m||!p)throw Error('Chưa có KPI tháng.');
 const notes=String(document.getElementById('ek-note')?.value||'').trim();
 let changed=false;
 for(const metric of activeMetrics(p)){
  const field=form.querySelector('[data-ek-actual="'+metric.id+'"]');
  const raw=String(field?.value??'').trim();
  if(raw!==''&&(!/^\d+(?:\.\d+)?$/.test(raw)||Number(raw)<0))throw Error('Kết quả '+metric.label+' phải là số không âm.');
  if(raw!==''&&metric.unit!=='vnd'&&!Number.isInteger(Number(raw)))throw Error(metric.label+' phải là số nguyên.');
  const idx=m.logs.findIndex(x=>x.personId===p.id&&x.date===day&&x.metricId===metric.id);
  if(raw===''){
    if(idx>=0){m.logs.splice(idx,1);changed=true;}continue;
  }
  const value=Number(raw);
  const old=idx>=0?m.logs[idx]:null;
  if(!old||old.actual!==value||old.dailyNote!==notes){
   const item={personId:p.id,date:day,metricId:metric.id,actual:value,dailyNote:notes,
      updatedBy:demoCurrentUser()?.username||'',updatedAt:new Date().toISOString()};
   if(idx>=0)m.logs[idx]=item;else m.logs.push(item);
   changed=true;
  }
 }
 if(!changed)throw Error('Không có thay đổi kết quả ngày để lưu.');
 await save(out);state.date=day;
}
async function updateTargets(){
 const next=clone(),p=next.months?.[state.month]?.people?.find(x=>x.id===state.person);
 if(!p)throw Error('Chưa có KPI tháng.');
 for(const m of p.metrics){
  const input=document.querySelector('[data-ek-target="'+m.id+'"]');
  if(!input)continue;
  const raw=String(input.value||'').trim();
  if(raw===''){m.target=null;continue;}
  if(!/^\d+(?:\.\d+)?$/.test(raw))throw Error('Mục tiêu '+m.label+' phải là số không âm.');
  const v=Number(raw);
  if(m.unit!=='vnd'&&!Number.isInteger(v))throw Error(m.label+' phải là số nguyên.');
  m.target=v;
 }
 await save(next);state.editingTargets=false;
}
async function copyMonth(){
 const dest=prompt('Sao chép mục tiêu hiện tại sang tháng (YYYY-MM):','2026-12');
 if(dest===null)return;
 if(!validMonth(dest)){toast('Tháng không hợp lệ. Ví dụ 2026-12.');return;}
 const next=clone();
 if(next.months?.[dest]){toast('Tháng '+dest+' đã có dữ liệu. Không ghi đè.');return;}
 const src=next.months[state.month];
 if(!src)throw Error('Tháng nguồn chưa có KPI.');
 next.months[dest]={month:dest,people:JSON.parse(JSON.stringify(src.people)),logs:[],updatedAt:new Date().toISOString(),notes:'Sao chép mục tiêu từ '+state.month+'; kết quả thực tế được nhập riêng'};
 await save(next);state.month=dest;state.date=dest+'-01';state.editingTargets=false;
}
async function linkAccount(){
 const m=getMonth(),p=person();
 if(!p)throw Error('Không có nhân viên');
 const users=(typeof demoGetUsers==='function'?demoGetUsers():[]).filter(x=>x.status==='active');
 const optionList=users.map(x=>(x.displayName||x.username)+' ['+x.username+']').join('\n');
 const name=prompt('Nhập username cần liên kết cho '+p.name+'.\nĐang có các tài khoản:\n'+optionList,p.userId?(users.find(x=>x.id===p.userId)?.username||''):'');
 if(name===null)return;
 const target=users.find(u=>u.username===name.trim());
 if(!target)throw Error('Không tìm thấy username "'+name.trim()+'".');
 if(m.people.some(x=>x.id!==p.id&&x.userId===target.id))throw Error('Tài khoản đã liên kết với một KPI nhân viên khác.');
 const next=clone();next.months[state.month].people.find(x=>x.id===p.id).userId=target.id;
 await save(next);
}
document.addEventListener('click',async e=>{
 const root=e.target.closest('#ek-app');
 if(!root)return;
 const b=e.target.closest('[data-ek-person],[data-ek-action]');
 if(!b)return;
 if(b.dataset.ekPerson){state.person=b.dataset.ekPerson;state.editingTargets=false;renderDashboardSafe();return;}
 const action=b.dataset.ekAction;
 if(action==='tasks'){employeeDashboardTab='tasks';renderDashboardSafe();return;}
 if(action==='editTargets'){state.editingTargets=!state.editingTargets;renderDashboardSafe();return;}
 try{
   b.disabled=true;
   if(action==='saveTargets')await updateTargets();
   else if(action==='copy')await copyMonth();
   else if(action==='link')await linkAccount();
   else return;
   toast('Đã lưu và xác nhận trên Supabase.');
   renderDashboardSafe();
 }catch(err){toast('Không lưu được: '+(err.message||err));b.disabled=false;}
});
document.addEventListener('change',e=>{
 if(e.target?.id==='ek-month'){const v=e.target.value;if(!validMonth(v))return;state.month=v;state.date=v+'-01';state.editingTargets=false;renderDashboardSafe();}
 if(e.target?.id==='ek-date'){const v=e.target.value;if(validDate(v)&&v.startsWith(state.month)){state.date=v;renderDashboardSafe();}}
});
document.addEventListener('submit',async e=>{
 if(e.target?.id!=='ek-daily-form')return;
 e.preventDefault();const b=e.target.querySelector('[type="submit"]');
 if(!admin()){toast('Bạn chưa có quyền sửa KPI');return;}
 try{
  if(b)b.disabled=true;
  await recordDaily(e.target);
  toast('Đã lưu kết quả ngày và kiểm tra dữ liệu Supabase.');
  renderDashboardSafe();
 }catch(err){toast('Không lưu được: '+(err.message||err));if(b)b.disabled=false;}
});
window.EmployeeMonthlyKPI={render};
})();