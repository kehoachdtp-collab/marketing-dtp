/* KOC Performance V2 - independent from legacy KOC records; no legacy data is overwritten. */
(function(){
  "use strict";
  var SNAP="mkt_sale_koc_tiktok_snapshots", LINKS="mkt_sale_koc_creator_links", DEC="mkt_sale_koc_decisions", RULES="mkt_sale_koc_rules";
  var ui={snapshotId:"",query:"",status:"all",busy:false};
  var defaults={minOrders:5,minRoas:2.5,minVideos:1};
  function arr(k){var v=getStore(k,[]);return Array.isArray(v)?v:[];}
  function html(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function n(v){if(typeof v==="number")return Number.isFinite(v)?v:0;var s=String(v==null?"":v).trim().replace(/[\s₫đ]/g,"");if(!s||s==="-")return 0;
    if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");
    else if(s.includes(","))s=s.replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");
    var x=Number(s);return Number.isFinite(x)?x:0;}
  function norm(v){return String(v==null?"":v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d").replace(/[^a-z0-9]/g,"");}
  function ident(v){return String(v==null?"":v).trim().normalize("NFKC").toLowerCase().replace(/\s+/g," ");}
  function money(v){return Math.round(v||0).toLocaleString("vi-VN")+"đ";}
  function integer(v){return Math.round(v||0).toLocaleString("vi-VN");}
  function htmlCurrency(v){return v>0?money(v):"—";}
  function rate(v){return Number.isFinite(v)?v.toFixed(2).replace(".",",")+"x":"—";}
  function getRules(){var v=getStore(RULES,{});return Object.assign({},defaults,v&&typeof v==="object"&&!Array.isArray(v)?v:{});}
  function canWrite(){return typeof canEditMod==="function"&&canEditMod("sale");}
  function statusBadge(status){var labels={priority:["Ứng viên book lại","green"],test:["Thử nghiệm thêm","amber"],hold:["Xem lại / tạm dừng","red"],none:["Chưa đủ dữ liệu","gray"]};var a=labels[status]||labels.none;return '<span class="kp-tag kp-'+a[1]+'">'+a[0]+"</span>";}
  function extractPeriod(fileName){
    var x=String(fileName||"").match(/(20\d{2})[-/](\d{2})[-/](\d{2})\s*[-–—]\s*(20\d{2})[-/](\d{2})[-/](\d{2})/);
    if(!x)return null;return [x[1]+"-"+x[2]+"-"+x[3],x[4]+"-"+x[5]+"-"+x[6]];
  }
  function getProduct(fileName){var x=String(fileName||"").match(/product[\s_-]*(\d+)/i);return x?x[1]:"";}
  function col(headers,possibilities){var names=headers.map(norm);for(var i=0;i<possibilities.length;i++){var idx=names.indexOf(norm(possibilities[i]));if(idx>=0)return idx;}return -1;}
  function parseExcel(wb){
    var best=null;
    wb.SheetNames.forEach(function(name){
      var data=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:"",raw:true});
      for(var head=0;head<Math.min(8,data.length);head++){
        var h=data[head].map(function(v){return String(v==null?"":v);});
        var ix={
          creator:col(h,["Tài khoản TikTok","TikTok Account","Creator","Nhà sáng tạo"]),
          video:col(h,["ID bài đăng","Post ID","Video ID"]),
          spent:col(h,["Chi phí","Cost","Ad Spend"]),
          gmv:col(h,["Doanh thu gộp","Gross Revenue","GMV"]),
          orders:col(h,["Số lượng đơn hàng SKU","SKU Orders","Orders","Số đơn hàng"]),
          impressions:col(h,["Số lượt hiển thị quảng cáo sản phẩm","Impressions"]),
          clicks:col(h,["Số lượt nhấp vào quảng cáo sản phẩm","Clicks"]),
          postDate:col(h,["Thời gian đăng","Publish Time"]),
          contentType:col(h,["Loại nội dung sáng tạo","Creative Type"]),
          content:col(h,["Mẫu quảng cáo","Creative","Content"])
        };
        if(ix.creator>=0&&ix.video>=0&&ix.gmv>=0&&ix.spent>=0&&ix.orders>=0){if(!best||data.length-head>best.count)best={data:data,head:head,idx:ix,count:data.length-head,sheet:name};}
      }
    });
    if(!best)throw Error("Không tìm thấy cột Tài khoản TikTok / ID bài đăng / Chi phí / Doanh thu gộp / Số lượng đơn hàng SKU.");
    var seen={},result=[],ignored=0,ignoredSpend=0,ignoredGmv=0;
    for(var j=best.head+1;j<best.data.length;j++){
      var row=best.data[j],ix=best.idx;
      if(!row||!row.length)continue;
      var creator=String(row[ix.creator]||"").trim();
      var vid=String(row[ix.video]||"").trim(),type=ix.contentType>=0?String(row[ix.contentType]||""):"";
      if(!creator||creator==="-"||creator.toUpperCase()==="N/A"||!vid||vid==="-"
          ||vid.toUpperCase()==="N/A"||(type&&norm(type).indexOf("video")<0)){
        ignored++;ignoredSpend+=n(row[ix.spent]);ignoredGmv+=n(row[ix.gmv]);continue;
      }
      var key=ident(creator)+"|"+vid+"|"+j;
      if(seen[key])continue;seen[key]=true;
      result.push({id:vid,creator:creator,posted:ix.postDate>=0?String(row[ix.postDate]||""):"",
        spent:n(row[ix.spent]),gmv:n(row[ix.gmv]),orders:n(row[ix.orders]),
        impressions:ix.impressions>=0?n(row[ix.impressions]):0,clicks:ix.clicks>=0?n(row[ix.clicks]):0});
    }
    if(!result.length)throw Error("Không tìm thấy dữ liệu video KOC hợp lệ.");
    return {rows:result,ignored:ignored,ignoredSpend:ignoredSpend,ignoredGmv:ignoredGmv,sheet:best.sheet};
  }
  async function importFile(file){
    if(!file||ui.busy||!canWrite())return;
    if(file.size>15*1024*1024){toast("File quá lớn (tối đa 15MB).");return;}
    ui.busy=true;
    try{
      await ensureXlsxLoaded();
      var bytes=await file.arrayBuffer(),wb=XLSX.read(bytes,{type:"array",cellDates:false});
      var parsed=parseExcel(wb),dates=extractPeriod(file.name);
      var start=(document.getElementById("kp-start")||{}).value||"",end=(document.getElementById("kp-end")||{}).value||"";
      if(dates){start=dates[0];end=dates[1];}
      if(!start||!end||start>end)throw Error("Hãy điền kỳ báo cáo bắt đầu/kết thúc theo định dạng ngày.");
      var productId=getProduct(file.name)||"Chưa rõ mã SP",key=start+"|"+end+"|"+productId;
      var list=arr(SNAP);
      if(list.some(function(s){return s.key===key;}))throw Error("Đã có dữ liệu kỳ "+start+" → "+end+" cho sản phẩm "+productId+". Không nhập lặp để tránh trùng doanh thu.");
      var snap={id:"tk_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),key:key,start:start,end:end,
        productId:productId,fileName:file.name,importedAt:new Date().toISOString(),rows:parsed.rows,
        ignored:parsed.ignored,ignoredSpend:parsed.ignoredSpend,ignoredGmv:parsed.ignoredGmv};
      list.push(snap);
      setStore(SNAP,list);ui.snapshotId=snap.id;ui.query="";ui.status="all";
      toast("Đã lưu "+parsed.rows.length+" dòng KOC; "+parsed.ignored+" dòng không gán KOC đã tách riêng.");
      saleRerender();
    }catch(e){toast("Không nhập được báo cáo: "+(e&&e.message||e));}
    finally{ui.busy=false;var el=document.getElementById("kp-file");if(el)el.value="";}
  }
  function snapshots(){return arr(SNAP).sort(function(a,b){return String(b.end||"").localeCompare(String(a.end||""))||String(b.importedAt||"").localeCompare(String(a.importedAt||""));});}
  function activeSnapshot(){var all=snapshots();return all.find(function(s){return s.id===ui.snapshotId;})||all[0]||null;}
  function getLink(creator){var id=ident(creator),map=arr(LINKS).find(function(o){return o.id===id;});return map?map.maKoc:"";}
  function masterByCode(code){return (typeof kocMstRows!=="undefined"?kocMstRows:[]).find(function(r){return r.maKoc===code;});}
  function bookingsFor(code){
    if(!code||typeof kocProdRows==="undefined")return[];
    return kocProdRows.filter(function(r){return r.maKoc===code;});
  }
  function aggregate(snap){
    var m=new Map(),total={gmv:0,spent:0,orders:0,impressions:0,clicks:0,videos:new Set()};
    (snap.rows||[]).forEach(function(v){
      var key=ident(v.creator);if(!m.has(key))m.set(key,{key:key,creator:v.creator,gmv:0,spent:0,orders:0,impressions:0,clicks:0,videos:new Set()});
      var a=m.get(key);["gmv","spent","orders","impressions","clicks"].forEach(function(k){a[k]+=n(v[k]);total[k]+=n(v[k]);});
      a.videos.add(String(v.id));total.videos.add(String(v.id));
    });
    var rows=Array.from(m.values()).map(function(v){
      v.videos=v.videos.size;v.roas=v.spent>0?v.gmv/v.spent:null;
      v.code=getLink(v.creator);
      v.bookings=bookingsFor(v.code);
      v.bookingSpent=v.bookings.reduce(function(sum,x){return sum+n(x.chiPhiBooking);},0);
      var rules=getRules();
      if(v.orders===0&&v.spent>0)v.reco="hold";
      else if(v.spent<=0||v.orders===0)v.reco="none";
      else if(v.orders<rules.minOrders||v.videos<rules.minVideos)v.reco="test";
      else if(v.roas>=rules.minRoas)v.reco="priority";
      else v.reco="hold";
      return v;
    }).sort(function(a,b){return b.gmv-a.gmv;});
    total.videos=total.videos.size;
    return {rows:rows,total:total};
  }
  function getDecision(snap,creator){var key=snap.id+"|"+ident(creator);return arr(DEC).find(function(d){return d.id===key;})||null;}
  function setDecision(snapId,creator,status){
    if(!canWrite())return;var all=arr(DEC),id=snapId+"|"+ident(creator),idx=all.findIndex(function(v){return v.id===id;});
    var item={id:id,snapshotId:snapId,creator:creator,status:status,updatedAt:new Date().toISOString(),
      reviewedBy:(typeof demoCurrentUser==="function"&&demoCurrentUser()?demoCurrentUser().username:"")||""};
    if(idx>=0)all[idx]=item;else all.push(item);
    setStore(DEC,all);refreshTable();toast("Đã lưu quyết định KOC");
  }
  function linkCreator(creator){
    if(!canWrite())return;
    var code=prompt("Nhập mã KOC master (ví dụ KOC001) cho tài khoản:\n"+creator+"\nĐể trống để bỏ liên kết.",getLink(creator));if(code===null)return;
    code=code.trim().toUpperCase();
    if(code&&!masterByCode(code)){toast("Không tìm thấy mã trong Danh sách KOC. Hãy kiểm tra lại.");return;}
    var all=arr(LINKS),id=ident(creator);all=all.filter(function(v){return v.id!==id;});
    if(code)all.push({id:id,creator:creator,maKoc:code,updatedAt:new Date().toISOString()});
    setStore(LINKS,all);refreshTable();toast(code?"Đã liên kết "+creator+" → "+code:"Đã bỏ liên kết");
  }
  function rulesSave(){
    if(!canWrite())return;
    function v(id,fallback){var x=Number((document.getElementById(id)||{}).value);return Number.isFinite(x)&&x>0?x:fallback;}
    setStore(RULES,{minOrders:Math.floor(v("kp-min-orders",5)),minRoas:v("kp-min-roas",2.5),minVideos:Math.floor(v("kp-min-videos",1))});
    refreshTable();toast("Đã cập nhật ngưỡng đánh giá");
  }
  function changeSnapshot(v){ui.snapshotId=v;ui.status="all";ui.query="";saleRerender();}
  function changeStatus(v){ui.status=v;refreshTable();}
  function search(v){ui.query=v;refreshTable();}
  function refreshTable(){
    var box=document.getElementById("kp-data");
    if(box)box.innerHTML=renderData();
  }
  function renderData(){
    var snap=activeSnapshot();if(!snap)return '<div class="kp-empty">Chưa có kỳ dữ liệu. Tải file Creative Data từ TikTok để bắt đầu.</div>';
    var report=aggregate(snap),total=report.total,rows=report.rows;
    var filter=ident(ui.query),filtered=rows.filter(function(r){
      if(ui.status!=="all"&&r.reco!==ui.status)return false;
      return !filter||ident(r.creator).includes(filter)||ident(r.code).includes(filter);
    });
    var cards='<div class="kp-stats">'+[
      ["Tài khoản KOC",integer(rows.length)],["Video",integer(total.videos)],
      ["Đơn SKU",integer(total.orders)],["Doanh thu gộp",money(total.gmv)],
      ["Chi phí quảng cáo",money(total.spent)],["ROAS Ads",total.spent>0?rate(total.gmv/total.spent):"—"]
    ].map(function(c){return '<div class="kp-stat"><small>'+c[0]+'</small><b>'+c[1]+'</b></div>';}).join("")+"</div>";
    var tbody=filtered.slice(0,300).map(function(r,i){
      var dec=getDecision(snap,r.creator),code=r.code||"",booked=r.bookingSpent>0?money(r.bookingSpent):"—",rnk=i+1;
      var options=[["","Chưa duyệt"],["book","Duyệt book lại"],["watch","Theo dõi thêm"],["stop","Tạm dừng"]].map(function(o){
        return '<option value="'+o[0]+'"'+(dec&&dec.status===o[0]?' selected':'')+'>'+o[1]+"</option>";
      }).join("");
      return '<tr><td>'+rnk+'</td><td><strong>'+html(r.creator)+'</strong><div class="kp-muted">'+
        (code?html(code)+" · "+html((masterByCode(code)||{}).ten||""):'Chưa ghép KOC master')+'</div>'+
        (canWrite()?'<button class="kp-link" onclick="kocPerformanceV2.linkCreator('+JSON.stringify(r.creator).replace(/</g,"\\u003c").replace(/'/g,"\\u0027")+')">'+(code?"Đổi liên kết":"Ghép KOC")+'</button>':"")+
        '</td><td class="kp-num">'+integer(r.videos)+'</td><td class="kp-num">'+money(r.spent)+'</td>'+
        '<td class="kp-num">'+integer(r.orders)+'</td><td class="kp-num"><b>'+money(r.gmv)+'</b></td>'+
        '<td class="kp-num">'+rate(r.roas)+'</td><td class="kp-num">'+booked+
        '<div class="kp-muted">Tổng booking cũ *</div></td><td>'+statusBadge(r.reco)+'</td><td>'+
        (canWrite()?'<select class="kp-select" onchange="kocPerformanceV2.setDecision('+JSON.stringify(snap.id)+','+JSON.stringify(r.creator).replace(/</g,"\\u003c").replace(/'/g,"\\u0027")+',this.value)">'+options+'</select>':
        html(dec&&dec.status||"—"))+'</td></tr>';
    }).join("");
    var note='<div class="kp-note">* Chi phí booking lấy từ lịch sử KOC master, <b>không phân bổ theo kỳ</b>. ROAS chỉ tính <b>doanh thu gộp / chi phí quảng cáo</b>, không phải lợi nhuận. Gợi ý book lại là sàng lọc sơ bộ; cần kiểm tra phí booking, hoa hồng, giá vốn, mức độ phù hợp sản phẩm và số đơn trước khi duyệt.</div>';
    return cards+'<div class="kp-toolbar"><input type="search" id="kp-search" placeholder="Tìm KOC hoặc mã..." value="'+html(ui.query)+'" oninput="kocPerformanceV2.search(this.value)">'+
      '<select onchange="kocPerformanceV2.changeStatus(this.value)" class="kp-select">'+[
      ["all","Tất cả đánh giá"],["priority","Ứng viên book lại"],["test","Thử nghiệm thêm"],["hold","Xem lại / tạm dừng"],["none","Chưa đủ dữ liệu"]
    ].map(function(o){return '<option value="'+o[0]+'"'+(ui.status===o[0]?' selected':'')+'>'+o[1]+"</option>";}).join("")+'</select>'+
    '<span class="kp-muted">'+filtered.length+' / '+rows.length+' KOC</span></div>'+
    '<div class="kp-tbl-wrap"><table class="kp-table"><thead><tr><th>#</th><th>Tài khoản TikTok / KOC master</th><th>Video</th><th>CP Ads</th><th>Đơn</th><th>GMV</th><th>ROAS Ads</th><th>Booking</th><th>Gợi ý</th><th>Quyết định</th></tr></thead><tbody>'+tbody+'</tbody></table></div>'+
    '<div class="kp-muted">Không gán được KOC: '+integer(snap.ignored||0)+' dòng; CP Ads '+money(snap.ignoredSpend||0)+', GMV '+money(snap.ignoredGmv||0)+' (không đưa vào xếp hạng).</div>'+note;
  }
  function render(){
    if(typeof canViewMod==="function"&&!canViewMod("sale"))return '<div>Không có quyền xem.</div>';
    var all=snapshots(),s=activeSnapshot(),rules=getRules(),can=canWrite();
    var choices=all.map(function(x){return '<option value="'+html(x.id)+'"'+(s&&s.id===x.id?' selected':'')+'>'+html(x.start+" → "+x.end+" | SP: "+x.productId+" | "+x.fileName)+'</option>';}).join("");
    return '<div class="kp-wrap"><div class="kp-top"><div><h2>📊 Đánh giá hiệu quả & Book lại KOC</h2><p>Đối chiếu dữ liệu TikTok với danh sách và chi phí booking hiện có, lưu từng kỳ trên Supabase.</p></div>'+
      (can?'<button class="btn btn-primary" onclick="switchKocTab(\'prod\')">＋ Quản lý lượt booking</button>':"")+'</div>'+
      '<div class="kp-panel"><div class="kp-panel-title">📥 Nhập báo cáo TikTok Creative Data</div>'+
      '<div class="kp-upload"><label>Kỳ bắt đầu <input id="kp-start" type="date"></label><label>Kỳ kết thúc <input id="kp-end" type="date"></label>'+
      (can?'<label class="kp-uploadbtn">Chọn file .xlsx / .csv<input id="kp-file" type="file" accept=".xlsx,.xls,.csv" onchange="kocPerformanceV2.importFile(this.files[0])" hidden></label>':'<span class="kp-muted">Bạn không có quyền nhập dữ liệu</span>')+
      '</div><div class="kp-muted">Tên file dạng “Creative data 2026-10-27 - 2026-11-03 - Product ...xlsx” sẽ tự nhận kỳ và mã sản phẩm. Nhập trùng kỳ + sản phẩm sẽ bị chặn.</div></div>'+
      '<div class="kp-panel"><div class="kp-panel-title">📅 Kỳ báo cáo & ngưỡng sàng lọc</div><div class="kp-upload">'+
      '<label>Báo cáo <select class="kp-select kp-period" onchange="kocPerformanceV2.changeSnapshot(this.value)">'+
      (all.length?choices:'<option>Chưa có dữ liệu</option>')+'</select></label>'+
      '<label>Đơn tối thiểu <input id="kp-min-orders" type="number" min="1" value="'+html(rules.minOrders)+'"'+(can?"":" disabled")+'></label>'+
      '<label>ROAS tối thiểu <input id="kp-min-roas" type="number" min="0.1" step="0.1" value="'+html(rules.minRoas)+'"'+(can?"":" disabled")+'></label>'+
      '<label>Video tối thiểu <input id="kp-min-videos" type="number" min="1" value="'+html(rules.minVideos)+'"'+(can?"":" disabled")+'></label>'+
      (can?'<button class="btn" onclick="kocPerformanceV2.rulesSave()">Lưu ngưỡng</button>':"")+
      '</div></div><div class="kp-panel" id="kp-data">'+renderData()+'</div></div>';
  }
  var style=document.createElement("style");style.textContent=".kp-wrap{display:flex;flex-direction:column;gap:16px}.kp-top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}.kp-top h2{color:#1e2e4a;font-size:20px;margin:0 0 6px}.kp-top p,.kp-muted{font-size:12px;color:#64748b;line-height:1.6}.kp-panel{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px;min-width:0}.kp-panel-title{font-size:14px;font-weight:800;color:#1e2e4a;margin-bottom:14px}.kp-upload{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:9px}.kp-upload label{font-size:12px;font-weight:700;color:#475569;display:flex;flex-direction:column;gap:6px}.kp-upload input,.kp-upload select,.kp-toolbar input,.kp-select{border:1px solid #cbd5e1;background:white;border-radius:8px;padding:9px;color:#1e293b;font-size:12px}.kp-uploadbtn{padding:11px 15px;border-radius:8px!important;color:white!important;background:#2563eb;cursor:pointer}.kp-period{max-width:480px}.kp-stats{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px;margin-bottom:16px}.kp-stat{padding:13px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;display:flex;flex-direction:column;gap:7px}.kp-stat small{font-size:11px;color:#64748b}.kp-stat b{color:#172a4a;font-size:17px;white-space:nowrap}.kp-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.kp-toolbar input{min-width:240px}.kp-tbl-wrap{overflow-x:auto}.kp-table{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}.kp-table th{text-align:left;padding:11px;background:#eef2f7;color:#334155;border-bottom:1px solid #cbd5e1}.kp-table td{padding:10px;border-bottom:1px solid #edf2f7;vertical-align:top}.kp-table tbody tr:hover{background:#f8fafc}.kp-num{text-align:right;font-variant-numeric:tabular-nums}.kp-note{background:#f8fafc;border-radius:9px;padding:10px 12px;color:#475569;font-size:12px;line-height:1.6;margin-top:12px}.kp-tag{border-radius:99px;padding:5px 9px;font-size:11px;font-weight:750;display:inline-block}.kp-green{background:#dcfce7;color:#166534}.kp-amber{background:#fef3c7;color:#92400e}.kp-red{background:#fee2e2;color:#991b1b}.kp-gray{background:#e2e8f0;color:#475569}.kp-link{border:0;background:none;color:#2563eb;cursor:pointer;font-size:11px;padding:3px 0}.kp-empty{padding:30px;color:#64748b;text-align:center}@media(max-width:1350px){.kp-stats{grid-template-columns:repeat(3,minmax(120px,1fr))}}@media(max-width:740px){.kp-stats{grid-template-columns:repeat(2,minmax(120px,1fr))}.kp-top h2{font-size:17px}.kp-period{max-width:250px}}";
  document.head.appendChild(style);
  window.kocPerformanceV2={render:render,importFile:importFile,changeSnapshot:changeSnapshot,changeStatus:changeStatus,search:search,
    setDecision:setDecision,linkCreator:linkCreator,rulesSave:rulesSave,parseExcel:parseExcel,aggregate:aggregate,extractPeriod:extractPeriod};
})();
