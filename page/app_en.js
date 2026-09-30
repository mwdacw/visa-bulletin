const NS='http://www.w3.org/2000/svg';
const S={country:'china',mode:'filing',cats:['eb2','eb3'],range:'all',proj:true,pd:'2023-06-15'};
const CATS=[
 {k:'eb1',name:'EB-1',full:'EB-1 Priority Workers',c:'--c3',src:['EB-1: Priority Workers']},
 {k:'eb2',name:'EB-2',full:'EB-2 Advanced Degree Professionals',c:'--c1',src:['EB-2: Professionals with Advanced Degrees']},
 {k:'eb3',name:'EB-3',full:'EB-3 Skilled Workers & Professionals',c:'--c2',src:['EB-3: Skilled Workers, Professionals']},
 {k:'eb3o',name:'EB-3 OW',full:'EB-3 Other Workers',c:'--c4',src:['EB-3: Other Workers']},
 {k:'eb4',name:'EB-4',full:'EB-4 Special Immigrants',c:'--c5',src:['EB-4: Special Immigrants']},
 {k:'eb5u',name:'EB-5 Unreserved',full:'EB-5 Unreserved',c:'--c6',src:['EB-5: Non-Regional Center','EB-5: Unreserved']},
 {k:'eb5r',name:'EB-5 Rural',full:'EB-5 Set-aside: Rural 20%',c:'--c7',src:['EB-5: Rural (20%)']},
 {k:'eb5h',name:'EB-5 High Unemp.',full:'EB-5 Set-aside: High Unemployment 10%',c:'--c8',src:['EB-5: High Unemployment (10%)']},
];
const CNAME={china:'China',india:'India',row:'All Chargeability (ROW)',mexico:'Mexico',philippines:'Philippines',centralam:'El Salvador / Guatemala / Honduras'};
let SRC={latest:BASE.latest_bulletin,fetched:BASE.fetched_at,countries:BASE.countries};
const mnum=m=>{const[y,mo]=m.split('-').map(Number);return y+(mo-1)/12};
const dnum=d=>{if(!d)return null;const[y,m,dd]=d.split('-').map(Number);return y+(m-1)/12+(dd-1)/365.25};
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const el=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
const fmtNum=(v,d=1)=>(v>0?'+':'')+v.toFixed(d);
function monthAdd(m,n){let[y,mo]=m.split('-').map(Number);mo+=n;y+=Math.floor((mo-1)/12);mo=((mo-1)%12+12)%12+1;return y+'-'+String(mo).padStart(2,'0')}
function niceStep(span,target){const raw=span/target;const p=Math.pow(10,Math.floor(Math.log10(raw)));for(const m of[1,2,5,10])if(m*p>=raw)return m*p;return 10*p}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtB=m=>{const[y,mo]=m.split('-');return MON[+mo-1]+' '+y};
const fmtCut=(d)=>d==null?'C':d;

