const $=i=>document.getElementById(i);
const fmt=(n,d=1)=>n==null?'–':n.toLocaleString('id-ID',{maximumFractionDigits:d,minimumFractionDigits:d});
const esc=s=>String(s==null?'–':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const JK='#e8590c',OT='#0b7a8a',MX='#7048b8',G0='#8d9ba3';
const prog=p=>p>=100?'#2eaa5c':p>=50?'#2f7fe0':p>0?'#f0a020':G0;
const st=p=>p>=100?'selesai':p>0?'berjalan':'belum';
const pc=p=>p.progress_pct||0;
const dep=(g,i)=>g==null||i==null?null:g-i;   // kedalaman = GL - invert (berlaku untuk invert negatif maupun positif)
const lowIE=p=>{const a=[p.elev_downstream,p.elev_upstream_1,p.elev_upstream_2,p.elev_upstream_3].filter(v=>v!=null);return a.length?Math.min(...a):null};

const REF=new Set(['MHJ_06_02_0150','MH-0282']);
const isRef=p=>REF.has(p.manhole_id)||p.is_reference===true||p.is_reference==='true';
let PIPES,MH,IDX=[],hits=[],sel=-1,hl=null,cMode='method';
const mm=new Map(),byId=new Map(),f={zone:'',cls:'',st:''},off=new Set();
/* ===== PENGATURAN ===== */
const HI_MINZ=18;   // house inlet (SR/HI/HIP) baru tampil mulai zoom ini. Naikkan bila masih padat, turunkan bila ingin lebih cepat muncul.
/* ======================= */
const map=L.map('map',{preferCanvas:true,zoomControl:false,maxZoom:28,zoomSnap:.5,zoomDelta:.5,wheelPxPerZoomLevel:90,renderer:L.canvas({tolerance:5})});L.control.zoom({position:'topright'}).addTo(map);
const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:28,maxNativeZoom:19,attribution:'© OpenStreetMap'});
const carto=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:28,maxNativeZoom:20,attribution:'© OpenStreetMap, © CARTO'});
const esri=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:28,maxNativeZoom:19,attribution:'Tiles © Esri'});
const gP=L.featureGroup().addTo(map),gM=L.featureGroup().addTo(map);
/* Urutan tumpuk (bawah ke atas): Poligon (zona, RW) > Polyline (persil, collecting) > Line (pipa lateral) > Point (house inlet, inspection chamber, manhole) */
map.createPane('pz').style.zIndex=300;map.createPane('pm').style.zIndex=645;
['pz','pm'].forEach(n=>map.getPane(n).style.pointerEvents='none');
const HM=L.CircleMarker.extend({_clickTolerance(){return this.options.hit||0}});   // area klik titik dibuat lebih lebar dari gambarnya
const cm=(ll,o)=>new HM(ll,o);
const HIS=new Set(['sr','hic','hip']);
function restack(){[SL.persil,SL.collect,gP,SL.hip,SL.hic,SL.sr,SL.ic,gM].forEach(g=>{if(map.hasLayer(g))g.bringToFront()})}
const SL={zona:L.featureGroup(),rw:L.featureGroup(),collect:L.featureGroup(),persil:L.featureGroup(),ic:L.featureGroup(),hip:L.featureGroup(),hic:L.featureGroup(),sr:L.featureGroup()},sById=new Map(),vis={pipe:true,mh:true,collect:false,persil:false,ic:false,hip:true,hic:true,sr:true,zona:true,rw:false},have={};
L.DomEvent.disableClickPropagation($('lg'));
const mmeth=id=>{const s=mm.get(id);return !s?null:s.size>1?'Campuran':[...s][0]};
const colP=p=>cMode==='progress'?prog(p.progress_pct):p.method==='Jacking'?JK:OT;
const colM=p=>{if(cMode==='progress')return prog(p.progress_pct);const m=mmeth(p.manhole_id);return m==='Jacking'?JK:m==='Open Trench'?OT:m==='Campuran'?MX:G0};
const row=(a,b)=>b==null||b===''?'':'<tr><th>'+a+'</th><td>'+b+'</td></tr>';
const m3=v=>v==null?null:fmt(v,3)+' m';
const progRows=p=>'<h4>Progres</h4><table>'+('work_stage' in p?row('Status',esc(p.stage_label))+row('Pekerjaan',esc(p.work_stage||'–')):row('Tahap',esc(p.stage_label)))+row('Progres',fmt(pc(p),0)+'%')+row('Rencana',p.plan_date)+row('Mulai kerja',p.actual_date)+'</table>';
function popP(p){return '<div class="pp"><h3>'+esc(p.pipe_id)+'</h3><p class="sub">'+esc(p.pipe_type)+', '+esc(p.method)+', '+esc(p.material)+', Ø'+fmt(p.diameter_mm,0)+' mm</p><table>'+
 row('Dari manhole',esc(p.from_mh))+row('Ke manhole',esc(p.to_mh))+row('Panjang',p.length_m==null?null:fmt(p.length_m,2)+' m')+row('Slope',p.slope_pct==null?null:fmt(p.slope_pct,2)+' %')+row('Lokasi',esc(p.location_name))+row('Zona',p.zone)+
 '</table><h4>Ujung hulu</h4><table>'+row('Muka tanah (GL)',m3(p.up_gl))+row('Invert',m3(p.up_ie))+row('Kedalaman (GL − invert)',m3(dep(p.up_gl,p.up_ie)))+
 '</table><h4>Ujung hilir</h4><table>'+row('Muka tanah (GL)',m3(p.lw_gl))+row('Invert',m3(p.lw_ie))+row('Kedalaman (GL − invert)',m3(dep(p.lw_gl,p.lw_ie)))+row('Drop',m3(p.drop_m))+'</table>'+progRows(p)+'</div>'}
