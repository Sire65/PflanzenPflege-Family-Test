(function(global){
'use strict';
const DEFAULT_MAP={id:'id',name:'name',locationId:'locationId',locationName:'locationName',lightProfile:'lightProfile'};
function create(config={}){
 const map={...DEFAULT_MAP,...(config.map||{})};
 const source=config.source||{};
 function getPlants(){return (source.getPlants?.()||[]).map(p=>({raw:p,id:p[map.id],name:p[map.name],locationId:p[map.locationId]||'unknown',locationName:p[map.locationName]||'Unbekannt',lightProfile:p[map.lightProfile]||{}}));}
 function getPlant(id){return getPlants().find(p=>String(p.id)===String(id));}
 function getLocations(){return source.getLocations?.()||[];}
 async function saveAnalysis(record){if(source.saveLightAnalysis)return source.saveLightAnalysis(record);return LightMeasurementCore.saveRecord(record);}
 return {getPlants,getPlant,getLocations,saveAnalysis};
}
global.PlantLightAdapter={create};
})(window);