// series for one category in current country/table: {all:[[m,d]], q:[[m,d]]}, null when absent
function getCat(cat){
  const tbl=SRC.countries[S.country]?.[S.mode]||[];const mp=new Map();let found=false;
  for(const n of cat.src){const s=tbl.find(x=>x.n===n);if(!s)continue;found=true;s.m.forEach((m,i)=>mp.set(m,s.d[i]))}
  if(!found)return null;
  const all=[...mp.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
  const qs=tbl.find(x=>x.n===cat.src[cat.src.length-1]+' (Queue Model)');
  return {all,q:qs?qs.m.map((m,i)=>[m,qs.d[i]]):[]};
}
function firstMonth(){let f='9999';for(const c of CATS){const g=getCat(c);if(g&&g.all.length&&g.all[0][0]<f)f=g.all[0][0]}return f}
function startMonth(){const f=firstMonth();if(S.range==='all')return f;const s=monthAdd(SRC.latest,-12*+S.range+1);return s<f?f:s}
// C (null) is drawn at the bulletin month itself
const cutNum=(m,d)=>d==null?mnum(m):dnum(d);

function lineChart(host,cfg){
  host.innerHTML='';
  const W=Math.max(300,host.clientWidth),H=W<560?250:320,m={l:W<560?46:58,r:12,t:12,b:26};
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':cfg.label},host);
  const iw=W-m.l-m.r,ih=H-m.t-m.b;
  const xs=cfg.lines.flatMap(l=>l.pts.map(p=>p[0]));const x0=Math.min(...xs),x1=Math.max(...xs)+1/12;
  let ys=cfg.lines.flatMap(l=>l.pts.map(p=>p[1]).filter(v=>v!=null));if(cfg.hline!=null)ys.push(cfg.hline);
  let y0=Math.min(...ys),y1=Math.max(...ys);if(cfg.y0!=null)y0=Math.min(y0,cfg.y0);const pad=(y1-y0)*.06||1;y0-=cfg.y0!=null&&y0>=0?0:pad;y1+=pad;
  const X=v=>m.l+(v-x0)/(x1-x0)*iw,Y=v=>m.t+(1-(v-y0)/(y1-y0))*ih;
  const g=el('g',{},svg);
  const ystep=niceStep(y1-y0,W<560?5:9);
  for(let v=Math.ceil(y0/ystep)*ystep;v<=y1;v+=ystep){
    el('line',{x1:m.l,x2:W-m.r,y1:Y(v),y2:Y(v),stroke:css('--grid'),'stroke-width':1},g);
    const t=el('text',{x:m.l-8,y:Y(v)+4,'text-anchor':'end'},g);t.textContent=cfg.yFmt(v);
  }
  const xstep=niceStep(x1-x0,W<560?4:9);
  for(let v=Math.ceil(x0/xstep)*xstep;v<=x1;v+=xstep){
    el('line',{x1:X(v),x2:X(v),y1:H-m.b,y2:H-m.b+4,stroke:css('--rule')},g);
    const t=el('text',{x:X(v),y:H-6,'text-anchor':'middle'},g);t.textContent=Math.round(v);
  }
  el('line',{x1:m.l,x2:W-m.r,y1:H-m.b,y2:H-m.b,stroke:css('--rule')},g);
  if(cfg.hline!=null){
    el('line',{x1:m.l,x2:W-m.r,y1:Y(cfg.hline),y2:Y(cfg.hline),stroke:css('--pd'),'stroke-width':1.5,'stroke-dasharray':'2 3'},g);
    const t=el('text',{x:m.l+6,y:Y(cfg.hline)-6,style:`fill:${css('--pd')}`},g);t.textContent='My priority date';
  }
  if(cfg.nowX!=null){el('line',{x1:X(cfg.nowX),x2:X(cfg.nowX),y1:m.t,y2:H-m.b,stroke:css('--rule'),'stroke-dasharray':'3 3'},g);
    const t=el('text',{x:X(cfg.nowX)+4,y:H-m.b-6},g);t.textContent='Projection →'}
  for(const l of cfg.lines){
    let d='',prev=null;
    for(const [x,y] of l.pts){
      if(y==null){prev=null;continue}
      if(prev==null)d+=`M${X(x)},${Y(y)}`;else d+= l.step?`H${X(x)}V${Y(y)}`:`L${X(x)},${Y(y)}`;
      prev=y;
    }
    if(l.step&&prev!=null&&!l.dash)d+=`H${X(l.pts[l.pts.length-1][0]+1/12)}`;
    el('path',{d,fill:'none',stroke:l.color,'stroke-width':2,'stroke-linejoin':'round','stroke-dasharray':l.dash?'5 4':'none',opacity:l.dash?.85:1},g);
    const last=[...l.pts].reverse().find(p=>p[1]!=null);
    if(last&&!l.dash)el('circle',{cx:X(last[0]),cy:Y(last[1]),r:4,fill:l.color,stroke:css('--panel'),'stroke-width':2},g);
  }
  // hover
  const months=[...new Set(cfg.lines.flatMap(l=>l.pts.map(p=>p[0])))].sort((a,b)=>a-b);
  const cross=el('line',{y1:m.t,y2:H-m.b,stroke:css('--ink-3'),'stroke-width':1,visibility:'hidden'},svg);
  const dots=cfg.lines.map(l=>el('circle',{r:4.5,fill:l.color,stroke:css('--panel'),'stroke-width':2,visibility:'hidden'},svg));
  const tip=document.createElement('div');tip.className='tip';tip.hidden=true;host.appendChild(tip);
  const ov=el('rect',{x:m.l,y:m.t,width:iw,height:ih,fill:'transparent'},svg);
  const maps=cfg.lines.map(l=>{const o=new Map();l.pts.forEach(p=>o.set(p[0].toFixed(4),p[1]));return o});
  function move(ev){
    const r=svg.getBoundingClientRect(),px=(ev.clientX-r.left)*W/r.width;
    const xv=x0+(px-m.l)/iw*(x1-x0);let best=months[0];for(const mm of months)if(Math.abs(mm+1/24-xv)<Math.abs(best+1/24-xv))best=mm;
    cross.setAttribute('x1',X(best));cross.setAttribute('x2',X(best));cross.setAttribute('visibility','visible');
    const rows=[];
    cfg.lines.forEach((l,i)=>{const v=maps[i].get(best.toFixed(4));
      if(v===undefined){dots[i].setAttribute('visibility','hidden');return}
      if(v!=null){dots[i].setAttribute('cx',X(best));dots[i].setAttribute('cy',Y(v));dots[i].setAttribute('visibility','visible')}else dots[i].setAttribute('visibility','hidden');
      rows.push(`<div class="r"><span><i class="sw" style="background:${l.color}"></i>${l.label}</span><span class="m">${cfg.tipFmt(v,l,best)}</span></div>`)});
    const yr=Math.floor(best+1e-6),mo=Math.round((best-yr)*12)+1;
    tip.innerHTML=`<div style="margin-bottom:4px"><b>${MON[mo-1]} ${yr} bulletin</b></div>`+rows.join('');
    tip.hidden=false;const hw=host.clientWidth,tx=X(best)/W*hw;
    tip.style.left=(tx+14+tip.offsetWidth>hw?tx-14-tip.offsetWidth:tx+14)+'px';tip.style.top='8px';
  }
  function out(){tip.hidden=true;cross.setAttribute('visibility','hidden');dots.forEach(d=>d.setAttribute('visibility','hidden'))}
  ov.addEventListener('pointermove',move);ov.addEventListener('pointerdown',move);ov.addEventListener('pointerleave',out);
}

function barChart(host,groups,series){
  host.innerHTML='';
  const W=Math.max(300,host.clientWidth),H=W<560?220:260,m={l:W<560?40:48,r:12,t:12,b:26};
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'Months advanced per year'},host);
  const iw=W-m.l-m.r,ih=H-m.t-m.b,n=series.length;
  const vals=groups.flatMap(g=>g.v.filter(v=>v!=null));let y0=Math.min(0,...vals),y1=Math.max(12,...vals);const st=niceStep(y1-y0,5);y0=Math.floor(y0/st)*st;y1=Math.ceil(y1/st)*st;
  const Y=v=>m.t+(1-(v-y0)/(y1-y0))*ih;
  for(let v=y0;v<=y1+1e-9;v+=st){el('line',{x1:m.l,x2:W-m.r,y1:Y(v),y2:Y(v),stroke:v===0?css('--ink-3'):css('--grid')},svg);const t=el('text',{x:m.l-8,y:Y(v)+4,'text-anchor':'end'},svg);t.textContent=v}
  el('line',{x1:m.l,x2:W-m.r,y1:Y(12),y2:Y(12),stroke:css('--ink-3'),'stroke-dasharray':'3 3'},svg);
  const bw=iw/Math.max(1,groups.length),gap=2,barW=Math.max(2,Math.min(18,(bw*0.8-(n-1)*gap)/n));
  const tip=document.createElement('div');tip.className='tip';tip.hidden=true;host.appendChild(tip);
  const every=Math.ceil(groups.length/(W<560?7:16));
  const hits=[];
  groups.forEach((g,gi)=>{
    const cx=m.l+bw*gi+bw/2,x0=cx-(n*barW+(n-1)*gap)/2;
    if(gi%every===0){const t=el('text',{x:cx,y:H-6,'text-anchor':'middle'},svg);t.textContent=W<560?"'"+String(g.y).slice(2):g.y}
    g.v.forEach((v,i)=>{if(v==null)return;const x=x0+i*(barW+gap),top=Math.min(Y(v),Y(0)),h=Math.max(1,Math.abs(Y(v)-Y(0)));
      const r=Math.min(3,h/2,barW/2);
      const d=v>=0?`M${x},${Y(0)}V${top+r}Q${x},${top} ${x+r},${top}H${x+barW-r}Q${x+barW},${top} ${x+barW},${top+r}V${Y(0)}Z`
                 :`M${x},${Y(0)}V${top+h-r}Q${x},${top+h} ${x+r},${top+h}H${x+barW-r}Q${x+barW},${top+h} ${x+barW},${top+h-r}V${Y(0)}Z`;
      el('path',{d,fill:series[i].color},svg)});
    hits.push([g,cx]);
  });
  hits.forEach(([g,cx])=>{
    const hit=el('rect',{x:cx-bw/2,y:m.t,width:bw,height:ih,fill:'transparent'},svg);
    const show=()=>{tip.innerHTML=`<div style="margin-bottom:4px"><b>Oct ${g.y-1} → Oct ${g.y}</b></div>`+series.map((s,i)=>`<div class="r"><span><i class="sw" style="background:${s.color}"></i>${s.name}</span><span class="m">${g.v[i]==null?'—':fmtNum(g.v[i])+' mo'}</span></div>`).join('');
      tip.hidden=false;const hw=host.clientWidth,tx=cx/W*hw;tip.style.left=(tx+14+tip.offsetWidth>hw?tx-14-tip.offsetWidth:tx+14)+'px';tip.style.top='8px';hit.setAttribute('fill',css('--grid'));hit.setAttribute('fill-opacity','.5')};
    hit.addEventListener('pointerenter',show);hit.addEventListener('pointerdown',show);
    hit.addEventListener('pointerleave',()=>{tip.hidden=true;hit.setAttribute('fill','transparent')});
  });
}

