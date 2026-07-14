(function(global){'use strict';
 const VERSION='0.1.0'; let cfg=null,last=null;
 function init(options){cfg=Object.assign({lookAheadDays:3,defaultMarginC:2},options||{});if(!cfg.weatherSource||!cfg.getSubjects)throw new Error('FrostProtectionModule: Abhängigkeiten fehlen');return api}
 function evaluateSubject(s,minC,date){
   const limit=Number.isFinite(Number(s.safeTemperatureC))?Number(s.safeTemperatureC):0;
   const margin=Number.isFinite(Number(s.warningMarginC))?Number(s.warningMarginC):cfg.defaultMarginC;
   const trigger=limit+margin, delta=minC-limit;
   let level='green',action='none';
   if(minC<=limit){level='red';action=s.movable?'move_inside':'cover'}
   else if(minC<=trigger){level='orange';action=s.movable?'shelter':'prepare_cover'}
   else if(minC<=trigger+2){level='yellow';action='prepare'}
   return {...s,date,forecastMinC:minC,safeTemperatureC:limit,warningMarginC:margin,deltaC:delta,level,action};
 }
 function recommendation(x){
   const preferred=x.preferredProtectionLocationName||x.preferredProtectionLocationId||'geeigneten frostfreien Schutzort';
   if(x.action==='move_inside')return `Bis zum Abend nach ${preferred} bringen.`;
   if(x.action==='shelter')return `Windgeschützt unterstellen; bevorzugt ${preferred}.`;
   if(x.action==='cover')return 'Wurzelbereich schützen und Pflanze mit atmungsaktivem Vlies abdecken.';
   if(x.action==='prepare_cover')return 'Vlies und Kübelisolierung bereitlegen.';
   if(x.action==='prepare')return 'Wetterentwicklung beobachten und Schutzmaterial prüfen.';
   return 'Keine Maßnahme erforderlich.';
 }
 function buildPlan(){
   const ws=cfg.weatherSource.getState(); if(!ws.data||!ws.data.days) return {status:'unavailable',reason:'Keine Wetterdaten',items:[],summary:{}};
   const days=ws.data.days.slice(0,cfg.lookAheadDays),subjects=cfg.getSubjects()||[],items=[];
   for(const s of subjects) for(const d of days){const x=evaluateSubject(s,Number(d.minC),d.date);if(x.level!=='green')items.push({...x,recommendation:recommendation(x)})}
   const rank={red:0,orange:1,yellow:2,green:3};items.sort((a,b)=>rank[a.level]-rank[b.level]||a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
   const summary={red:items.filter(x=>x.level==='red').length,orange:items.filter(x=>x.level==='orange').length,yellow:items.filter(x=>x.level==='yellow').length,total:items.length,weatherStatus:ws.status,weatherUpdatedAt:ws.updatedAt};
   last={status:'ok',createdAt:new Date().toISOString(),items,summary};return last;
 }
 function materialList(plan=last||buildPlan()){const m={vlies:0,kuebelisolierung:0,untersetzer:0};for(const x of plan.items){if(['cover','prepare_cover'].includes(x.action))m.vlies++;if(x.containerPlant)m.kuebelisolierung++;if(x.containerPlant&&x.level==='red')m.untersetzer++;}return m}
 const api={VERSION,init,buildPlan,materialList,evaluateSubject};global.FrostProtectionModule=api;
})(window);
