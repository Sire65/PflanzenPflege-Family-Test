(function(global){'use strict';
 const VERSION='0.1.1';
 const library=[
  {id:'lib-rose',name:'Rose',source:'library',group:'Rosen',bloomMonths:[5,6,7,8,9],colors:['mehrfarbig']},
  {id:'lib-dipladenia',name:'Dipladenia',source:'library',group:'Kübelpflanzen',bloomMonths:[5,6,7,8,9,10],colors:['rot','rosa','weiß']},
  {id:'lib-geranie',name:'Geranie / Pelargonie',source:'library',group:'Blühpflanzen',bloomMonths:[5,6,7,8,9,10],colors:['rot','rosa','weiß']},
  {id:'lib-olive',name:'Olivenbaum',source:'library',group:'Mediterrane Kübelpflanzen',bloomMonths:[5,6],colors:['weiß']},
  {id:'lib-monstera',name:'Monstera',source:'library',group:'Zimmerpflanzen',bloomMonths:[],colors:[]},
  {id:'lib-yucca',name:'Yucca / Palmlilie',source:'library',group:'Zimmerpflanzen',bloomMonths:[],colors:[]}
 ];
 function findHostData(){
   const candidates=['plants','pflanzen','plantData'];
   for(const k of candidates){try{const v=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(v))return v}catch{}}
   return [];
 }
 function toFrostSubject(p){return {id:p.id||crypto.randomUUID(),name:p.name||p.commonName||'Pflanze',locationId:p.locationId||p.locationNodeId||p.location||'unbekannt',containerPlant:Boolean(p.containerPlant??p.isPot),movable:Boolean(p.movable??p.containerPlant??p.isPot),safeTemperatureC:Number(p.safeTemperatureC??p.frostLimitC??0),warningMarginC:Number(p.warningMarginC??2),preferredProtectionLocationId:p.preferredProtectionLocationId||null,preferredProtectionLocationName:p.preferredProtectionLocationName||null}}
 const api={VERSION,getFrostSubjects:()=>findHostData().map(toFrostSubject),getOwnBloomPlants:()=>findHostData().map(p=>({...p,source:'own',bloomMonths:p.bloomMonths||[]})),getLibrary:()=>library};
 global.PlantModuleAdapter=api;
})(window);
