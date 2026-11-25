import React,{useEffect,useMemo,useState} from 'react';
import {MapContainer,TileLayer,Marker,Popup,Polyline,Circle} from 'react-leaflet';
import L from 'leaflet';
import {AreaChart,Area,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid,BarChart,Bar} from 'recharts';
import {Activity,AlertTriangle,MapPinned,ShieldCheck,Database,Camera,Menu, Bell, CloudRain, Waves, Siren, Navigation, Upload, RefreshCw, FileText, LayoutDashboard} from 'lucide-react';

const API='http://localhost:5000/api';
const icon=(color)=>L.divIcon({className:'pin-wrap',html:`<div class="map-pin" style="background:${color}"></div>`,iconSize:[18,18],iconAnchor:[9,9]});
const nav=[['Overview','overview'],['Disaster Data','data'],['Flood Prediction','prediction'],['Emergency & SOS','emergency'],['Shelters & Routes','map']];

export default function App(){
 const [page,setPage]=useState('overview'),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [notice,setNotice]=useState(''),[report,setReport]=useState({name:'',location:'Betwa region, Madhya Pradesh',description:''}),[sos,setSos]=useState({name:'',phone:'',message:''});
 const [file,setFile]=useState(null),[assessment,setAssessment]=useState(null);
 const [auth,setAuth]=useState({email:'',password:''});
 const [registerData,setRegisterData]=useState({
  name:'', email:'', password:''
});
const [showRegister,setShowRegister]=useState(false);
 const [user,setUser]=useState(null);
 const [token,setToken]=useState(localStorage.getItem('floodwatch_token'));
 const [shelterData,setShelterData]=useState({shelters:[],counts:{},note:''}),[userLocation,setUserLocation]=useState(null),[routeData,setRouteData]=useState(null),[routeBusy,setRouteBusy]=useState(false);
 
 async function load(){setBusy(true);try{let r=await fetch(API+'/overview');if(!r.ok)throw Error('API unavailable');setData(await r.json());setError('')}catch(e){setError('Cannot reach backend. Start the backend on port 5000.');}finally{setBusy(false)}}
 useEffect(()=>{load()},[]);
 useEffect(() => {
  if (!token) return;

  fetch(API + '/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => {
    if (!r.ok) throw Error('Session expired');
    return r.json();
  })
  .then(j => setUser(j.user || j))
  .catch(() => {
    localStorage.removeItem('floodwatch_token');
    setToken(null);
    setUser(null);
  });
}, []);
 useEffect(()=>{if(page==='map')loadShelters()},[page]);
 
 async function loadShelters(){try{const r=await fetch(API+'/shelters');if(!r.ok)throw Error('Shelter service unavailable');setShelterData(await r.json())}catch(e){setNotice(e.message)}}
 
 function findRoute(shelter){if(!shelter.authorityVerified||shelter.status!=='open'){setNotice('Route disabled: destination is not an authority-verified open shelter.');return}if(!navigator.geolocation){setNotice('Location is not supported by this browser.');return}setRouteBusy(true);navigator.geolocation.getCurrentPosition(async pos=>{const loc={lat:pos.coords.latitude,lng:pos.coords.longitude};setUserLocation(loc);try{const q=new URLSearchParams({fromLat:loc.lat,fromLng:loc.lng,toLat:shelter.lat,toLng:shelter.lng});const r=await fetch(API+'/evacuation/route?'+q);const j=await r.json();if(!r.ok)throw Error(j.error||'Route unavailable');setRouteData({...j,shelterName:shelter.name});}catch(e){setNotice(e.message)}finally{setRouteBusy(false)}},e=>{setRouteBusy(false);setNotice('Could not access GPS. Allow location permission and try again.')},{enableHighAccuracy:true,timeout:12000});}
 
 const risk=data?.risk||{score:0,level:'Unknown',reasons:[]};
 const latest=data?.river?.at(-1), rain=data?.rainfall?.at(-1);
 const chart=(data?.river||[]).map(x=>({date:new Date(x.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),level:x.level}));
 const rainChart=data?.rainfall||[];
 
 async function post(path,body){
  const r = await fetch(API + path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
    headers: body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' }
  });

  const j = await r.json();

  if (!r.ok) {
    throw Error(j.message || j.error || 'Request failed');
  }

  return j;
}
 async function submitReport(e){e.preventDefault();try{await post('/reports',report);setNotice('Report submitted to the demo system.');setReport({...report,description:''});load()}catch(e){setNotice(e.message)}}
 async function sendSOS(e){e.preventDefault();try{let j=await post('/sos',sos);setNotice(j.message);load()}catch(e){setNotice(e.message)}}
 async function login(e) {
  e.preventDefault();

  try {
    const j = await post('/auth/login', auth);

    localStorage.setItem('floodwatch_token', j.token);
    setToken(j.token);
    setUser(j.user);
    setAuth({ email: '', password: '' });
    setNotice('Login successful!');
  } catch (e) {
    setNotice(e.message);
  }
}
function logout() {
  localStorage.removeItem('floodwatch_token');
  setToken(null);
  setUser(null);
  setNotice('Logged out successfully.');
}
async function register(e) {
  e.preventDefault();
  try {
    await post('/auth/register', registerData);
    setNotice('Registration successful! Please sign in.');
    setShowRegister(false);
    setAuth({
      email: registerData.email,
      password: ''
    });
    setRegisterData({ name:'', email:'', password:'' });
  } catch(e) {
    setNotice(e.message);
  }
}
 
 
const title=nav.find(x=>x[1]===page)?.[0]||'Overview';

