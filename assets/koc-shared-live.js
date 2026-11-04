/* KOC shared management – integrates existing Supabase-backed master and legacy campaign data. */
(function(){
  'use strict';
  const KEY='mkt_sale_koc_direct_bookings';
  const ui={view:'shared',platform:'all',query:'',limit:50,selectedCode:'',editing:null};
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const V=v=>String(v==null?'':v).trim();
  const N=v=>Number(v)||0;
  const F=n=>Math.round(n||0).toLocaleString('vi-VN');
  const M=n=>F(n)+'đ';
  const can=()=>typeof canEditMod==='function'&&canEditMod('sale');
  const norm=s=>V(s).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const all=()=>{let d=getStore(KEY,[]);return Array.isArray(d)?d:[];};
  const arr=x=>Array.isArray(x)?x:[];
  const masters=()=>arr(typeof kocMstRows!=='undefined'?kocMstRows:[]);
  const legacy=()=>arr(typeof kocProdRows!=='undefined'?kocProdRows:[]);
  const platformName=p=>p==='tiktok'?'TikTok':p==='shopee'?'Shopee':'Cả hai sàn';
  function add20(date){const d=new Date(date+'T12:00:00');if(Number.isNaN(d.getTime()))return '';d.setDate(d.getDate()+20);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
  function displayDate(s){if(!s)return 'Chưa cập nhật';let v=String(s).slice(0,10).split('-');return v.length===3?v.reverse().join('/'):s;}
  function match(code,p){return all().filter(b=>b.maKoc===code&&(!p||b.platform===p));}
  function legacyMatch(code,p){return legacy().filter(b=>b.maKoc===code&&(!p||norm(b.nenTang||b.san||b.platform||'').includes(p))); }
  function byCode(code){return masters().find(m=>m.maKoc===code);}
  function tiny(label,value){return '<div class="knd-tiny"><small>'+label+'</small><b>'+E(value)+'</b></div>';}
  function pill(text,c='neutral'){return '<span class="knd-pill '+c+'">'+E(text)+'</span>';}
  function active(code,p){return match(code,p).length>0||legacyMatch(code,p).length>0;}
  function status(code){const tt=active(code,'tiktok'),sp=active(code,'shopee');return tt&&sp?'Cả 2':tt?'Chỉ TikTok':sp?'Chỉ Shopee':'Chưa ghi nhận';}
  function head(title,desc){
    return '<div class="knd-head"><div><h2>'+title+'</h2><p>'+desc+'</p></div><div class="knd-actions">'+
    (can()?'<button type="button" class="btn btn-primary" data-kn-action="add">＋ Tạo hợp tác KOC</button>':'')+'</div></div>';
  }
  function renderShared(){
    const list=masters(),filtered=list.filter(m=>(!ui.query||norm([m.ten,m.maKoc,m.socialLink,m.lienHe,m.tiktokChannelName,m.shopeeChannelName].join(' ')).includes(norm(ui.query)))&&
      (ui.platform==='all'||(ui.platform==='both'?status(m.maKoc)==='Cả 2':active(m.maKoc,ui.platform))));
    let current=filtered.slice(0,ui.limit);
    return head('Danh sách KOC chung','Dữ liệu gốc lấy từ KOC master hiện có. Hồ sơ dùng chung, hợp tác được ghi theo từng sàn.')+
      '<div class="knd-stats">'+tiny('KOC master hiện có',F(list.length))+tiny('Đã ghi nhận TikTok',F(list.filter(m=>active(m.maKoc,'tiktok')).length))+tiny('Đã ghi nhận Shopee',F(list.filter(m=>active(m.maKoc,'shopee')).length))+tiny('Đã book cả 2',F(list.filter(m=>status(m.maKoc)==='Cả 2').length))+'</div>'+
      '<div class="knd-box"><div class="knd-toolbar"><input id="kn-search" value="'+E(ui.query)+'" placeholder="Tìm KOC, mã, SĐT, kênh...">'+
      '<select id="kn-platform"><option value="all">Tất cả KOC</option><option value="tiktok" '+(ui.platform==='tiktok'?'selected':'')+'>Đã book TikTok</option><option value="shopee" '+(ui.platform==='shopee'?'selected':'')+'>Đã book Shopee</option><option value="both" '+(ui.platform==='both'?'selected':'')+'>Đã book cả hai</option></select>'+
      '<span class="knd-muted">'+F(filtered.length)+' KOC</span></div>'+
      '<div class="knd-scroll"><table class="knd-table"><thead><tr><th>Mã / Tên KOC</th><th>SĐT / Liên hệ</th><th>Kênh TikTok</th><th>Kênh Shopee</th><th>Booking</th><th>Hạn gần nhất N+20</th><th>Thao tác</th></tr></thead><tbody>'+
      current.map(m=>{const b=match(m.maKoc).sort((a,b)=>(b.start||'').localeCompare(a.start||''))[0];let ktt=m.tiktokChannelName||m.ten||'',ksp=m.shopeeChannelName||'';
        return '<tr><td><b>'+E(m.ten||'Chưa có tên')+'</b><div class="knd-muted">'+E(m.maKoc)+'</div></td>'+
        '<td>'+E(m.lienHe||'Chưa cập nhật')+'</td><td>'+E(ktt)+'</td><td>'+E(ksp||'Chưa liên kết')+'</td><td>'+pill(status(m.maKoc),status(m.maKoc)==='Cả 2'?'ok':'neutral')+
        '<div class="knd-muted">'+match(m.maKoc).length+' booking nhập mới</div></td><td>'+E(b?displayDate(b.due):'Chưa cập nhật')+'</td>'+
        '<td><button type="button" class="btn btn-sm" data-kn-code="'+E(encodeURIComponent(m.maKoc))+'">+ Bổ sung hợp tác</button></td></tr>';}).join('')+'</tbody></table></div>'+
      (filtered.length>ui.limit?'<div class="knd-more"><button class="btn" data-kn-action="more">Hiện thêm KOC</button></div>':'')+'</div>'+
      '<div class="knd-note">Lưu ý: Có tên KOC hoặc dữ liệu video không có nghĩa là đã book. Hệ thống chỉ tính là “đã book” khi có lịch sử hợp tác ghi nhận rõ sàn; dữ liệu chưa xác định sàn không tự được phân loại.</div>';
  }
  function renderBookings(){
    let b=all().filter(r=>ui.platform==='all'||r.platform===ui.platform).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
    return head('Quản lý booking KOC','Mỗi lần hợp tác được lưu riêng, ngày hoàn thành mặc định N+20 ngày.')+
      '<div class="knd-box"><div class="knd-toolbar">'+platformSelect()+'<span class="knd-muted">'+F(b.length)+' lượt hợp tác nhập theo form mới</span></div>'+
      '<div class="knd-scroll"><table class="knd-table"><thead><tr><th>KOC</th><th>Sàn</th><th>Tên kênh / ID</th><th>Ngày hợp tác</th><th>Hạn N+20</th><th>Cast</th><th>Số video</th><th>Trạng thái</th><th>Hợp đồng</th></tr></thead><tbody>'+
      (b.length?b.map(x=>'<tr><td><b>'+E(x.creator)+'</b><div class="knd-muted">'+E(x.maKoc)+'</div></td><td>'+pill(platformName(x.platform))+'</td><td>'+E(x.channelName)+'<div class="knd-muted">'+E(x.channelId)+'</div></td><td>'+displayDate(x.start)+'</td><td><b>'+displayDate(x.due)+'</b></td><td>'+ (x.cast==='yes'?M(x.castFee):'Không cast')+'</td><td>'+F(x.videoCount||0)+'</td><td>'+pill(x.status||'Đã chốt','ok')+'</td><td>'+(x.cast==='yes'?'<button type="button" class="btn btn-sm" data-kn-action="contract">Hợp đồng / OCR</button>':'—')+'</td></tr>').join(''):'<tr><td colspan="9" class="knd-empty">Chưa có booking nhập theo biểu mẫu mới. Dữ liệu hợp tác cũ vẫn được giữ nguyên trong mục KOC / Affiliate trước đây.</td></tr>')+
      '</tbody></table></div></div>';
  }
  function platformSelect(){return '<select id="kn-platform"><option value="all" '+(ui.platform==='all'?'selected':'')+'>Cả hai sàn</option><option value="tiktok" '+(ui.platform==='tiktok'?'selected':'')+'>TikTok</option><option value="shopee" '+(ui.platform==='shopee'?'selected':'')+'>Shopee</option></select>';}
  function renderAnalysis(){
    // Only attributable existing campaign records; unknown platform must not be guessed.
    const list=masters(),rows=list.map(m=>{let b=legacy().filter(x=>x.maKoc===m.maKoc);
      let tagged=b.filter(x=>x.platform==='tiktok'||x.platform==='shopee'||x.san==='tiktok'||x.san==='shopee');
      const byP=p=>{let pRows=tagged.filter(x=>x.platform===p||x.san===p);return {gmv:pRows.reduce((s,x)=>s+N(x.gmv),0),cost:pRows.reduce((s,x)=>s+N(x.chiPhiBooking),0),orders:pRows.reduce((s,x)=>s+N(x.soMonBanRa),0),n:pRows.length};};
      return {m,tt:byP('tiktok'),sp:byP('shopee'),unknown:b.length-tagged.length,status:status(m.maKoc)};
    }).filter(o=>o.status!=='Chưa ghi nhận'||o.unknown>0)
      .filter(o=>!ui.query||norm(o.m.ten+' '+o.m.maKoc).includes(norm(ui.query)));
    return head('Phân tích & Book lại KOC','Phân biệt booking TikTok/Shopee, so sánh chiến dịch đã có chỉ số và xác định cơ hội booking chéo.')+
      '<div class="knd-note">Đây là dữ liệu đang lưu trong website, không tự cộng doanh thu từ hai sàn khi thiếu mã chiến dịch hoặc nguồn. File Creative Data TikTok trước đây chưa được nhập thành báo cáo theo kỳ lên Supabase. Dữ liệu Shopee minh họa trong HTML cũ không được đưa vào đây.</div>'+
      '<div class="knd-box"><div class="knd-toolbar"><input id="kn-search" value="'+E(ui.query)+'" placeholder="Tìm KOC...">'+platformSelect()+'</div><div class="knd-scroll"><table class="knd-table"><thead><tr><th>KOC</th><th>Tình trạng</th><th>TikTok booking</th><th>Shopee booking</th><th>GMV ghi nhận TikTok</th><th>GMV ghi nhận Shopee</th><th>Đề xuất</th><th>Chi tiết</th></tr></thead><tbody>'+
      rows.filter(o=>ui.platform==='all'||active(o.m.maKoc,ui.platform)).slice(0,ui.limit).map(o=>{
      const t=match(o.m.maKoc,'tiktok').length+o.tt.n,s=match(o.m.maKoc,'shopee').length+o.sp.n;
      const opportunity=t>0&&s===0?'Có thể xem xét thử Shopee':s>0&&t===0?'Có thể xem xét thử TikTok':t&&s?'So sánh hai sàn':'Chưa đủ dữ liệu';
      return '<tr><td><b>'+E(o.m.ten)+'</b><div class="knd-muted">'+E(o.m.maKoc)+'</div></td><td>'+pill(o.status)+'</td><td>'+F(t)+'</td><td>'+F(s)+'</td><td>'+M(o.tt.gmv)+'</td><td>'+M(o.sp.gmv)+'</td><td>'+E(opportunity)+'</td><td><button class="btn btn-sm" data-kn-expand="'+E(encodeURIComponent(o.m.maKoc))+'">▾ Xem</button></td></tr>'+
      (ui.selectedCode===o.m.maKoc?'<tr><td colspan="8"><div class="knd-detail">'+
        '<b>'+E(o.m.ten)+' · Lịch sử hai sàn</b><div class="knd-stats">'+
        tiny('TikTok · GMV',M(o.tt.gmv))+tiny('Shopee · GMV',M(o.sp.gmv))+tiny('Chi phí booking TikTok',M(o.tt.cost))+tiny('Chi phí booking Shopee',M(o.sp.cost))+'</div>'+
        '<div class="knd-note">Số lượt hợp tác chưa rõ sàn: '+o.unknown+'. Các trường hợp này cần nhân viên xác nhận trước khi so sánh.</div></div></td></tr>':'');
      }).join('')+'</tbody></table></div></div>';
  }
  function renderForm(){
    let m=byCode(ui.editing||''),paid=false;
    const code=m?m.maKoc:'',name=m?m.ten||'':'',phone=m?m.lienHe||'':'';
    return '<div class="knd-overlay" id="kn-overlay"><div class="knd-modal"><div class="knd-modal-top"><div><h3>＋ Ghi nhận hợp tác KOC</h3><small>Thông tin bắt buộc đánh dấu *</small></div><button class="btn btn-sm" data-kn-action="close">✕</button></div>'+
      '<form id="kn-form"><input name="maKoc" type="hidden" value="'+E(code)+'"><div class="knd-formgrid">'+
      inp('Tên KOC *','creator',name,'text',true)+inp('Số điện thoại *','phone',phone,'tel',true)+inp('Tên kênh *','channelName',m?(ui.platform==='shopee'?m.shopeeChannelName||'':m.tiktokChannelName||m.ten||''):'','text',true)+
      inp('ID kênh *','channelId',m?(ui.platform==='shopee'?m.shopeeChannelId||'':m.tiktokChannelId||''):'','text',true)+inp('Link kênh *','channelUrl',m?(ui.platform==='shopee'?m.shopeeLink||'':m.tiktokLink||m.socialLink||''):'','url',true)+
      '<label>Sàn hợp tác *<select name="platform" required><option value="tiktok" '+(ui.platform==='shopee'?'':'selected')+'>TikTok Shop</option><option value="shopee" '+(ui.platform==='shopee'?'selected':'')+'>Shopee</option></select></label>'+
      '<label>Ngày hợp tác (N) *<input name="start" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></label>'+
      '<label>Hạn N + 20 ngày<input name="due" type="date" readonly></label>'+
      '<label>Hình thức hợp tác *<select name="cast" required><option value="">-- Chọn --</option><option value="no">Không cast</option><option value="yes">Có cast</option></select></label>'+
      '<label>Số video cam kết (nếu không cast có thể để trống)<input name="videoCount" type="number" min="1" step="1"></label>'+
      '</div><div class="knd-paid" id="kn-paid" hidden><div class="knd-formgrid">'+inp('Số tiền cast (VNĐ) *','castFee','','number',false)+
      '<label>Ảnh CCCD *<input name="cccd" type="file" accept="image/*,.pdf"></label></div>'+
      '<div class="knd-note">Ảnh CCCD chỉ được kiểm tra trong bước nhập này, không lưu vào trình duyệt hoặc file web. Để đọc OCR và xuất Word, dùng mục Hợp đồng KOC hiện có. Chưa tự động sinh hợp đồng từ form mới.</div></div>'+
      '<div class="knd-form-actions"><button type="button" class="btn" data-kn-action="close">Hủy</button><button class="btn btn-primary" type="submit">Lưu hợp tác</button></div></form></div></div>';
  }
  function inp(label,name,value,type,req){return '<label>'+label+'<input name="'+name+'" type="'+type+'" '+(req?'required ':'')+'value="'+E(value)+'"></label>';}
  function render(){try{
    const panel=ui.view==='shared'?renderShared():ui.view==='bookings'?renderBookings():renderAnalysis();
    return '<div class="knd-root">'+panel+(ui.editing!==null?renderForm():'')+'</div>';
  }catch(err){console.error('[KOC new]',err);return '<div class="knd-note">Không tải được giao diện KOC. Vui lòng tải lại website.</div>'}}
  function open(view,platform){ui.view=view||'shared';ui.platform=platform||'all';ui.query='';ui.limit=50;ui.selectedCode='';ui.editing=null;navSaleSub('kocNew');}
  function showForm(code=''){if(!can()){toast('Tài khoản không có quyền sửa Sale Online');return;}ui.editing=code;rerender();const f=document.getElementById('kn-form');if(f){f.elements.due.value=add20(f.elements.start.value);}}
  function rerender(){saleRerender();}
  function handleSubmit(ev){
    if(ev.target.id!=='kn-form')return;ev.preventDefault();
    if(!can())return;
    const f=ev.target, v=n=>V(f.elements[n]?.value);
    const cast=v('cast'),phone=v('phone'),creator=v('creator'),start=v('start'),channel=v('channelName'),channelId=v('channelId'),url=v('channelUrl'),platform=v('platform');
    if(!creator||!phone||!channel||!channelId||!url||!start||!['yes','no'].includes(cast)||!['tiktok','shopee'].includes(platform)){toast('Vui lòng điền đầy đủ thông tin bắt buộc');return;}
    if(!/^https?:\/\//i.test(url)){toast('Link kênh phải bắt đầu bằng https://');return;}
    const fee=Number(v('castFee')||0),videos=Number(v('videoCount')||0);
    if(cast==='yes'&&(!(fee>0)||!(Number.isInteger(videos)&&videos>0)||!f.elements.cccd.files?.length)){toast('Có cast: bắt buộc chọn CCCD, nhập số tiền cast và số video');return;}
    let code=v('maKoc'),m=byCode(code);
    if(!m){const exact=masters().filter(x=>norm(x.ten)===norm(creator));if(exact.length>1){toast('Trùng nhiều tên KOC: vui lòng chọn hồ sơ trong Danh sách KOC chung');return;}m=exact[0];}
    if(!m){m={id:Date.now()+Math.random(),maKoc:_kocNextMa(),ten:creator};kocMstRows.push(m);}
    m.ten=m.ten||creator;m.lienHe=phone;
    if(platform==='tiktok'){m.tiktokChannelName=channel;m.tiktokChannelId=channelId;m.tiktokLink=url;if(!m.socialLink)m.socialLink=url;}
    else {m.shopeeChannelName=channel;m.shopeeChannelId=channelId;m.shopeeLink=url;}
    const booking={id:'kn_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),maKoc:m.maKoc,creator,phone,platform,channelName:channel,channelId,channelUrl:url,
      start,due:add20(start),cast,castFee:cast==='yes'?fee:0,videoCount:videos||0,status:'Đã chốt',
      cccdFileStored:false,contractStatus:cast==='yes'?'Chờ kiểm tra OCR':'Không yêu cầu',createdAt:new Date().toISOString()};
    // Write only after form validation. CCCD file bytes are never read, persisted or uploaded.
    setStore(KEY,[...all(),booking]);_kocSaveAll();
    ui.editing=null;ui.view='bookings';ui.platform=platform;rerender();
    toast('Đã lưu hợp tác. Hạn '+displayDate(booking.due)+(cast==='yes'?' · Cần kiểm tra CCCD và tạo hợp đồng':''));
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-kn-action],[data-kn-code],[data-kn-expand]');if(!b)return;
    if(b.hasAttribute('data-kn-code')){showForm(decodeURIComponent(b.dataset.knCode));return;}
    if(b.hasAttribute('data-kn-expand')){const code=decodeURIComponent(b.dataset.knExpand);ui.selectedCode=ui.selectedCode===code?'':code;rerender();return;}
    const action=b.dataset.knAction;
    if(action==='add')showForm('');
    if(action==='close'){ui.editing=null;rerender();}
    if(action==='more'){ui.limit+=50;rerender();}
    if(action==='contract'){saleTab='koc';kocSubTab='contracts';saleRerender();}
  });
  document.addEventListener('input',e=>{
    if(e.target?.id==='kn-search'){ui.query=e.target.value;let p=e.target.selectionStart;const n=e.target;rerender();const next=document.getElementById('kn-search');if(next){next.focus();if(p!=null)next.setSelectionRange(p,p);}}
    if(e.target.closest('#kn-form')&&e.target.name==='start'){const f=e.target.form;f.elements.due.value=add20(f.elements.start.value);}
  });
  document.addEventListener('change',e=>{
    if(e.target?.id==='kn-platform'){ui.platform=e.target.value;rerender();return;}
    if(e.target.closest('#kn-form')&&e.target.name==='cast'){
      const paid=e.target.value==='yes',panel=document.getElementById('kn-paid');panel.hidden=!paid;
      e.target.form.elements.castFee.required=paid;e.target.form.elements.cccd.required=paid;e.target.form.elements.videoCount.required=paid;
      e.target.form.elements.castFee.min='1';
    }
  });
  document.addEventListener('submit',handleSubmit);
  document.head.insertAdjacentHTML('beforeend', '<style>.knd-root{font-size:13px}.knd-head{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:18px}.knd-head h2{margin:0 0 5px;color:#1e2e4a;font-size:21px}.knd-head p{font-size:12px;color:#64748b;margin:0}.knd-stats{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:12px;margin-bottom:16px}.knd-tiny{background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:12px}.knd-tiny small{display:block;font-size:11px;color:#64748b}.knd-tiny b{display:block;font-size:20px;margin-top:6px;color:#1e2e4a}.knd-box{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;margin-bottom:14px}.knd-toolbar{padding:13px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}.knd-toolbar input,.knd-toolbar select{padding:10px;border:1px solid #cbd5e1;border-radius:8px;min-width:190px}.knd-scroll{overflow:auto}.knd-table{width:100%;border-collapse:collapse;min-width:940px;font-size:12px}.knd-table th{text-align:left;background:#f4f7fb;color:#64748b;font-size:10px;letter-spacing:.35px;white-space:nowrap}.knd-table th,.knd-table td{border-bottom:1px solid #edf1f5;padding:12px 11px;vertical-align:middle}.knd-table td b{color:#253958}.knd-muted{font-size:11px;color:#94a3b8;margin-top:5px}.knd-pill{border-radius:999px;background:#eef2f7;color:#64748b;padding:5px 8px;white-space:nowrap;font-size:10px;font-weight:750;display:inline-block}.knd-pill.ok{background:#e8f7ef;color:#167c50}.knd-note{font-size:12px;color:#7d5c20;border:1px solid #f4d7a9;background:#fff9ed;border-radius:9px;padding:12px;margin:12px 0;line-height:1.6}.knd-more{padding:12px}.knd-empty{text-align:center;color:#8494ab;padding:25px!important}.knd-detail{background:#f8fafc;padding:14px}.knd-detail>.knd-stats{margin-top:12px}.knd-overlay{position:fixed;inset:0;background:#0f20399c;z-index:1000;display:grid;place-items:center;padding:12px}.knd-modal{background:#fff;border-radius:14px;width:min(770px,100%);max-height:94vh;overflow:auto;box-shadow:0 18px 60px #13243a4d}.knd-modal-top{padding:17px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between}.knd-modal h3{margin:0 0 5px;font-size:17px;color:#1e2e4a}.knd-modal small{color:#8a9ab1}.knd-modal form{padding:18px}.knd-formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.knd-formgrid label{font-weight:700;font-size:12px;color:#475569}.knd-formgrid input,.knd-formgrid select{display:block;margin-top:6px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;width:100%;font-size:13px;background:#fff}.knd-paid{background:#f8fafc;border:1px solid #e2e8f0;padding:13px;margin-top:15px;border-radius:10px}.knd-paid[hidden]{display:none}.knd-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.knd-root .btn-sm{font-size:11px;padding:6px 9px}.knd-head .btn-primary{background:#1e2e4a;color:#fff}.knd-head .btn-primary:hover{color:#fff}@media(max-width:1020px){.knd-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.knd-formgrid{grid-template-columns:1fr}} </style>');

  const BOOK_KEY="mkt_sale_koc_direct_bookings";
  const LINK_KEY="mkt_sale_koc_platform_links_live";
  const ASSIGN_KEY="mkt_sale_koc_video_assignments_live";
  const VIDEO_KEY="mkt_sale_koc_tiktok_snapshots";
  const safeArr=(x)=>Array.isArray(x)?x:[];
  const safeObj=(x)=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  const normalName=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^\p{L}\p{N}]/gu,'');
  function getVideoData(){
    const snaps=safeArr(getStore(VIDEO_KEY,[]));
    if(!snaps.length)return [];
    const mostRecent=snaps.slice().sort((a,b)=>String(b.end||'').localeCompare(String(a.end||'')))[0];
    return safeArr(mostRecent.rows).filter(x=>x.creator&&x.id).map(r=>({
      id:String(r.id),creator:String(r.creator),content:String(r.content||''),
      air:String(r.posted||r.air||''),ads:Number(r.spent||r.ads)||0,
      orders:Number(r.orders)||0,gmv:Number(r.gmv)||0,impressions:Number(r.impressions)||0
    }));
  }
  function portalSnapshot(){
    return {
      masters:masters().map(m=>({maKoc:m.maKoc,ten:m.ten,lienHe:m.lienHe||'',
        tiktokChannelName:m.tiktokChannelName||'',tiktokChannelId:m.tiktokChannelId||'',
        shopeeChannelName:m.shopeeChannelName||'',shopeeChannelId:m.shopeeChannelId||'',socialLink:m.socialLink||''})),
      videos:getVideoData(),bookings:safeArr(getStore(BOOK_KEY,[])),
      platformLinks:safeObj(getStore(LINK_KEY,{})),
      links:safeObj(getStore(LINK_KEY,{})),
      videoAssignments:safeObj(getStore(ASSIGN_KEY,{}))
    };
  }
  function portalSaveState(input){
    if(!can())throw Error("Bạn không có quyền cập nhật KOC");
    const curr=safeArr(getStore(BOOK_KEY,[])),existingIds=new Set(curr.map(b=>String(b.id)));
    const pending=safeArr(input?.newBookings).filter(b=>b&&!existingIds.has(String(b.id)));
    const updated=[...curr];
    for(const b of pending){
      const creator=V(b.creator),platform=V(b.platform),start=V(b.start);
      const channel=V(b.channel||b.channelName),cid=V(b.channelId),url=V(b.url||b.channelUrl),phone=V(b.phone);
      const cast=V(b.cast),fee=Number(b.castFee)||0,videos=Number(b.videos||b.videoCount)||0;
      if(!creator||!phone||!channel||!cid||!url||!start||!['tiktok','shopee'].includes(platform)||!['yes','no'].includes(cast))throw Error('Thiếu thông tin hợp tác bắt buộc');
      if(!url.match(/^https:\/\//i))throw Error('Link kênh cần dùng HTTPS');
      if(!Number.isInteger(videos)||videos<1)throw Error('Số video cam kết không hợp lệ');
      if(cast==='yes'&&(!(fee>0)||!b.cccdProvided))throw Error('Có cast phải chọn CCCD, phí và số video');
      const matches=masters().filter(m=>normalName(m.ten)===normalName(creator));
      if(matches.length>1)throw Error('Tên KOC trùng trong hồ sơ master, cần xác minh mã KOC trước khi lưu');
      let m=matches[0];
      if(!m){m={id:Date.now()+Math.random(),maKoc:_kocNextMa(),ten:creator};kocMstRows.push(m);}
      m.lienHe=phone;
      if(platform==='tiktok'){m.tiktokChannelName=channel;m.tiktokChannelId=cid;m.tiktokLink=url;if(!m.socialLink)m.socialLink=url;}
      if(platform==='shopee'){m.shopeeChannelName=channel;m.shopeeChannelId=cid;m.shopeeLink=url;}
      updated.push({id:String(b.id||('bk_'+Date.now())),maKoc:m.maKoc,creator,platform,phone,
        channelName:channel,channelId:cid,channelUrl:url,channel:channel,url:url,
        start,due:add20(start),cast,castFee:cast==='yes'?fee:0,
        videoCount:videos,videos,product:V(b.product),campaign:V(b.campaign),owner:V(b.owner),
        status:cast==='yes'?'Chờ xác minh CCCD':'Đã ghi nhận',contractStatus:cast==='yes'?'Chưa hoàn tất OCR':'Không yêu cầu',
        cccdFileStored:false,createdAt:new Date().toISOString()});
    }
    const links=safeObj(input?.platformLinks),ids=new Set(),revised={};
    for(const [key,link] of Object.entries(links)){
      const shopeeId=V(link.shopeeId);
      if(!shopeeId)continue;
      const unique=normalName(shopeeId);
      if(ids.has(unique))throw Error("Trùng ID Shopee trong danh sách liên kết");
      ids.add(unique);
      revised[key]={creator:V(link.creator),shopeeChannel:V(link.shopeeChannel),
        shopeeId,shopeeUrl:V(link.shopeeUrl),confirmed:link.confirmed===true,updatedAt:new Date().toISOString()};
      const matches=masters().filter(m=>normalName(m.ten)===normalName(link.creator));
      if(matches.length===1){const m=matches[0];m.shopeeChannelName=V(link.shopeeChannel);m.shopeeChannelId=shopeeId;m.shopeeLink=V(link.shopeeUrl);}
    }
    if(pending.length){setStore(BOOK_KEY,updated);}
    if(input?.platformLinks){setStore(LINK_KEY,revised);}
    if(input?.videoAssignments){setStore(ASSIGN_KEY,safeObj(input.videoAssignments));}
    if(pending.length||input?.platformLinks){_kocSaveAll();}
    return true;
  }
  window.KOC_PORTAL_BRIDGE={snapshot:portalSnapshot,saveState:portalSaveState};
  function portalRender(){
    const params=new URLSearchParams({view:ui.view,platform:ui.platform});
    return '<iframe title="Quản lý KOC Shopee TikTok" src="assets/koc-portal.html?v=20261104-5&'+params.toString()+
      '" style="display:block;width:100%;min-height:calc(100vh - 185px);height:calc(100vh - 145px);background:#f3f6fa;border:0;border-radius:12px"></iframe>';
  }

  window.MKTKOCNew={render:portalRender,open};
  window.kocNewOpen=open;
})();