function legend(id,items){document.getElementById(id).innerHTML=items.map(i=>`<span><i class="${i.dash?'lg-dash':'lg-line'}" style="border-color:${i.color}"></i>${i.label}</span>`).join('')}

function stats(s){
  if(!s.g)return `<div class="card na"><h2><i class="sw" style="background:${s.color}"></i>${s.full}</h2><div class="note">No data for this category in this region's ${S.mode==='filing'?'Dates for Filing':'Final Action'} chart.</div></div>`;
  const L=SRC.latest,mp=new Map(s.g.all);
  if(!mp.has(L))return `<div class="card na"><h2><i class="sw" style="background:${s.color}"></i>${s.full}</h2><div class="note">This category is no longer listed separately in the ${fmtB(L)} bulletin.</div></div>`;
  const cur=mp.get(L),cn=cutNum(L,cur);
  const wait=mnum(L)-cn;
  const mv=p=>mp.has(p)?(cn-cutNum(p,mp.get(p)))*12:null;
  const m12=mv(monthAdd(L,-12)),m36=mv(monthAdd(L,-36));
  const st=startMonth();let retro=0,prev=null;for(const[m,d]of s.g.all){const v=cutNum(m,d);if(m>=st&&prev!=null&&v<prev-1e-6)retro++;prev=v}
  let pdLine='';
  if(S.pd){const p=dnum(S.pd);
    if(cur==null||p<cn)pdLine=`<span class="pill ok">${S.mode==='filing'?'Can file now':'Current for approval'}</span>`;
    else{const gap=(p-cn)*12;const rate=m36!=null?m36/36:null;const yrs=rate>0?gap/rate/12:null;
      pdLine=`<span class="pill no">${gap.toFixed(0)} months to go</span>`+(yrs?` <span class="d">≈ ${yrs.toFixed(1)} yrs at 3-yr pace</span>`:'')}}
  return `<div class="card"><h2><i class="sw" style="background:${s.color}"></i>${s.full}</h2><div class="stats">
   <div class="stat"><div class="k">${fmtB(L)} cutoff</div><div class="v">${cur==null?'C (current)':cur}</div><div>${pdLine}</div></div>
   <div class="stat"><div class="k">Wait in line</div><div class="v">${wait.toFixed(1)} yrs</div><div class="d">bulletin month − cutoff</div></div>
   <div class="stat"><div class="k">Advance, last 12 mo</div><div class="v">${m12==null?'—':fmtNum(m12,0)+' mo'}</div><div class="d">vs ${fmtB(monthAdd(L,-12))}</div></div>
   <div class="stat"><div class="k">Avg per year, last 3 yrs</div><div class="v">${m36==null?'—':(m36/3).toFixed(1)+' mo'}</div><div class="d">${retro} retrogression${retro===1?'':'s'} in range</div></div>
  </div></div>`;
}