function popM(p){if(isRef(p))return '<div class="pp"><h3>'+esc(p.manhole_id)+'</h3><p class="sub">Manhole paket sebelah (CWIS 02), hanya referensi posisi</p></div>';
 return '<div class="pp"><h3>'+esc(p.manhole_id)+'</h3><p class="sub">'+esc(p.mh_type)+(p.shaft?', shaft '+esc(p.shaft):'')+', Ø'+fmt(p.diameter_mm,0)+' mm</p><table>'+
 row('Lokasi',esc(p.location_name))+row('Zona',p.zone)+row('Metode pipa',mmeth(p.manhole_id))+
 '</table><h4>Elevasi</h4><table>'+row('Muka tanah (GL)',m3(p.ground_elev))+row('Invert hulu 1',m3(p.elev_upstream_1))+row('Invert hulu 2',m3(p.elev_upstream_2))+row('Invert hulu 3',m3(p.elev_upstream_3))+row('Invert hilir',m3(p.elev_downstream))+
 '</table><h4>Kedalaman (GL − invert)</h4><table>'+row('Ke invert terdalam',m3(dep(p.ground_elev,lowIE(p))))+row('Ke invert hilir',m3(dep(p.ground_elev,p.elev_downstream)))+'</table>'+progRows(p)+'</div>'}
