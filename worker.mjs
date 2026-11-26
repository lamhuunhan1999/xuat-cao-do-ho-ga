import createModule from './vendor/libredwg-web.js';
import {extractDrawing,csvFiles} from './engine.mjs';
const SHA='f77e9aa5590390100bb72ee65ef2f4483b98ad6798c49dab69897f7282e02505';
const URLS=['https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@0.9.4/wasm/libredwg-web.wasm','https://unpkg.com/@mlightcad/libredwg-web@0.9.4/wasm/libredwg-web.wasm'];
const hex=a=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
const progress=stage=>postMessage({type:'progress',stage});
async function loadWasm(){
 for(const url of URLS){try{const r=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('HTTP '+r.status);const b=await r.arrayBuffer();if(hex(await crypto.subtle.digest('SHA-256',b))!==SHA)throw Error('Bộ đọc không khớp mã kiểm tra.');return new Uint8Array(b);}catch(e){progress('Đang thử nguồn tải bộ đọc dự phòng…');}}
 throw Error('Không tải được bộ đọc DWG. Kiểm tra kết nối Internet rồi thử lại. Bản vẽ chưa được gửi đi.');
}
self.onmessage=async({data:{bytes,name}})=>{
 let m=null,ptr=0;const started=performance.now();
 try{
  if(new TextDecoder().decode(new Uint8Array(bytes,0,Math.min(bytes.byteLength,6))).slice(0,4)!=='AC10')throw Error('Tệp không có chữ ký DWG hợp lệ. Không đổi đuôi NTD/DXF thành DWG.');
  progress('Đang tải bộ đọc DWG (~7,5 MB, lần đầu cần Internet)…');
  m=await createModule({wasmBinary:await loadWasm(),print:()=>{},printErr:()=>{}});
  progress('Đang giải mã DWG trong trình duyệt…');
  m.FS.writeFile('/input.dwg',new Uint8Array(bytes));const r=m.dwg_read_file('/input.dwg');ptr=r.data;
  // LibreDWG flags >=128 are critical; allow only unhandled custom classes and
  // value-range warnings after validating every extracted ADS preview record.
  if(!ptr||(r.error&~(4|64)))throw Error('Bộ đọc báo lỗi '+r.error+'. Chưa xuất CSV để tránh thiếu dữ liệu.');
  progress('Đang kiểm tra cọc và cao độ…');const {points,stations,report}=extractDrawing(m,ptr,r.error,progress);
  report.file=name;report.source_sha256=hex(await crypto.subtle.digest('SHA-256',bytes));report.elapsed_seconds=Math.round((performance.now()-started)/10)/100;
  const files=report.problems.length?{}:csvFiles(points,stations);
  files['KiemTra.json']=JSON.stringify(report,null,2);
  files['KiemTra.txt']='HG DWG → CSV 2.0 Web\nTệp: '+name+'\nĐiểm: '+report.point_count+'\nCọc: '+report.station_count+'\n'+report.scope+'\n\n'+report.warnings.join('\n')+'\n\n'+report.problems.map(p=>(p.id||'')+' '+p.reason).join('\n');
  postMessage({type:'result',report,files});
 }catch(e){postMessage({type:'error',error:e.message||String(e)});}
 finally{if(m&&ptr)m.dwg_free(ptr);if(m)try{m.FS.unlink('/input.dwg');}catch{}}
};