function renderChips(){
  document.getElementById('cats').innerHTML=CATS.map(c=>`<button class="chip" type="button" id="cat-${c.k}" data-k="${c.k}" aria-pressed="${S.cats.includes(c.k)}"><i class="sw" style="background:var(${c.c})"></i>${c.name}</button>`).join('');
}

function render(){
  document.getElementById('h1').textContent=CNAME[S.country]+' Employment-Based Priority Dates';
  const st=startMonth(),L=SRC.latest;
  const ss=CATS.filter(c=>S.cats.includes(c.k)).map(c=>({...c,color:css(c.c),g:getCat(c)}));
  document.getElementById('cards').innerHTML=ss.length?ss.map(stats).join(''):'<div class="card"><div class="note">Select at least one category above.</div></div>';
  const live=ss.filter(s=>s.g);
  const pdv=S.pd?dnum(S.pd):null;
  const l1=[],l2=[];
  live.forEach(s=>{const pts=s.g.all.filter(p=>p[0]>=st);
    l1.push({label:s.name,color:s.color,step:true,pts:pts.map(([m,d])=>[mnum(m),cutNum(m,d)]),raw:pts});
    l2.push({label:s.name,color:s.color,step:true,pts:pts.map(([m,d])=>[mnum(m),mnum(m)-cutNum(m,d)])});
    if(S.proj&&s.g.q.length){l1.push({label:s.name+' projected',color:s.color,dash:true,pts:s.g.q.map(([m,d])=>[mnum(m),cutNum(m,d)])});
      l2.push({label:s.name+' projected',color:s.color,dash:true,pts:s.g.q.map(([m,d])=>[mnum(m),mnum(m)-cutNum(m,d)])})}});
  const hasProj=l1.some(l=>l.dash);
  for(const id of['c1','c2','c3'])document.getElementById(id).innerHTML='';
  if(!live.length){['lg1','lg2','lg3'].forEach(i=>document.getElementById(i).innerHTML='<span>No categories to show</span>');document.getElementById('tbl').innerHTML='';return}
  const yf=v=>String(Math.round(v*12)/12%1===0?Math.round(v):v.toFixed(1));
  const df=v=>{const y=Math.floor(v+1e-9),r=(v-y)*12,mo=Math.floor(r+1e-6),d=Math.round((r-mo)*365.25/12)+1;return `${y}-${String(mo+1).padStart(2,'0')}-${String(Math.min(d,31)).padStart(2,'0')}`};
  legend('lg1',[...l1.map(l=>({label:l.label,color:l.color,dash:l.dash})),...(pdv!=null?[{label:'My priority date',color:css('--pd'),dash:true}]:[])]);
  lineChart(document.getElementById('c1'),{label:'Cutoff date trend',lines:l1,yFmt:yf,hline:pdv,nowX:hasProj?mnum(L):null,
    tipFmt:(v,l,x)=>{const r=l.raw&&l.raw.find(p=>Math.abs(mnum(p[0])-x)<1e-6);return r&&r[1]==null?'C':df(v)}});
  legend('lg2',l2.map(l=>({label:l.label,color:l.color,dash:l.dash})));
  lineChart(document.getElementById('c2'),{label:'Wait in line',lines:l2,y0:0,yFmt:v=>v.toFixed(0)+'y',nowX:hasProj?mnum(L):null,tipFmt:v=>v.toFixed(1)+' yrs'});
  const maps=live.map(s=>new Map(s.g.all));const groups=[];
  const y0=+st.slice(0,4)+(st.slice(5)<='10'?1:2);
  for(let y=y0;y<=+L.slice(0,4);y++){const a=`${y-1}-10`,b=`${y}-10`;
    if(b>L)break;
    groups.push({y,v:maps.map(o=>o.has(a)&&o.has(b)?(cutNum(b,o.get(b))-cutNum(a,o.get(a)))*12:null)})}
  legend('lg3',[...live.map(s=>({label:s.name,color:s.color})),{label:'12 months = keeping pace',color:css('--ink-3'),dash:true}]);
  barChart(document.getElementById('c3'),groups,live);
  const months=[...new Set(live.flatMap(s=>s.g.all.map(p=>p[0])))].filter(m=>m>=st).sort().reverse();
  const dl=(o,m)=>{const pm=monthAdd(m,-1);if(!o.has(m)||!o.has(pm))return'';const v=(cutNum(m,o.get(m))-cutNum(pm,o.get(pm)))*12;if(Math.abs(v)<.05)return'';return `<span class="${v>0?'up':'dn'}">${fmtNum(v)}</span>`};
  document.getElementById('tbl').innerHTML=`<thead><tr><th>Bulletin</th>${live.map(s=>`<th>${s.name}</th><th>Change (mo)</th>`).join('')}</tr></thead><tbody>`+
   months.map(m=>`<tr><td>${m}</td>${maps.map(o=>`<td>${o.has(m)?fmtCut(o.get(m)):'—'}</td><td>${dl(o,m)}</td>`).join('')}</tr>`).join('')+'</tbody>';
}