const okZ=p=>!f.zone||String(p.zone)===f.zone,okS=p=>!f.st||st(p.progress_pct)===f.st;
const okP=p=>okZ(p)&&okS(p)&&(!f.cls||p.pipe_type===f.cls)&&!off.has(p.method);
const okM=p=>{const s=mm.get(p.manhole_id);return okZ(p)&&okS(p)&&(!f.cls||p.mh_type===f.cls)&&(!s||[...s].some(m=>!off.has(m)))};
const bar=p=>'<div class="bar"><i style="width:'+Math.min(100,p)+'%"></i></div>';
function agg(list,kf){const g={};list.forEach(x=>{const p=x.properties,k=kf(p),l=p.length_m||0;(g[k]=g[k]||{n:0,l:0,d:0});g[k].n++;g[k].l+=l;g[k].d+=l*pc(p)/100});return g}
function legend(){$('lg').innerHTML=(cMode==='method'?['Jacking','Open Trench'].map(k=>'<button class="btn'+(off.has(k)?' x':'')+'" data-m="'+k+'" title="Klik untuk menyembunyikan atau menampilkan"><i class="sw" style="background:'+(k==='Jacking'?JK:OT)+'"></i>'+k+'</button>').join('')+'<div><i class="sw" style="background:'+MX+'"></i>Manhole di sambungan kedua metode</div>':
 [['Belum mulai',G0],['1–49%','#f0a020'],['50–99%','#2f7fe0'],['Selesai','#2eaa5c']].map(a=>'<div><i class="sw" style="background:'+a[1]+'"></i>'+a[0]+'</div>').join(''))+(have.sr||have.hic||have.hip?'<div style="margin-top:4px">House inlet</div>'+['sr','hic','hip'].map(k=>'<div><i class="sw" style="'+(k==='hip'?'background:transparent;border:2px solid '+HIC.hip:'background:'+HIC[k])+'"></i>'+HIL[k]+'</div>').join(''):'')+'<p class="sm">Tebal garis menunjukkan kelas pipa. Lingkaran putus-putus adalah manhole paket sebelah.</p>'}
