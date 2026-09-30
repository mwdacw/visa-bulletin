// ---- Filings & approvals tab ----
const TYPES=[
 {k:'NIW',name:'EB-2 NIW',cat:'eb2'},{k:'E21',name:'EB-2 via PERM (E21)',cat:'eb2'},
 {k:'E11',name:'EB-1A extraordinary ability',cat:'eb1'},{k:'E12',name:'EB-1B outstanding researcher',cat:'eb1'},
 {k:'E13',name:'EB-1C multinational manager',cat:'eb1'},{k:'E31',name:'EB-3 skilled worker',cat:'eb3'},
 {k:'E32',name:'EB-3 professional',cat:'eb3'},{k:'EW3',name:'EB-3 other worker',cat:'eb3o'},
 {k:'EB1',name:'All EB-1',cat:'eb1'},{k:'EB2',name:'All EB-2',cat:'eb2'},{k:'EB3',name:'All EB-3',cat:'eb3'},
 {k:'TOTAL',name:'All I-140s',cat:'total'},
];
const AW_CATS=[['eb1','EB-1','--c3'],['eb2','EB-2','--c1'],['eb3','EB-3','--c2'],['eb3o','EB-3 Other','--c4'],['eb4','EB-4','--c5'],['eb5u','EB-5','--c6']];
const AW_REGION={china:'china',india:'india',mexico:'mexico',philippines:'philippines',row:'row',centralam:'row'};
const COB={china:'china',india:'india',philippines:'philippines'};
let STATS=typeof STATS0!=='undefined'?STATS0:null;
const F={type:'NIW'};
const fmtInt=v=>v==null?'—':Math.round(v).toLocaleString('en-US');
const qParse=k=>{const m=/FY(\d{4})Q(\d)/.exec(k);return{fy:+m[1],q:+m[2]}};
// Quarter start as a calendar number (FY2024 Q1 starts Oct 2023).
const qX=k=>{const{fy,q}=qParse(k);return fy-1+(9+3*(q-1))/12};
const qLabel=k=>{const{fy,q}=qParse(k);return`Q${q} FY${String(fy).slice(2)}`};
const qLong=k=>{const{fy,q}=qParse(k);const s=9+3*(q-1),a=new Date(fy-1,s,1),b=new Date(fy-1,s+2,1);
  return`FY${fy} Q${q} (${MON[a.getMonth()]} ${a.getFullYear()} – ${MON[b.getMonth()]} ${b.getFullYear()})`};
const rate=v=>v&&(v[1]+v[2])?v[1]/(v[1]+v[2])*100:null;
const monthX=m=>mnum(m);

function kpi(k,v,d){return`<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d||''}</div></div>`}

