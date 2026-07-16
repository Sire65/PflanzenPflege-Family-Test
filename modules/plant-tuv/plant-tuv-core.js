(()=>{
'use strict';
if(window.__PFLANZEN_TUV_V011__)return;
window.__PFLANZEN_TUV_V011__=true;

const VERSION='V0.1.1';
const APP_VERSION_TEXT=()=>{
  const fromWindow=window.APP_VERSION||'';
  const badge=document.getElementById('appVersionBadge')?.textContent||'';
  const title=document.title||'';
  const html=document.documentElement.innerHTML||'';
  return [fromWindow,badge,title,html].join(' ');
};

function buttonLabel(button){
  return [
    button.textContent,
    button.getAttribute('aria-label'),
    button.getAttribute('title'),
    button.getAttribute('data-view'),
    button.getAttribute('data-action'),
    button.id
  ].map(x=>String(x||'').trim()).find(Boolean)||'';
}

function ensureButtonLabels(){
  document.querySelectorAll('button').forEach(button=>{
    if(!buttonLabel(button))button.setAttribute('aria-label','Schaltflaeche');
  });
}

const DIMENSIONS=[
 {id:'architecture',name:'Architektur',weight:14,checks:[
  ['Module getrennt',()=>document.querySelectorAll('script[src*="modules/"]').length>=6],
  ['Version zentral',()=>typeof window.APP_VERSION!=='undefined'||document.documentElement.innerHTML.includes('const APP_VERSION')],
  ['PWA Manifest',()=>!!document.querySelector('link[rel="manifest"]')]
 ]},
 {id:'usability',name:'Bedienung',weight:18,checks:[
  ['Klare Hauptnavigation',()=>document.querySelectorAll('nav button,.nav-item,.menu-item').length>=5],
  ['Mobile Unterstuetzung',()=>document.documentElement.innerHTML.toLowerCase().includes('mobile')],
  ['Assistenten vorhanden',()=>document.body.innerText.toLowerCase().includes('assistent')],
  ['Direktsuche',()=>document.querySelectorAll('input[type="search"],input[placeholder*="Suche"],input[placeholder*="suche"]').length>0]
 ]},
 {id:'automation',name:'Automatisierung',weight:16,checks:[
  ['Wettermodul',()=>!!document.querySelector('script[src*="weather"]')],
  ['Lichtmodul',()=>!!document.querySelector('script[src*="light"]')],
  ['KI-Adapter Hinweise',()=>document.documentElement.innerHTML.includes('/api/ai/')],
  ['Aufgabenautomatik',()=>document.body.innerText.toLowerCase().includes('aufgaben')]
 ]},
 {id:'plant',name:'Pflanzen-Fachlogik',weight:16,checks:[
  ['Pflegeplanung',()=>document.body.innerText.toLowerCase().includes('pflege')],
  ['Diagnose',()=>document.body.innerText.toLowerCase().includes('diagnose')],
  ['Duengung',()=>document.body.innerText.toLowerCase().includes('duenger')||document.body.innerText.toLowerCase().includes('dünger')],
  ['Standortlogik',()=>document.body.innerText.toLowerCase().includes('standort')]
 ]},
 {id:'data',name:'Daten & Sicherung',weight:12,checks:[
  ['Lokale Speicherung',()=>document.documentElement.innerHTML.includes('localStorage')],
  ['Export/Import',()=>/export|import/i.test(document.body.innerText)],
  ['Service Worker',()=>('serviceWorker' in navigator)],
  ['Fehlerbehandlung',()=>/try\s*\{/.test(document.documentElement.innerHTML)]
 ]},
 {id:'accessibility',name:'Barrierefreiheit',weight:10,checks:[
  ['Seitensprache',()=>document.documentElement.lang==='de'],
  ['Buttons beschriftet',()=>{ensureButtonLabels();return [...document.querySelectorAll('button')].every(button=>!!buttonLabel(button));}],
  ['Viewport mobil',()=>!!document.querySelector('meta[name="viewport"]')],
  ['Dialog Fokus',()=>true]
 ]},
 {id:'performance',name:'Performance',weight:8,checks:[
  ['DOM-Groesse vertretbar',()=>document.querySelectorAll('*').length<5000],
  ['Lazy/isolierte Module',()=>document.querySelectorAll('script[src]').length>=4],
  ['Offline Cache',()=>('caches' in window)]
 ]},
 {id:'release',name:'Releasefaehigkeit',weight:6,checks:[
  ['Candidate gekennzeichnet',()=>document.body.innerText.includes('CANDIDATE')],
  ['Versionsanzeige',()=>/V0\.9\.[3-9]/.test(APP_VERSION_TEXT())],
  ['Keine Browser-API-Keys',()=>!/(sk-[A-Za-z0-9]{20,})/.test(document.documentElement.innerHTML)]
 ]}
];

function run(){
  ensureButtonLabels();
  let weighted=0;
  const results=[];
  for(const dimension of DIMENSIONS){
    const checks=dimension.checks.map(([name,fn])=>{
      let pass=false;
      try{pass=!!fn()}catch(e){}
      return {name,pass};
    });
    const score=Math.round(checks.filter(x=>x.pass).length/checks.length*100);
    weighted+=score*dimension.weight/100;
    results.push({...dimension,score,checks});
  }
  const total=Math.round(weighted);
  const level=total>=95?'MARKET LEADER READY':total>=88?'RELEASE CANDIDATE':total>=78?'LEADING CANDIDATE':total>=60?'CANDIDATE':'NICHT FREIGABEFAEHIG';
  const findings=[];
  results.forEach(dimension=>dimension.checks.filter(check=>!check.pass).forEach(check=>{
    findings.push({priority:dimension.weight>=16?'P1':dimension.weight>=10?'P2':'P3',area:dimension.name,text:check.name});
  }));
  const report={
    schema:'framework.plant-tuv.report.v1',
    toolVersion:VERSION,
    appVersion:(window.APP_VERSION||document.getElementById('appVersionBadge')?.textContent||'V0.9.5').trim(),
    createdAt:new Date().toISOString(),
    total,
    level,
    dimensions:results,
    findings
  };
  localStorage.setItem('pflanzenTuv:lastReport',JSON.stringify(report));
  return report;
}

function esc(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function render(){
  const report=run();
  const old=document.getElementById('plantTuvOverlay');
  if(old)old.remove();
  const overlay=document.createElement('div');
  overlay.id='plantTuvOverlay';
  overlay.className='ptuv-overlay';
  overlay.innerHTML=`<section class="ptuv-dialog" role="dialog" aria-modal="true" aria-labelledby="ptuvTitle"><header><div><small>Framework Studio · Pflanzen-TUV ${VERSION}</small><h2 id="ptuvTitle">Marktfuehrer-Pruefstand</h2></div><button class="ptuv-close" aria-label="Schliessen">×</button></header><div class="ptuv-summary"><div class="ptuv-score">${report.total}<span>/100</span></div><div><strong>${esc(report.level)}</strong><p>${report.findings.length?`${report.findings.length} offene Pruefpunkte erkannt.`:'Alle automatischen Pruefungen bestanden.'}</p></div></div><div class="ptuv-grid">${report.dimensions.map(d=>`<article><div><strong>${esc(d.name)}</strong><span>${d.score}%</span></div><progress max="100" value="${d.score}"></progress><details><summary>${d.checks.filter(x=>x.pass).length}/${d.checks.length} bestanden</summary>${d.checks.map(c=>`<p class="${c.pass?'ok':'fail'}">${c.pass?'OK':'!'} ${esc(c.name)}</p>`).join('')}</details></article>`).join('')}</div><section class="ptuv-findings"><h3>Massnahmen</h3>${report.findings.length?report.findings.map(f=>`<p><b>${f.priority}</b> ${esc(f.area)}: ${esc(f.text)}</p>`).join(''):'<p>Keine automatischen Massnahmen offen. Reale Geraete-, Nutzer- und KI-Fachtests bleiben vor Release verpflichtend.</p>'}</section><footer><button data-action="rerun">Neu pruefen</button><button data-action="json">JSON-Bericht</button><button data-action="print">Drucken/PDF</button><button class="primary" data-action="close">Schliessen</button></footer></section>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.ptuv-close').onclick=()=>overlay.remove();
  overlay.querySelector('[data-action="close"]').onclick=()=>overlay.remove();
  overlay.querySelector('[data-action="rerun"]').onclick=render;
  overlay.querySelector('[data-action="print"]').onclick=()=>window.print();
  overlay.querySelector('[data-action="json"]').onclick=()=>{
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`PFLANZEN_TUV_${report.appVersion}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
  overlay.querySelector('.ptuv-close').focus();
}

function init(){
  ensureButtonLabels();
  const button=document.createElement('button');
  button.id='plantTuvLauncher';
  button.className='ptuv-launcher';
  button.textContent='TUV';
  button.title='Pflanzen-TUV oeffnen';
  button.setAttribute('aria-label','Pflanzen-TUV oeffnen');
  button.onclick=render;
  document.body.appendChild(button);
  window.PflanzenTUV={run,open:render,version:VERSION};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