function render(fit){
 gP.clearLayers();gM.clearLayers();byId.clear();
 const P=PIPES.features.filter(x=>okP(x.properties)),M=MH.features.filter(x=>okM(x.properties)),W={Primary:5,Secondary:3.5,Tertiary:2.5};
 if(vis.pipe)L.geoJSON({type:'FeatureCollection',features:P},{style:x=>({color:colP(x.properties),weight:W[x.properties.pipe_type]||3,opacity:.92}),onEachFeature:(x,l)=>{const p=x.properties,w=W[p.pipe_type]||3;byId.set(p.pipe_id,l);
  l.bindPopup(()=>popP(p),{maxWidth:340}).bindTooltip(p.pipe_id,{sticky:true});l.on({mouseover:()=>l.setStyle({weight:w+3}),mouseout:()=>l.setStyle({weight:w})})}}).addTo(gP);
 if(vis.mh)M.forEach(x=>{const p=x.properties,r=isRef(p);
  const mk=cm([x.geometry.coordinates[1],x.geometry.coordinates[0]],r?{hit:9,radius:6,color:G0,weight:2,dashArray:'2 2',fillOpacity:0}:{hit:9,radius:p.shaft?6:4,color:'#fff',weight:1.2,fillColor:colM(p),fillOpacity:1}).bindPopup(()=>popM(p),{maxWidth:340}).bindTooltip(p.manhole_id,{sticky:true}).addTo(gM);byId.set(p.manhole_id,mk)});
 const tot=P.reduce((s,x)=>s+(x.properties.length_m||0),0),dn=P.reduce((s,x)=>s+(x.properties.length_m||0)*pc(x.properties)/100,0),pct=tot?100*dn/tot:0,Mn=M.filter(x=>!isRef(x.properties));
 $('kPct').textContent=fmt(pct)+'%';$('kBar').style.width=pct+'%';$('kLen').textContent=fmt(tot/1000,2)+' km';$('kDone').textContent=fmt(dn/1000,2)+' km';$('kN').textContent=P.length;
 $('kMh').textContent=Mn.filter(x=>pc(x.properties)>=100).length+' / '+Mn.length;
 const z=agg(P,p=>p.zone==null?'-':String(p.zone));
 $('zones').innerHTML=Object.keys(z).sort((a,b)=>a-b).map(k=>{const v=z[k],q=v.l?100*v.d/v.l:0;return '<button class="zr'+(f.zone===k?' on':'')+'" data-z="'+k+'"><span>'+(k==='-'?'Tanpa zona':'Zona '+k)+'</span><span>'+fmt(v.l/1000,2)+' km</span><b>'+fmt(q)+'%</b>'+bar(q)+'</button>'}).join('')||'<p class="sm">Tidak ada data.</p>';
 const c=agg(P,p=>p.pipe_type+'|'+p.method);
 $('cls').innerHTML=Object.keys(c).sort().map(k=>{const v=c[k],[a,b]=k.split('|');return '<tr><td><i class="sw" style="background:'+(b==='Jacking'?JK:OT)+'"></i>'+esc(a)+', '+esc(b)+'</td><td>'+v.n+'</td><td>'+fmt(v.l/1000,2)+'</td><td>'+fmt(v.l?100*v.d/v.l:0)+'</td></tr>'}).join('');
 const bb=L.latLngBounds([]);[gP,gM].forEach(g=>g.getLayers().length&&bb.extend(g.getBounds()));if(fit&&bb.isValid())map.fitBounds(bb.pad(.06),{maxZoom:19});
 restack();
}
function resetFilters(){f.zone=f.cls=f.st='';off.clear();['fZone','fCls','fSt'].forEach(i=>$(i).value='');legend()}
const hay=p=>Object.values(p).filter(v=>v!=null&&v!=='').join(' ').toLowerCase();
const subt=i=>{const p=i.f.properties;if(i.t!=='p'&&i.t!=='m')return [p.hi_code||p.ic_type,p.zone_no==null?null:'zona '+p.zone_no,p.rw_label].filter(Boolean).join(', ');return i.t==='p'?p.method+', '+p.pipe_type+', Ø'+fmt(p.diameter_mm,0)+', '+fmt(p.length_m,1)+' m, zona '+p.zone:(isRef(p)?'Paket sebelah':(p.mh_type||'')+(p.shaft?', shaft '+p.shaft:'')+', zona '+p.zone)};
function draw(){const sh=hits.slice(0,8),q=$('q').value.trim();
 $('res').innerHTML=sh.map((i,k)=>'<li role="option" data-i="'+k+'" class="'+(k===sel?'on':'')+'"><b>'+esc(i.id)+'</b><small>'+esc((KIND[i.t]||'')+': '+subt(i))+'</small></li>').join('');
 $('rc').textContent=q?(hits.length?hits.length+' hasil'+(hits.length>8?', 8 teratas ditampilkan':''):'Tidak ada hasil'):'Tekan / untuk mencari. Pencarian mencakup semua atribut.'}
function search(v){const q=v.trim().toLowerCase();sel=-1;if(!q){hits=[];clearHl();return draw()}
 const t=q.split(/\s+/),r=i=>{const d=i.id.toLowerCase();return d.startsWith(q)?0:d.includes(q)?1:2};
 hits=IDX.filter(i=>t.every(w=>i.h.includes(w))).sort((a,b)=>r(a)-r(b));draw()}
function go(i){$('q').value=i.id;hits=[];draw();if(mob()){sh(0);$('q').blur()}const gk=i.g||i.t,isS=sById.has(i.id);if(isS&&!map.hasLayer(SL[gk])){vis[gk]=true;lyDraw();SL[gk].addTo(map);restack()}if(!isS&&!byId.has(i.id)){resetFilters();render(false)}
 const l=byId.get(i.id)||sById.get(i.id);if(!l)return;clearHl();seek=true;setTimeout(()=>{seek=false},2500);
 hl=L.geoJSON(i.f,{interactive:false,style:{color:'#ffd43b',weight:12,opacity:.7},pointToLayer:(x,ll)=>L.circleMarker(ll,{interactive:false,radius:14,color:'#ffd43b',weight:5,fillOpacity:0})}).addTo(map);hl.eachLayer(x=>x.bringToBack());
 if(i.t==='p'||i.t==='collect'||i.t==='persil'){map.fitBounds(l.getBounds().pad(.6),{maxZoom:19});setTimeout(()=>l.openPopup(l.getBounds().getCenter()),350)}
 else{map.flyTo(l.getLatLng(),Math.max(map.getZoom(),19),{duration:.6});setTimeout(()=>l.openPopup(),700)}}