return <div className="shell">
  <aside className="sidebar"><div className="brand"><div className="brand-mark">C</div><div><b>CLARKE</b><small>DISASTER INTELLIGENCE</small></div></div>
   <div className="region"><span className="live-dot"></span><div><b>BETWA RIVER REGION</b><small>Vidisha · Basoda, MP</small></div></div>
   <p className="nav-label"></p>{nav.map(([label,key])=><button key={key} className={'nav-item '+(page===key?'active':'')} onClick={()=>setPage(key)}>{key==='overview'?<LayoutDashboard/>:key==='data'?<Database/>:key==='prediction'?<Activity/>:key==='drone'?<Camera/>:key==='emergency'?<Siren/>:<MapPinned/>}{label}</button>)}
   <div className="side-bottom"><div className="status-pill"><span className="live-dot"></span> </div><small>CLARKE · </small></div>
  </aside>
  <main className="main"><header className="topbar"><div><span className="crumb">CLARKE /</span> {title}</div><div className="top-actions"><span className="sample-tag">{data?.dataMode||'CONNECTING TO DATA'}</span><button className="icon-btn" onClick={load}><RefreshCw size={17}/></button><div className="avatar">{user?.name?.[0]?.toUpperCase()||'G'}</div><span className="user-name">{user?.name||'Guest User'}</span>{user && (
  <button className="btn btn-light" onClick={logout}>
    Logout
  </button>
)}</div></header>
   <div className="content"><div className="page-heading"><div><p className="eyebrow">DISASTER RESPONSE PLATFORM · MADHYA PRADESH</p><h1>{page==='overview'?'Betwa River Situation Overview':title}</h1><p className="subheading">Monitor conditions, assess impact and coordinate safer response across the Betwa basin.</p></div><button className="btn btn-light" onClick={load}><RefreshCw size={15}/> Refresh data</button></div>
   {error&&<div className="warning"><AlertTriangle/> {error}</div>}{notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} <b>×</b></div>}
   {page==='overview'&&<><div className="banner"><div><span className="banner-kicker">CURRENT RISK INDICATOR · {data?.dataMode||'DEMO'}</span><h2>{risk.level} <span>Risk</span></h2><p>Prototype risk score. Confirm station thresholds and calibrate the model before operational use.</p></div><div className="risk-score"><strong>{risk.score}</strong><small>/ 100</small></div><div className="banner-icon"><Waves size={38}/></div></div>
    <div className="stats-grid"><Stat icon={<Waves/>} label="Latest river level" value={latest?`${latest.level} m*`:'—'} meta="Basoda demo station" tone="blue"/><Stat icon={<CloudRain/>} label="Latest rainfall" value={rain?`${rain.rainfall} mm`:'—'} meta="Latest sample observation" tone="cyan"/><Stat icon={<MapPinned/>} label="Mapped risk zones" value={data?.areas?.length??'—'} meta="Illustrative locations" tone="orange"/><Stat icon={<ShieldCheck/>} label="Shelter markers" value={data?.shelters?.length??'—'} meta="Not authority-verified" tone="green"/></div>
    <div className="grid-two"><section className="card"><CardTitle title="River water-level trend" tag="BETWA · SAMPLE" /><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2785d8" stopOpacity={.25}/><stop offset="100%" stopColor="#2785d8" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e9eef4"/><XAxis dataKey="date" tickLine={false} axisLine={false}/><YAxis domain={['auto','auto']} tickLine={false} axisLine={false}/><Tooltip/><Area type="monotone" dataKey="level" stroke="#2785d8" fill="url(#fillBlue)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div></section>
    <section className="card"><CardTitle title="Rainfall observations" tag="MILLIMETRES"/><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={rainChart}><CartesianGrid strokeDasharray="3 3" stroke="#e9eef4"/><XAxis dataKey="date" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false}/><Tooltip/><Bar dataKey="rainfall" fill="#24a6a1" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section></div>
    <div className="grid-two"><section className="card"><CardTitle title="Flood-risk assessment" tag="RULE-BASED"/><div className="risk-line"><div className="risk-meter"><div style={{width:risk.score+'%'}}/></div><b>{risk.score}/100</b></div><h3 className={'risk-text '+risk.level.toLowerCase()}>{risk.level} risk</h3>{(risk.reasons||[]).map((x,i)=><p className="reason" key={i}>• {x}</p>)}<p className="muted tiny">{risk.disclaimer}</p></section><section className="card"><CardTitle title="Recent alerts" tag="LATEST"/>{(data?.alerts||[]).slice().reverse().slice(0,4).map(a=><div className="alert-row" key={a.id}><span className={'alert-dot '+a.severity}></span><div><b>{a.title}</b><p>{a.message}</p><small>{new Date(a.createdAt).toLocaleString()}</small></div></div>)}</section></div></>}
   {page==='data'&&<><div className="stats-grid"><Stat icon={<Waves/>} label="River records" value={data?.river?.length||0} meta="Bundled observations" tone="blue"/><Stat icon={<CloudRain/>} label="Rainfall records" value={data?.rainfall?.length||0} meta="Bundled observations" tone="cyan"/><Stat icon={<MapPinned/>} label="Affected zones" value={data?.areas?.length||0} meta="Demo records" tone="orange"/><Stat icon={<FileText/>} label="Drone assessments" value={data?.assessments?.length||0} meta="Uploaded files" tone="green"/></div><section className="card table-card"><CardTitle title="River observations" tag="BETWA / BASODA"/><DataTable headers={['Station','Date','Level (sample)','Danger threshold*','Source']} rows={(data?.river||[]).map(x=>[x.station,new Date(x.date).toLocaleString(),x.level,x.dangerLevel,x.source])}/><p className="muted tiny">*Units and thresholds must be confirmed against the official station metadata. Values shown are illustrative sample data.</p></section><section className="card table-card"><CardTitle title="Shelter records" tag="DEMO LOCATIONS"/><DataTable headers={['Shelter','Capacity','Occupied','Available*','Verified']} rows={(data?.shelters||[]).map(x=>[x.name,x.capacity,x.occupied,x.capacity-x.occupied,x.verified?'Yes':'No'])}/><p className="muted tiny">*Demo capacity only. Not confirmed public shelters.</p></section></>}
   {page==='prediction'&&<><div className="banner compact"><div><span className="banner-kicker">BETWA RIVER · </span><h2>{risk.level} <span>Risk · {risk.score}/100</span></h2><p>Uses latest sample river level, recent change and rainfall. Not a validated forecast.</p></div><Activity size={42}/></div><section className="card"><CardTitle title="Risk calculation inputs" tag="TRANSPARENT LOGIC"/><DataTable headers={['Input','Current sample','Interpretation']} rows={[[ 'River level',latest?.level??'No data','Compared with configured demo threshold'],['Danger threshold',latest?.dangerLevel??'Not set','Must be confirmed with CWC / local authority'],['Latest rainfall',rain?.rainfall??'No data','Sample rainfall in mm'],['Recent level change',latest&&data?.river?.at(-2)?(latest.level-data.river.at(-2).level).toFixed(2):'—','Change from previous observation']]}/><p className="muted">The score is a prototype heuristic. It does not predict river discharge, inundation depth or time-to-flood.</p></section><section className="card"><CardTitle title="Potentially affected demo zones"/>{(data?.areas||[]).map(a=><div className="zone-row" key={a.id}><div><b>{a.name}</b><p>{a.note}</p></div><span className={'badge '+a.risk.toLowerCase()}>{a.risk}</span></div>)}</section></>}
   {page==='drone'&&<><section className="card upload-card"><div className="upload-icon"><Camera size={28}/></div><h2></h2><p>Upload an aerial JPG, PNG or WEBP image (max 12 MB). The starter stores the image; it does not yet run an AI detection model.</p><form onSubmit={uploadDrone}><label className="file-input"><Upload/> {file?file.name:'Choose aerial image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="btn btn-primary" disabled={!file}>Upload image</button></form></section>{assessment&&<section className="card"><CardTitle title="Upload result" tag="DEMO"/><h3>{assessment.status}</h3><p>{assessment.summary}</p><p className="muted">{assessment.note}</p></section>}<section className="card"><CardTitle title="Previous assessments"/>{(data?.assessments||[]).length===0?<p className="muted">No images uploaded yet.</p>:(data.assessments||[]).map(a=><div className="zone-row" key={a.id}><b>{a.originalName}</b><span className="badge moderate">{a.status}</span></div>)}</section></>}
   {page==='emergency'&&<div className="grid-two"><section className="card"><CardTitle title="Emergency SOS" tag="DEMO ONLY"/><p className="muted">Records an SOS inside this prototype. It does not contact police, ambulance or disaster services.</p><form className="form" onSubmit={sendSOS}><Field label="Your name"><input value={sos.name} onChange={e=>setSos({...sos,name:e.target.value})} placeholder="Name"/></Field><Field label="Phone number"><input value={sos.phone} onChange={e=>setSos({...sos,phone:e.target.value})} placeholder="Phone"/></Field><Field label="Emergency details"><textarea value={sos.message} onChange={e=>setSos({...sos,message:e.target.value})} placeholder="Describe the situation"/></Field><button className="btn btn-danger"><Siren size={16}/> Submit demo SOS</button></form></section><section className="card"><CardTitle title="Report a disaster situation"/><form className="form" onSubmit={submitReport}><Field label="Your name"><input value={report.name} onChange={e=>setReport({...report,name:e.target.value})} placeholder="Optional"/></Field><Field label="Location"><input value={report.location} onChange={e=>setReport({...report,location:e.target.value})}/></Field><Field label="What happened?"><textarea required value={report.description} onChange={e=>setReport({...report,description:e.target.value})} placeholder="Flooding, road blockage, damage..."/></Field><button className="btn btn-primary">Submit report</button></form></section><section className="card"><CardTitle title="Demo sign in"/><form className="form" onSubmit={login}><Field label="Email"><input type="email" required value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/></Field><Field label="Password"><input type="password" required value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/></Field><button className="btn btn-primary">Sign in</button></form></section><section className="card"><CardTitle title="Emergency information"/><div className="emergency-number"><b>112</b><span>India emergency response number</span></div><p className="muted tiny">For a real emergency, contact official emergency services directly. Do not rely on this prototype.</p></section></div>}
   {page==='map'&&<><div className="map-legend"><span><i className="legend-dot red"/> High-risk demo zone</span><span><i className="legend-dot orange"/> Moderate-risk demo zone</span><span><i className="legend-dot green"/> Mapped shelter candidate</span><span>Blue = authority-verified shelter</span></div><div className="map-layout"><section className="card map-card"><MapContainer center={[23.69,77.88]} zoom={9} scrollWheelZoom><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{(data?.areas||[]).map(a=><React.Fragment key={a.id}><Circle center={[a.lat,a.lng]} radius={1700} pathOptions={{color:a.risk==='High'?'#e14f57':'#e5a13c',fillOpacity:.18}}/><Marker position={[a.lat,a.lng]} icon={icon(a.risk==='High'?'#e14f57':'#e5a13c')}><Popup><b>{a.name}</b><br/>{a.risk} (sample zone)</Popup></Marker></React.Fragment>)}{(shelterData.shelters||[]).map(s=><Marker key={s.id} position={[s.lat,s.lng]} icon={icon(s.authorityVerified?'#1769aa':'#21a477')}><Popup><b>{s.name}</b><br/>{s.authorityVerified?'Authority verified':'OpenStreetMap candidate'}<br/>Status: {s.status}<br/>Capacity: {s.capacity??'Not published'}</Popup></Marker>)}{userLocation&&<Marker position={[userLocation.lat,userLocation.lng]}><Popup>Your current location</Popup></Marker>}{routeData?.geometry?.coordinates&&<Polyline positions={routeData.geometry.coordinates.map(c=>[c[1],c[0]])} pathOptions={{color:'#1769aa',weight:5}}/>}</MapContainer></section><section className="card shelter-list"><CardTitle title="Live shelter discovery" tag="OSM + AUTHORITY FEED"/><button className="btn btn-light" onClick={loadShelters}><RefreshCw size={14}/> Refresh shelter locations</button><p className="muted tiny">{shelterData.note||'OSM locations are candidates only. Opening status and capacity are not provided by OSM.'}</p><p><b>{shelterData.counts?.authorityVerified||0}</b> authority-verified · <b>{shelterData.counts?.osmUnverified||0}</b> unverified map candidates</p>{(shelterData.shelters||[]).length===0?<p className="muted">No shelter locations returned. This does not mean no shelters exist.</p>:(shelterData.shelters||[]).map(s=><div className="shelter-item" key={s.id}><div className="shelter-symbol"><ShieldCheck/></div><div><b>{s.name}</b><p>{s.authorityVerified?`${s.available??'Capacity unknown'} spaces available · ${s.status}`:'Map listing only — status and capacity unknown'}</p><small>{s.authorityVerified?'Authority verified':'Not verified'} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</small>{s.authorityVerified&&s.status==='open'&&<button className="btn btn-primary" disabled={routeBusy} onClick={()=>findRoute(s)}>{routeBusy?'Finding route…':'Get route from my location'}</button>}</div></div>)}{routeData&&<div className="route-result"><b>Route to {routeData.shelterName}</b><p>{routeData.distanceKm.toFixed(1)} km · {Math.round(routeData.durationMinutes)} min estimated</p><span className="badge moderate">{routeData.status}</span><p className="muted tiny">{routeData.warning}</p></div>}<p className="muted tiny">A normal road route is not a flood-safe route. A real evacuation route requires verified road closures, flood polygons and current shelter status.</p></section></div></>}
   <footer>CLARKE · Betwa River Disaster Intelligence </footer>
   </div></main>
 </div>
}
function Stat({icon,label,value,meta,tone}){return <div className="stat-card"><div className={'stat-icon '+tone}>{icon}</div><div><p>{label}</p><h2>{value}</h2><small>{meta}</small></div></div>}
function CardTitle({title,tag}){return <div className="card-title"><h3>{title}</h3>{tag&&<span>{tag}</span>}</div>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function DataTable({headers,rows}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{String(v??'—')}</td>)}</tr>)}</tbody></table></div>}