function renderFilings(){
  if(document.getElementById('tab-filings').hidden)return;
  if(!STATS){document.getElementById('f-kpis').innerHTML='<div class="note">Filing statistics are not available in this copy.</div>';return}
  const T=TYPES.find(t=>t.k===F.type)||TYPES[0];
  const Q=STATS.i140_quarterly,qs=Object.keys(Q);const Lq=qs[qs.length-1],cur=Q[Lq][T.k],yAgo=Q[qs[qs.length-5]]?.[T.k];
  const region=S.country,awKey=AW_REGION[region],aw=STATS.awaiting,awDates=Object.keys(aw),awL=awDates[awDates.length-1];
  const awCur=aw[awL]?.[awKey]?.[T.cat];
  const perm=STATS.perm,remD=Object.keys(perm.remaining),remL=remD[remD.length-1];
  const r=rate(cur),r0=rate(yAgo);
  document.getElementById('f-kpis').innerHTML=
    kpi(`${T.name} received, ${qLabel(Lq)}`,fmtInt(cur[0]),yAgo?`${fmtNum((cur[0]/yAgo[0]-1)*100,0)}% vs a year earlier`:'')+
    kpi(`Approval rate, ${qLabel(Lq)}`,r==null?'—':r.toFixed(1)+'%',r0!=null?`${qLabel(qs[qs.length-5])}: ${r0.toFixed(1)}%`:'')+
    kpi(`${T.name} pending at USCIS`,fmtInt(cur[3]),yAgo?`${fmtInt(yAgo[3])} a year earlier`:'')+
    kpi(`Approved, waiting for a visa · ${CNAME[region]}`,fmtInt(awCur),`${T.cat==='total'?'all EB':AW_CATS.find(c=>c[0]===T.cat)?.[1]||''} · as of ${fmtB(awL)}`)+
    kpi('PERM applications pending at DOL',fmtInt(perm.remaining[remL]),`as of ${new Date(remL+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`);
  // 1. received / approved / denied per quarter
  const s3=[{name:'Received',color:css('--c1')},{name:'Approved',color:css('--c3')},{name:'Denied',color:css('--c2')}];
  document.getElementById('f1-h').textContent=`${T.name} petitions per quarter`;
  legend('f1-lg',s3.map(s=>({label:s.name,color:s.color})));
  barChart(document.getElementById('f1'),qs.map(k=>({k,v:Q[k][T.k].slice(0,3)})),s3,
    {ref:null,aria:'I-140 petitions per quarter',label:g=>qLabel(g.k),short:g=>`Q${qParse(g.k).q}'${String(qParse(g.k).fy).slice(2)}`,title:g=>qLong(g.k),fmt:fmtInt,yFmt:v=>v>=1000?(v/1000)+'k':v,
     extra:g=>{const p=Q[g.k][T.k][3],rr=rate(Q[g.k][T.k]);return`<div class="r"><span>Pending at quarter end</span><span class="m">${fmtInt(p)}</span></div><div class="r"><span>Approval rate</span><span class="m">${rr==null?'—':rr.toFixed(1)+'%'}</span></div>`}});
  // 2. approval rate
  const qHead=x=>{const k=qs.find(k=>Math.abs(qX(k)-x)<1e-6);return k?qLong(k):''};
  const l2=[{label:T.name,color:css('--c1'),markers:true,pts:qs.map(k=>[qX(k),rate(Q[k][T.k])])}];
  if(T.k!=='TOTAL')l2.push({label:'All I-140s',color:css('--ink-3'),markers:true,pts:qs.map(k=>[qX(k),rate(Q[k].TOTAL)])});
  legend('f2-lg',l2.map(l=>({label:l.label,color:l.color})));
  lineChart(document.getElementById('f2'),{label:'Approval rate',lines:l2,y0:0,y1:100,yFmt:v=>Math.round(v)+'%',head:qHead,tipFmt:v=>v==null?'—':v.toFixed(1)+'%'});
  // 3. pending
  const l3=[{label:T.name,color:css('--c1'),markers:true,pts:qs.map(k=>[qX(k),Q[k][T.k][3]])}];
  legend('f3-lg',l3.map(l=>({label:l.label,color:l.color})));
  lineChart(document.getElementById('f3'),{label:'Pending I-140s',lines:l3,y0:0,yFmt:v=>v>=1000?Math.round(v/1000)+'k':String(Math.round(v)),head:qHead,tipFmt:fmtInt});
  // 4. awaiting visa by region
  document.getElementById('f4-h').textContent=`Approved I-140s waiting for a visa number · ${CNAME[region]}`;
  document.getElementById('f4-sub').textContent=(region==='centralam'?'USCIS does not break out El Salvador, Guatemala and Honduras; showing Rest of the World. ':'')+
    'Approved petitions whose priority date is not yet current, by preference (EB-4 and EB-5 include I-360 and I-526 petitions). Primary applicants only; spouses and children add roughly one more person each.';
  const awHead=x=>{const d=awDates.find(m=>Math.abs(monthX(m)-x)<1e-6);return d?'As of '+fmtB(d):''};
  const l4=AW_CATS.map(([c,n,col])=>({label:n,color:css(col),markers:true,pts:awDates.map(d=>[monthX(d),aw[d][awKey]?.[c]??null])}))
    .filter(l=>l.pts.some(p=>p[1]));
  legend('f4-lg',l4.map(l=>({label:l.label,color:l.color})));
  lineChart(document.getElementById('f4'),{label:'Approved petitions awaiting a visa',lines:l4,y0:0,yFmt:v=>v>=1000?Math.round(v/1000)+'k':String(Math.round(v)),head:awHead,tipFmt:fmtInt});
  // 5. I-140s filed per FY by country of birth
  const C=STATS.i140_country,cKey=COB[region]||'all',cc=C.countries[cKey];
  document.getElementById('f5-h').textContent=`I-140s filed per fiscal year · ${cKey==='all'?'all countries':CNAME[region]}`;
  document.getElementById('f5-sub').textContent=(cKey==='all'?`USCIS publishes this table only for all countries and the top five (India, China, Philippines, Brazil, Vietnam), so ${CNAME[region]} shows all countries. `:'')+
    `Counted by the year the petition was filed, with its status as of ${C.label}, so recent years still have many pending cases. FY${C.years[C.years.length-1]} is a partial year.`;
  const s5=[['EB1','EB-1','--c3'],['EB2','EB-2','--c1'],['EB3','EB-3','--c2']].map(([k,n,c])=>({k,name:n,color:css(c)}));
  legend('f5-lg',s5.map(s=>({label:s.name,color:s.color})));
  barChart(document.getElementById('f5'),C.years.map((y,i)=>({y,i,v:s5.map(s=>cc[s.k]?.total?.[i]??null)})),s5,
    {ref:null,aria:'I-140s filed per fiscal year',label:g=>'FY'+String(g.y).slice(2),short:g=>"'"+String(g.y).slice(2),title:g=>`Filed in FY${g.y}${g.y===C.years[C.years.length-1]?' (partial)':''}`,fmt:fmtInt,yFmt:v=>v>=1000?(v/1000)+'k':v,
     extra:g=>s5.map(s=>{const e=cc[s.k];if(!e)return'';const niw=s.k==='EB2'&&e.sub?.NIW?` · NIW approved ${fmtInt(e.sub.NIW[g.i])}`:'';
       return`<div class="d" style="margin-top:4px">${s.name}: ${fmtInt(e.approved?.[g.i])} approved · ${fmtInt(e.denied?.[g.i])} denied · ${fmtInt(e.pending?.[g.i])} pending${niw}</div>`}).join('')});
  // 6. PERM
  const P=perm.quarterly,pq=Object.keys(P);
  const s6=[{name:'Received',color:css('--c1')},{name:'Certified',color:css('--c3')}];
  legend('f6-lg',s6.map(s=>({label:s.name,color:s.color})));
  barChart(document.getElementById('f6'),pq.map(k=>({k,v:[P[k].received,P[k].certified]})),s6,
    {ref:null,aria:'PERM applications per quarter',label:g=>qLabel(g.k),short:g=>`Q${qParse(g.k).q}'${String(qParse(g.k).fy).slice(2)}`,title:g=>qLong(g.k),fmt:fmtInt,yFmt:v=>v>=1000?(v/1000)+'k':v,
     extra:g=>`<div class="r"><span>Denied</span><span class="m">${fmtInt(P[g.k].denied)}</span></div><div class="r"><span>Withdrawn</span><span class="m">${fmtInt(P[g.k].withdrawn)}</span></div>`});
  document.getElementById('f6-rem').innerHTML='<span>Applications pending at DOL:</span>'+remD.map(d=>`<span>${new Date(d+'T00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'})} <b>${fmtInt(perm.remaining[d])}</b></span>`).join('');
  // 7. I-485
  const I=STATS.i485,iq=Object.keys(I).reverse();
  document.getElementById('f7').innerHTML='<thead><tr><th>Quarter</th><th>Received</th><th>Approved</th><th>Denied</th><th>Pending at end</th></tr></thead><tbody>'+
    iq.map(k=>`<tr><td>${qLong(k)}</td>${I[k].eb.map(v=>`<td>${fmtInt(v)}</td>`).join('')}</tr>`).join('')+'</tbody>';
}