let seek=false;const clearHl=()=>{if(hl){map.removeLayer(hl);hl=null}};
map.on('popupopen',()=>{seek=false});map.on('popupclose',()=>{if(!seek)clearHl()});map.on('click',clearHl);
$('tg').onclick=()=>{document.body.classList.toggle('min');setTimeout(()=>map.invalidateSize(),150)};
$('th').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('th',t)}catch(e){}};
const BASES={osm:osm,carto:carto,esri:esri,none:null};let curBase='osm';
function bmDraw(){$('bm').innerHTML='<div class="ly" style="grid-template-columns:1fr">'+[['osm','OpenStreetMap'],['carto','Peta terang polos (CARTO)'],['esri','Citra satelit (Esri)'],['none','Tanpa peta dasar']].map(([k,n])=>'<label><input type="radio" name="bm" value="'+k+'"'+(curBase===k?' checked':'')+'><span>'+n+'</span></label>').join('')+'</div>'}
$('bm').addEventListener('change',e=>{const t=e.target;if(t.name==='bm'){Object.values(BASES).forEach(b=>b&&map.removeLayer(b));curBase=t.value;if(BASES[t.value])BASES[t.value].addTo(map)}});
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{cMode=b.dataset.c;document.querySelectorAll('[data-c]').forEach(x=>x.setAttribute('aria-pressed',x===b));legend();if(PIPES)render(false)});
$('lg').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;off.has(b.dataset.m)?off.delete(b.dataset.m):off.add(b.dataset.m);legend();render(true)};
[['fZone','zone'],['fCls','cls'],['fSt','st']].forEach(([id,k])=>$(id).onchange=e=>{f[k]=e.target.value;render(true)});
$('bReset').onclick=()=>{resetFilters();render(true)};
$('zones').onclick=e=>{const b=e.target.closest('.zr');if(!b||b.dataset.z==='-')return;f.zone=f.zone===b.dataset.z?'':b.dataset.z;$('fZone').value=f.zone;render(true)};
$('q').addEventListener('input',e=>search(e.target.value));
$('q').addEventListener('keydown',e=>{const n=Math.min(hits.length,8);
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,Math.min(n-1,sel+(e.key==='ArrowDown'?1:-1)));draw()}
 else if(e.key==='Enter'&&n)go(hits[Math.max(sel,0)]);else if(e.key==='Escape'){e.target.value='';search('')}});