// ---- sync with the artifact database ----
let DB=null;
function fmtTime(iso){try{const d=new Date(iso);return d.toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch(e){return iso}}
function syncLine(){document.getElementById('sync-s').textContent=`Data: ${fmtB(SRC.latest)} bulletin · updated ${fmtTime(SRC.fetched)}`}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,9000)}
function expectedLatest(){const n=new Date();const cur=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');return n.getDate()>=15?monthAdd(cur,1):cur}
async function loadAll(meta){
  const snap=await DB.collection('bulletin').get();const next=structuredClone(SRC.countries);let n=0;
  snap.docs.forEach(d=>{if(d.id==='meta')return;const b=d.data();if(!b||!b.country||!b.table||!Array.isArray(b.series))return;
    next[b.country]=next[b.country]||{label:b.label};next[b.country][b.table]=b.series;n++});
  if(n)applyData(meta,next);
  return n;
}
function applyData(meta,countries){SRC={latest:meta.latest_bulletin,fetched:meta.fetched_at,countries};syncLine();render()}
function upToDate(){const exp=expectedLatest();
  if(SRC.latest>=exp)return `Up to date: ${fmtB(SRC.latest)} bulletin.`;
  return DB?`This is the newest data in the database (${fmtB(SRC.latest)} bulletin). The State Department usually publishes next month's bulletin mid-month. If the ${fmtB(exp)} bulletin is out, ask Claude to run ~/visa-bulletin/scrape.py to sync it.`
           :`Up to date with the latest sync (${fmtB(SRC.latest)} bulletin). The site checks for a new bulletin every day; the ${fmtB(exp)} bulletin usually appears mid-month.`}
async function checkDb(manual){
  const m=await DB.doc('bulletin/meta').get();
  if(!m.exists){if(manual)toast('The synced database is empty. Showing the built-in snapshot.');return}
  const meta=m.data();
  if(meta.fetched_at!==SRC.fetched){const was=SRC.latest;await loadAll(meta);
    if(manual)toast(meta.latest_bulletin>was?`Updated to the ${fmtB(meta.latest_bulletin)} bulletin.`:`Loaded the latest synced data (${fmtB(meta.latest_bulletin)} bulletin).`)}
  else if(manual)toast(upToDate());
}
// On a regular website the data file sits next to the page.
async function checkSite(manual){
  let j;
  try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;j=await r.json()}
  catch(e){if(manual)toast('Could not load newer data here. Showing the built-in snapshot.');return}
  if(j.fetched_at!==SRC.fetched){const was=SRC.latest;applyData(j,j.countries);
    if(manual)toast(j.latest_bulletin>was?`Updated to the ${fmtB(j.latest_bulletin)} bulletin.`:`Loaded the latest data (${fmtB(j.latest_bulletin)} bulletin).`)}
  else if(manual)toast(upToDate());
}
const check=manual=>DB?checkDb(manual):checkSite(manual);
document.getElementById('refresh').addEventListener('click',async e=>{
  const b=e.currentTarget;b.disabled=true;b.classList.add('busy');document.getElementById('refresh-t').textContent='Refreshing…';
  try{await check(true)}catch(err){toast('Refresh failed: '+(err&&err.message||err)+'. Try again in a moment.')}
  b.disabled=false;b.classList.remove('busy');document.getElementById('refresh-t').textContent='Refresh data';
});
(async()=>{
  if(window.claude?.use){try{DB=await window.claude.use('db')}catch(e){DB=null}}
  if(DB){try{await checkDb(false)}catch(e){}
    DB.doc('bulletin/meta').onSnapshot(s=>{if(s.exists&&s.data().fetched_at!==SRC.fetched)loadAll(s.data()).catch(()=>{})},()=>{});}
  else if(location.protocol.startsWith('http'))checkSite(false);
})();

