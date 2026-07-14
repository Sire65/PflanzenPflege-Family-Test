(function(global){'use strict';
 const VERSION='0.1.0';let cfg={};
 function init(options){cfg=options||{};return api}
 function normalize(p){return {...p,bloomMonths:Array.from(new Set((p.bloomMonths||[]).map(Number).filter(m=>m>=1&&m<=12))).sort((a,b)=>a-b)}}
 function getEntries(filter={}){
   let data=(filter.source==='library'?(cfg.getLibrary?.()||[]):filter.source==='own'?(cfg.getOwnPlants?.()||[]):[...(cfg.getOwnPlants?.()||[]),...(cfg.getLibrary?.()||[])]).map(normalize);
   if(filter.month)data=data.filter(p=>p.bloomMonths.includes(Number(filter.month)));
   if(filter.group)data=data.filter(p=>p.group===filter.group);
   if(filter.color)data=data.filter(p=>(p.colors||[]).includes(filter.color));
   if(filter.location)data=data.filter(p=>p.locationId===filter.location);
   return data.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
 }
 function matrix(filter={}){return getEntries(filter).map(p=>({id:p.id,name:p.name,source:p.source||'unknown',months:Array.from({length:12},(_,i)=>p.bloomMonths.includes(i+1)),observed:p.observedBloom||null}))}
 const api={VERSION,init,getEntries,matrix};global.BloomCalendarModule=api;
})(window);