$('res').addEventListener('mousedown',e=>{const li=e.target.closest('li');if(li)go(hits[+li.dataset.i])});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('q').focus()}});
const KIND={p:'Pipa lateral',m:'Manhole',collect:'Pipa collecting',persil:'Pipa persil',ic:'Inspection chamber',hi:'House inlet'};
const SP=[{k:'zona',f:'zona',t:'Zona',id:'zone_name'},{k:'rw',f:'batas_rw',t:'Batas RW',id:'rw_label'},{k:'collect',f:'collecting_pipe',t:'Pipa collecting',id:'cp_id'},{k:'persil',f:'persil_pipe',t:'Pipa persil',id:'pp_id'},{k:'ic',f:'inspection_chamber',t:'Inspection chamber',id:'ic_id'},{k:'hi',f:'house_inlet',t:'House inlet',id:'hi_id'}];
const HIK={HIP:'hip',HI:'hic',SR:'sr'},HIL={hip:'Potensi, belum disurvey',hic:'HI, disetujui tanpa pipa dalam rumah',sr:'SR, disetujui dengan pipa dalam rumah'},HIC={hip:'#868e96',hic:'#f59f00',sr:'#2b8a3e'},hcat=p=>HIK[String(p.hi_code||'').trim().toUpperCase()]||'hip';
const SKIP=new Set(['attrs','fid','geom','updated_at','stage_code','hi_status','hi_kategori','has_inside_pipe','in_scope']);
const nv=(k,v)=>typeof v==='boolean'?(v?'ya':'tidak'):typeof v!=='number'?esc(v):/lon|lat/.test(k)?v.toFixed(6):fmt(v,Number.isInteger(v)?0:3);
const popG=(p,t,k)=>'<div class="pp"><h3>'+esc(p[k])+'</h3><p class="sub">'+t+'</p><table>'+Object.entries(p).filter(([a,v])=>!SKIP.has(a)&&a!==k&&v!=null&&v!=='').map(([a,v])=>row(esc(a.replace(/_/g,' ')),nv(a,v))).join('')+'</table></div>';
function buildStatic(s,g){const poly=s.k==='zona'||s.k==='rw';
 g.features.forEach(x=>{const p=x.properties,id=p[s.id],hk=s.k==='hi'?hcat(p):null,gk=hk||s.k,G=SL[gk];if(hk)p.kategori=HIL[hk];let l,inner;
  if(x.geometry.type==='Point'){const c=x.geometry.coordinates;inner=l=cm([c[1],c[0]],s.k==='ic'?{hit:8,radius:5,color:'#fff',weight:1.2,fillColor:'#d6336c',fillOpacity:1}:hk==='hip'?{hit:7,radius:3.5,color:HIC.hip,weight:1.5,fillOpacity:0}:{hit:7,radius:hk==='sr'?4:3.5,color:'#fff',weight:.8,fillColor:HIC[hk],fillOpacity:1})}
  else{l=L.geoJSON(x,poly?{pane:'pz',interactive:false,style:{color:s.k==='zona'?'#7048b8':'#868e96',weight:s.k==='zona'?2.5:1.2,dashArray:s.k==='zona'?'8 5':'3 4',fillOpacity:.05}}:{style:{color:s.k==='collect'?'#c2255c':'#868e96',weight:s.k==='collect'?2.5:1.5,dashArray:s.k==='persil'?'2 4':null}});l.eachLayer(y=>{inner=y})}
  if(poly)inner.bindTooltip(String(id),{permanent:true,direction:'center',className:'plbl'+(s.k==='rw'?' rwl':'')});
  else{inner.bindPopup(()=>popG(p,s.t,s.id),{maxWidth:340}).bindTooltip(String(id),{sticky:true});sById.set(id,inner);IDX.push({t:s.k,g:gk,f:x,id:String(id),h:hay(p)})}
  if(hk)inner._zn=p.zone_no==null?'-':p.zone_no;
  G.addLayer(l);have[gk]=(have[gk]||0)+1})}
