/* HG DWG CSV browser engine. GPL-3.0-or-later. */
const KM=/^\s*Km\s*(\d+)\s*\+\s*(\d+(?:[.,]\d+)?)\s*$/i;
const utf8=new TextDecoder('utf-8'), ansi=new TextDecoder('windows-1252');
const finite=p=>Array.isArray(p)&&p.length>=3&&p.every(Number.isFinite);
const xyz=p=>[p.x,p.y,p.z||0];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const cadText=s=>s.replace(/\\U\+([0-9a-f]{4})/gi,(_,c)=>String.fromCharCode(parseInt(c,16)));
export function graphics(bytes){
 if(!bytes||bytes.length<8)throw Error('Thiếu đồ họa đại diện của đối tượng.');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let i=8;const circles=[],lines=[],texts=[];
 const pt=off=>[d.getFloat64(off,true),d.getFloat64(off+8,true),d.getFloat64(off+16,true)];
 while(i<bytes.length){
  if(i+8>bytes.length)throw Error('Đồ họa bị thiếu dữ liệu ở cuối.');
  const size=d.getUint32(i,true),code=d.getUint32(i+4,true);
  if(size<8||i+size>bytes.length)throw Error('Cấu trúc đồ họa chưa hỗ trợ.');
  if(code===2){if(size<64)throw Error('Bản ghi tâm điểm không đủ XYZ.');circles.push(pt(i+8));}
  else if(code===6&&size>=12&&d.getUint32(i+8,true)===2){if(size<60)throw Error('Vạch cọc không đầy đủ.');lines.push([pt(i+12),pt(i+36)]);}
  else if(code===11){if(size<81)throw Error('Chữ cọc không đầy đủ.');let b=bytes.subarray(i+80,i+size),zero=b.indexOf(0);if(zero>=0)b=b.subarray(0,zero);texts.push(cadText(ansi.decode(b)));}
  i+=size;
 }
 return {circles,lines,texts};
}
export function station(lines,texts,id){
 const unique=[];
 for(const [a,b] of lines){if(!finite(a)||!finite(b))throw Error('Tọa độ vạch cọc không hợp lệ.');if(!unique.some(([c,d])=>(distance(a,c)<1e-6&&distance(b,d)<1e-6)||(distance(a,d)<1e-6&&distance(b,c)<1e-6)))unique.push([a,b]);}
 const ts=[...new Set(texts.map(t=>t.trim()).filter(Boolean))],kms=ts.filter(t=>KM.test(t)),names=ts.filter(t=>!KM.test(t));
 if(unique.length!==1||kms.length!==1||names.length!==1)throw Error('Cần đúng 1 vạch cọc, 1 tên và 1 lý trình Km.');
 const [a,b]=unique[0],norm=Math.hypot(b[0]-a[0],b[1]-a[1]);if(norm<1e-8)throw Error('Vạch cọc có chiều dài bằng 0.');
 const [,km,m]=kms[0].match(KM),s=Number(km)*1000+Number(m.replace(',','.'));
 return [s,names[0]+' ['+kms[0]+']',[(a[0]+b[0])/2,(a[1]+b[1])/2,0],[(b[0]-a[0])/norm,(b[1]-a[1])/norm,0],id];
}
function decodedField(r){if(!r?.success)return null;if(r.bin instanceof Uint8Array)return cadText(ansi.decode(r.bin).replace(/\0+$/,''));return r.data;}
function isItemId(name){if(name==='ItemId')return true;/* v0.9.4 binding treats old ASCII APPID as UTF16 */return [...name].map(c=>String.fromCharCode(c.charCodeAt(0)&255,c.charCodeAt(0)>>8)).join('').replace(/\0+$/,'')==='ItemId';}
export function extractDrawing(m,data,error=0,progress=()=>{}){
 const classes=new Map();for(let i=0;i<m.dwg_get_num_classes(data);i++){const c=m.dwg_get_class(data,i);classes.set(c.num,c.dxfname.toUpperCase());}
 const points=[],poles=[],problems=[],groups=new Map(),unknown={};let pointCandidates=0,stationCandidates=0,seen=0,duplicates=0;
 const root=m.dwg_model_space_object(data);if(!root)throw Error('Không có Model space.');
 let obj=m.get_first_owned_entity(root);const visited=new Set();
 while(obj){
  if(visited.has(obj))throw Error('Danh sách đối tượng lặp bất thường.');visited.add(obj);seen++;
  const kind=m.dwg_object_get_dxfname(obj),cls=classes.get(m.dwg_object_get_type(obj))||'',id=m.dwg_obj_get_handle_value(obj).toString(16).toUpperCase();
  const isPoint=cls==='ACDBSTATIONPOINT1',isPole=cls==='ACDBPOLE';
  if(isPoint||isPole){
   isPoint?pointCandidates++:stationCandidates++;
   try{const raw=m.dwg_entity_get_preview(obj);if(!raw?.success)throw Error('Thiếu đồ họa đại diện ADS.');const {circles,lines,texts}=graphics(raw.data);
    if(isPoint){if(circles.length!==1||!finite(circles[0]))throw Error('Cần đúng 1 tâm điểm có XYZ hợp lệ.');points.push([id,...circles[0]]);}
    else poles.push(station(lines,texts,id));
   }catch(e){problems.push({id,type:cls,reason:e.message});}
  }else if(kind==='LINE'||kind==='TEXT'){
   const ent=m.dwg_object_to_entity(obj),lr=m.dwg_object_entity_get_layer_object_ref(ent),layer=lr?.obj?decodedField(m.dwg_dynapi_entity_value(m.dwg_object_to_object_tio(lr.obj),'name'))||'':'';
   if(/TK-DBO-110[4567]/i.test(layer)){
    const items=m.dwg_object_entity_get_xdata(ent).filter(x=>isItemId(x.appName)).flatMap(x=>x.value.filter(v=>v.code===1071).map(v=>String(v.value)));
    if(items.length!==1)problems.push({id,type:kind,reason:'Cọc đã tách thiếu ItemId để ghép đúng nhóm.'});
    else{const key=items[0],g=groups.get(key)||{lines:[],texts:[]};groups.set(key,g);const tio=m.dwg_object_to_entity_tio(obj);
     if(kind==='LINE'){const a=m.dwg_dynapi_entity_value(tio,'start'),b=m.dwg_dynapi_entity_value(tio,'end');if(a.success&&b.success)g.lines.push([xyz(a.data),xyz(b.data)]);else problems.push({id,reason:'Không đọc được hai đầu vạch cọc.'});}
     else{const val=decodedField(m.dwg_dynapi_entity_value(tio,'text_value'));if(typeof val==='string')g.texts.push(val);else problems.push({id,reason:'Không đọc được chữ cọc.'});}
    }
   }
  }else if(kind==='UNKNOWN_ENT')unknown[cls||'UNKNOWN']=(unknown[cls||'UNKNOWN']||0)+1;
  if(seen%2000===0)progress('Đã kiểm tra '+seen.toLocaleString('vi-VN')+' đối tượng…');
  obj=m.get_next_owned_entity(root,obj);
 }
 for(const [key,g]of groups){stationCandidates++;try{poles.push(station(g.lines,g.texts,'ItemId:'+key));}catch(e){problems.push({id:'ItemId:'+key,reason:e.message});}}
 poles.sort((a,b)=>a[0]-b[0]);const stations=[];
 for(const p of poles){const old=stations.at(-1);if(old&&Math.abs(p[0]-old[0])<1e-5){if(p[1]===old[1]&&distance(p[2],old[2])<1e-6&&Math.abs(Math.abs(p[3][0]*old[3][0]+p[3][1]*old[3][1])-1)<1e-8){duplicates++;continue;}problems.push({id:p[4],reason:'Trùng lý trình '+p[0]+' m ở các cọc khác nhau. Tách mỗi tuyến thành DWG riêng.'});}stations.push(p);}
 for(let i=0;i<stations.length;i++){const p=stations[i],a=stations[Math.max(0,i-1)][2],b=stations[Math.min(stations.length-1,i+1)][2],n=p[3],cross=(b[0]-a[0])*n[1]-(b[1]-a[1])*n[0];if(Math.abs(cross)<1e-9)problems.push({id:p[4],reason:'Không xác định được hướng trái/phải của cọc.'});else if(cross<0)p[3]=n.map(x=>-x);}
 if(!points.length)problems.push({reason:'Không đọc được điểm cao độ AcDbStationPoint1 trong Model.'});if(stations.length<2)problems.push({reason:'Cần ít nhất 2 cọc có đủ tọa độ, hướng và lý trình.'});
 if(Object.keys(unknown).length)problems.push({reason:'Có lớp đối tượng tùy biến chưa hỗ trợ: '+JSON.stringify(unknown)});
 const warnings=['Cao độ lấy từ XYZ của đồ họa ADS được lưu trong DWG. Đối chiếu vài cọc/điểm với hồ sơ trước khi dùng.'];
 if(error)warnings.push('Bộ đọc báo mã '+error+' (lớp tùy biến/giới hạn dữ liệu). Đã kiểm tra riêng từng bản ghi cọc và cao độ; không tự lấy số từ nhãn TEXT.');
 let zmin=Infinity,zmax=-Infinity;for(const p of points){zmin=Math.min(zmin,p[3]);zmax=Math.max(zmax,p[3]);}
 const report={tool_version:'2.0-web',point_count:points.length,station_count:stations.length,point_candidates:pointCandidates,station_candidates:stationCandidates,model_entities:seen,decoder_flags:error,exact_duplicate_stations_removed:duplicates,problems,warnings,chainage_min:stations[0]?.[0]??null,chainage_max:stations.at(-1)?.[0]??null,elevation_min:points.length?zmin:null,elevation_max:points.length?zmax:null,point_preview:points.slice(0,12),station_preview:stations.slice(0,12),scope:'Chỉ Model space; không đọc điểm/cọc trong block hoặc Xref. Mỗi DWG một tuyến. Giữ nguyên hệ tọa độ, đơn vị mét.'};
 return {points,stations,report};
}
const nameCSV=s=>s.replace(/[;\r\n]/g,' ').replace(/[^\x20-\x7e]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export function csvFiles(points,stations){return {
 'CaoDo.csv':'X;Y;Z;ID\n'+points.map(([h,x,y,z])=>`${x.toFixed(10)};${y.toFixed(10)};${z.toFixed(6)};${h}\n`).join(''),
 'Coc.csv':'S;NAME;X;Y;NX;NY\n'+stations.map(([s,name,p,n])=>`${s.toFixed(8)};${nameCSV(name)};${p[0].toFixed(10)};${p[1].toFixed(10)};${n[0].toFixed(14)};${n[1].toFixed(14)}\n`).join('')};}
