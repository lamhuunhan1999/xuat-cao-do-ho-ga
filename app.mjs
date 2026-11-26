import {makeZip} from './zip.mjs';
const $=id=>document.getElementById(id);
let file=null,worker=null,busy=false,report=null,tab='station',runId=0,urls=[];
const number=(v,d=0)=>v===null?'—':Number(v).toLocaleString('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d});
const status=s=>$('status').textContent=s;
function setBusy(v){busy=v;$('file').disabled=v;$('start').disabled=v||!file;$('stop').hidden=!v;$('progress').hidden=!v;}
function reset(){for(const u of urls)URL.revokeObjectURL(u);urls=[];report=null;$('empty').hidden=false;$('report').hidden=true;$('downloads').hidden=true;$('npoints').textContent=$('nstations').textContent=$('duration').textContent='—';}
function choose(f){if(busy||!f)return;reset();if(!/\.dwg$/i.test(f.name)||f.size>100*1024*1024||f.size<6){file=null;status('Chọn tệp DWG hợp lệ, không quá 100 MB.');setBusy(false);return;}file=f;$('filename').textContent=f.name;$('filehint').textContent=number(f.size/1024/1024,1)+' MB · bản vẽ không gửi lên máy chủ';status('Sẵn sàng đọc bản vẽ.');setBusy(false);}
$('file').addEventListener('change',e=>choose(e.target.files[0]));
for(const ev of ['dragover','dragleave','drop'])$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.toggle('drag',ev==='dragover');if(ev==='drop')choose(e.dataTransfer.files[0]);});
function stop(){runId++;worker?.terminate();worker=null;setBusy(false);status('Đã dừng. Bản vẽ gốc không bị thay đổi.');}
$('start').onclick=async()=>{
 if(!file||busy)return;reset();setBusy(true);const current=++runId;
 try{status('Đang đọc tệp trên thiết bị…');const bytes=await file.arrayBuffer();if(current!==runId)return;
  worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
  worker.onerror=e=>{if(current!==runId)return;worker?.terminate();worker=null;setBusy(false);status('Không khởi chạy được bộ đọc. Dùng Chrome/Edge mới và kiểm tra kết nối Internet.');};
  worker.onmessage=({data})=>{if(current!==runId)return;if(data.type==='progress'){status(data.stage);return;}worker?.terminate();worker=null;setBusy(false);
   if(data.type==='error'){status(data.error);return;}
   report=data.report;showReport(data.files);if(report.problems.length){status('Cần kiểm tra dữ liệu — chưa xuất CSV.');return;}
   status('Hoàn tất. Hãy kiểm tra dữ liệu trước khi sử dụng.');$('downloads').hidden=false;
   link('zip',makeZip(data.files),'KetQua_CSV.zip');link('pointcsv',data.files['CaoDo.csv'],'CaoDo.csv');link('stationcsv',data.files['Coc.csv'],'Coc.csv');link('check','\ufeff'+data.files['KiemTra.txt'],'KiemTra.txt');
  };worker.postMessage({bytes,name:file.name},[bytes]);
 }catch(e){worker?.terminate();worker=null;setBusy(false);status(e.message);}
};
$('stop').onclick=stop;
function makeURL(content){const u=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type:'text/plain;charset=utf-8'}));urls.push(u);return u;}
function link(id,content,name){$(id).href=makeURL(content);$(id).download=name;}
function showReport(files){
 $('empty').hidden=true;$('report').hidden=false;$('npoints').textContent=number(report.point_count);$('nstations').textContent=number(report.station_count);$('duration').textContent=number(report.elapsed_seconds,1)+' s';
 $('range').textContent='Lý trình: '+number(report.chainage_min,3)+' – '+number(report.chainage_max,3)+' m · Cao độ: '+number(report.elevation_min,3)+' – '+number(report.elevation_max,3)+' m';
 const errors=report.problems||[];$('problems').hidden=!errors.length;$('problems').replaceChildren();
 for(const e of errors.slice(0,30)){const p=document.createElement('p');p.textContent=(e.id?e.id+': ':'')+e.reason;$('problems').appendChild(p);}
 if(errors.length){const a=document.createElement('a');a.textContent='Tải báo cáo đầy đủ ('+errors.length+' lỗi)';a.href=makeURL(files['KiemTra.json']);a.download='KiemTra.json';$('problems').appendChild(a);}
 $('warnings').hidden=false;$('warning-text').replaceChildren();for(const s of report.warnings){const p=document.createElement('p');p.textContent=s;$('warning-text').appendChild(p);}if(report.decoder_flags)$('warnings').open=true;
 drawTable();
}
function drawTable(){
 if(!report)return;const headers=tab==='station'?['Tên cọc','Lý trình (m)','X','Y','NX','NY']:['Mã điểm','X','Y','Cao độ (m)'];
 const rows=tab==='station'?report.station_preview.map(p=>[p[1],number(p[0],3),number(p[2][0],3),number(p[2][1],3),number(p[3][0],6),number(p[3][1],6)]):report.point_preview.map(p=>[p[0],number(p[1],3),number(p[2],3),number(p[3],3)]);
 $('preview').replaceChildren();const head=document.createElement('thead'),tr=document.createElement('tr');for(const h of headers){const th=document.createElement('th');th.textContent=h;tr.appendChild(th);}head.appendChild(tr);$('preview').appendChild(head);
 const body=document.createElement('tbody');for(const row of rows){const tr=document.createElement('tr');for(const cell of row){const td=document.createElement('td');td.textContent=cell;tr.appendChild(td);}body.appendChild(tr);}$('preview').appendChild(body);
 $('tab-station').classList.toggle('active',tab==='station');$('tab-point').classList.toggle('active',tab==='point');
}
$('tab-station').onclick=()=>{tab='station';drawTable();};$('tab-point').onclick=()=>{tab='point';drawTable();};
$('exit').onclick=()=>{if(busy)stop();reset();status('Đã xóa kết quả khỏi trang. Bạn có thể chuyển tệp khác.');};