const LY=[['pipe','Pipa lateral'],['mh','Manhole'],['collect','Pipa collecting'],['persil','Pipa persil'],['ic','Inspection chamber'],['sr','SR: HI dan pipa dalam rumah'],['hic','HI: tanpa pipa dalam rumah'],['hip','HIP: potensi, belum disurvey'],['zona','Zona'],['rw','Batas RW']];
function lyDraw(){$('ly').innerHTML=LY.map(([k,n])=>{const has=k==='pipe'||k==='mh'||have[k];return '<label'+(HIS.has(k)?' class="hi"':'')+'><input type="checkbox" data-l="'+k+'"'+(vis[k]&&has?' checked':'')+(has?'':' disabled')+'><span>'+n+(has?'':' <small>(belum ada data)</small>')+(have[k]?' <small>'+fmt(have[k],0)+'</small>':'')+(HIS.has(k)&&HI_MINZ>0?' <small>· tampil di zoom ≥ '+HI_MINZ+'</small>':'')+'</span></label>'}).join('')+(HI_MINZ>0?'<p class="sm" style="grid-column:1/-1">House inlet muncul otomatis saat peta diperbesar sampai zoom '+HI_MINZ+'.</p>':'')}
function hiTable(){const z={};let n={sr:0,hic:0,hip:0};
 ['sr','hic','hip'].forEach(k=>SL[k].eachLayer(l=>{const q=l._zn==null?'-':l._zn;(z[q]=z[q]||{sr:0,hic:0,hip:0})[k]++;n[k]++}));
 if(!(n.sr+n.hic+n.hip))return;
 $('hit').innerHTML=Object.keys(z).sort((a,b)=>a-b).map(k=>'<tr><td>'+(k==='-'?'Di luar zona':'Zona '+k)+'</td><td>'+fmt(z[k].sr,0)+'</td><td>'+fmt(z[k].hic,0)+'</td><td>'+fmt(z[k].hip,0)+'</td></tr>').join('')+'<tr><td><b>Total</b></td><td><b>'+fmt(n.sr,0)+'</b></td><td><b>'+fmt(n.hic,0)+'</b></td><td><b>'+fmt(n.hip,0)+'</b></td></tr>';
 $('kHi').textContent=fmt(n.sr+n.hic,0)+' (potensi '+fmt(n.hip,0)+')'}