// ---- controls ----
function seg(id,key){const g=document.getElementById(id);g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S[key]=b.dataset.v;g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));save();render()})}
function save(){try{localStorage.setItem('ebdash2',JSON.stringify(S))}catch(e){}}
try{const s=JSON.parse(localStorage.getItem('ebdash2')||'null');if(s)Object.assign(S,s)}catch(e){}
if(!CNAME[S.country])S.country='china';
document.getElementById('country').value=S.country;
document.querySelectorAll('#mode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===S.mode));
document.querySelectorAll('#range button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===S.range));
document.getElementById('proj').checked=S.proj;document.getElementById('pd').value=S.pd||'';
renderChips();
document.getElementById('cats').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const k=b.dataset.k;
  S.cats=S.cats.includes(k)?S.cats.filter(x=>x!==k):CATS.map(c=>c.k).filter(x=>x===k||S.cats.includes(x));b.setAttribute('aria-pressed',S.cats.includes(k));save();render()});
document.getElementById('country').addEventListener('change',e=>{S.country=e.target.value;save();render()});
seg('mode','mode');seg('range','range');
document.getElementById('proj').addEventListener('change',e=>{S.proj=e.target.checked;save();render()});
document.getElementById('pd').addEventListener('input',e=>{S.pd=e.target.value;save();render()});
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(render,120)});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',render);
new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
syncLine();render();