function statsLine(){if(!STATS)return;const Q=Object.keys(STATS.i140_quarterly),P=Object.keys(STATS.perm.quarterly);
  document.getElementById('sync-s').textContent=`USCIS data through ${qLabel(Q[Q.length-1])} · PERM through ${qLabel(P[P.length-1])} · updated ${fmtTime(STATS.updated_at)}`}

function showTab(t){
  const f=t==='filings';
  document.getElementById('tab-dates').hidden=f;document.getElementById('tab-filings').hidden=!f;
  document.getElementById('tb-dates').setAttribute('aria-selected',!f);document.getElementById('tb-filings').setAttribute('aria-selected',f);
  document.getElementById('f-country').value=S.country;
  if(f){statsLine();renderFilings()}else{syncLine();render()}
}
document.querySelector('nav.tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(!b)return;
  try{history.replaceState(null,'','#'+b.dataset.tab)}catch(err){}showTab(b.dataset.tab)});
document.getElementById('f-type').innerHTML=TYPES.map(t=>`<option value="${t.k}">${t.name}</option>`).join('');
try{const s=JSON.parse(localStorage.getItem('ebdash-f')||'null');if(s&&TYPES.some(t=>t.k===s.type))F.type=s.type}catch(e){}
document.getElementById('f-type').value=F.type;
document.getElementById('f-type').addEventListener('change',e=>{F.type=e.target.value;try{localStorage.setItem('ebdash-f',JSON.stringify(F))}catch(err){}renderFilings()});
document.getElementById('f-country').addEventListener('change',e=>{S.country=e.target.value;document.getElementById('country').value=S.country;save();renderFilings()});
// The dates tab's own render/refresh also repaint this tab when it is visible.
const _render=render;render=function(){if(!document.getElementById('tab-filings').hidden){renderFilings();return}_render()};
const _syncLine=syncLine;syncLine=function(){if(!document.getElementById('tab-filings').hidden){statsLine();return}_syncLine()};
async function checkStats(manual){
  if(!location.protocol.startsWith('http'))return false;
  try{const r=await fetch('stats.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return false;const j=await r.json();
    if(!STATS||j.updated_at!==STATS.updated_at){STATS=j;renderFilings();statsLine();return true}}catch(e){}
  return false;
}
document.getElementById('refresh').addEventListener('click',()=>{checkStats(true)});
if(!window.claude?.use)checkStats(false);
if(location.hash==='#filings')showTab('filings');