function syncStatic(){let ch=false;Object.keys(SL).forEach(k=>{const on=vis[k]&&have[k]&&(!HIS.has(k)||map.getZoom()>=HI_MINZ);if(on&&!map.hasLayer(SL[k])){SL[k].addTo(map);ch=true}else if(!on&&map.hasLayer(SL[k])){map.removeLayer(SL[k]);ch=true}});document.body.classList.toggle('zrw',map.getZoom()>=15);document.body.classList.toggle('hifar',map.getZoom()<HI_MINZ);if(ch)restack()}
map.on('zoomend',syncStatic);
$('ly').onchange=e=>{const k=e.target.dataset.l;vis[k]=e.target.checked;syncStatic();if(k==='pipe'||k==='mh')render(false)};
let tt;const toast=m=>{const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(tt);tt=setTimeout(()=>{t.style.display='none'},3500)};
const GPS=L.Control.extend({options:{position:'topright'},onAdd(){const b=L.DomUtil.create('button','gps');b.id='gps';b.title='Lokasi saya (GPS)';b.setAttribute('aria-label','Lokasi saya');b.setAttribute('aria-pressed','false');b.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';L.DomEvent.disableClickPropagation(b);b.onclick=gpsToggle;return b}});
map.addControl(new GPS());
let me=null,acc=null,first=true;
function gpsToggle(){const b=$('gps');
 if(b.getAttribute('aria-pressed')==='true'){map.stopLocate();[me,acc].forEach(x=>x&&map.removeLayer(x));me=acc=null;b.setAttribute('aria-pressed','false');toast('GPS dimatikan');return}
 if(!navigator.geolocation){toast('Perangkat ini tidak mendukung GPS');return}
 first=true;b.setAttribute('aria-pressed','true');toast('Mencari lokasi...');map.locate({watch:true,enableHighAccuracy:true,setView:false,maximumAge:5000})}
map.on('locationfound',e=>{
 if(!me){acc=L.circle(e.latlng,{pane:'pm',interactive:false,radius:e.accuracy,color:'#1c7ed6',weight:1,fillOpacity:.12}).addTo(map);me=L.circleMarker(e.latlng,{pane:'pm',interactive:false,radius:8,color:'#fff',weight:3,fillColor:'#1c7ed6',fillOpacity:1}).addTo(map)}
 else{me.setLatLng(e.latlng);acc.setLatLng(e.latlng).setRadius(e.accuracy)}
 if(first){first=false;map.flyTo(e.latlng,Math.max(map.getZoom(),18))}toast('Akurasi sekitar '+Math.round(e.accuracy)+' m')});
map.on('locationerror',e=>{$('gps').setAttribute('aria-pressed','false');map.stopLocate();toast(e.code===1?'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser.':'Lokasi belum didapat. Pastikan GPS aktif dan coba di tempat terbuka.')});
const mob=()=>matchMedia('(max-width:820px)').matches,sh=n=>{document.body.classList.remove('sh1','sh2');if(n)document.body.classList.add('sh'+n);document.body.dataset.sh=n};
$('grab').onclick=()=>sh(((+document.body.dataset.sh||0)+1)%3);
$('q').addEventListener('focus',()=>{if(mob()&&!+document.body.dataset.sh)sh(1)});
map.on('click',()=>{if(mob()&&+document.body.dataset.sh)sh(0)});
$('lgT').onclick=()=>document.body.classList.toggle('lgon');
legend();
const NUM=['length_m','slope_pct','progress_pct','diameter_mm','depth_m','ground_elev','invert_elev','elev_downstream','elev_upstream_1','elev_upstream_2','elev_upstream_3','up_gl','up_ie','up_depth','lw_gl','lw_ie','lw_depth','drop_m'];
const norm=g=>{g.features=g.features.filter(x=>x.geometry);g.features.forEach(x=>NUM.forEach(k=>{if(k in x.properties){const v=x.properties[k];x.properties[k]=(v===null||v===undefined||v==='')?null:Number(v)}}));return g};
const get=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u+' ('+r.status+')');return r.json().then(j=>({j,lm:r.headers.get('Last-Modified')}))});
function start(){
 PIPES.features.forEach(x=>{const p=x.properties;[p.from_mh,p.to_mh].forEach(id=>{if(!mm.has(id))mm.set(id,new Set());mm.get(id).add(p.method)})});
 IDX=PIPES.features.map(x=>({t:'p',f:x,id:x.properties.pipe_id,h:hay(x.properties)})).concat(MH.features.map(x=>({t:'m',f:x,id:x.properties.manhole_id,h:hay(x.properties)+' '+(mmeth(x.properties.manhole_id)||'').toLowerCase()})));
 const opt=(id,vals)=>vals.forEach(v=>{const o=document.createElement('option');o.value=v[0];o.textContent=v[1];$(id).appendChild(o)});
 opt('fZone',[...new Set(PIPES.features.concat(MH.features).map(x=>x.properties.zone).filter(z=>z!=null))].sort((a,b)=>a-b).map(z=>[String(z),'Zona '+z]));
 opt('fCls',['Primary','Secondary','Tertiary'].map(c=>[c,c]));
 $('tbLen').textContent=fmt(PIPES.features.reduce((s,x)=>s+(x.properties.length_m||0),0)/1000,2)+' km';
 osm.addTo(map);bmDraw();map.fitBounds(L.geoJSON(PIPES).getBounds().pad(.05));render(false);lyDraw();
 Promise.allSettled(SP.map(s=>get('data/'+s.f+'.geojson').then(r=>{r.j.features=r.j.features.filter(x=>x.geometry);buildStatic(s,r.j)}))).then(()=>{lyDraw();syncStatic();legend();hiTable()});
}
Promise.all([get('data/v_lateral_pipe.geojson'),get('data/v_manhole.geojson')]).then(([a,b])=>{
 PIPES=norm(a.j);MH=norm(b.j);
 const lm=a.lm||b.lm;if(lm)$('upd').textContent=new Date(lm).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
 start();
}).catch(e=>{$('map').innerHTML='<p style="padding:16px">Data tidak bisa dimuat: '+esc(e.message)+'. Pastikan folder data berisi v_lateral_pipe.geojson dan v_manhole.geojson, dan buka halaman lewat alamat GitHub Pages, bukan dengan klik dua kali file index.html.</p>'});
