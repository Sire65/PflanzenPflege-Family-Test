(function(global){
  'use strict';
  const VERSION='0.1.0';
  const METHOD={SENSOR:'ambient_sensor',MANUAL_LUX:'manual_lux',MANUAL_PPFD:'manual_ppfd',CAMERA_ESTIMATE:'camera_estimate',AI_PHOTO:'ai_photo'};
  const QUALITY={CALIBRATED:'calibrated',DEVICE_UNCALIBRATED:'device_uncalibrated',ESTIMATED:'estimated',QUALITATIVE:'qualitative'};
  const listeners=new Map();
  const state={storage:null, records:[], sensor:null, sensorReading:null};
  function emit(name,payload){(listeners.get(name)||[]).forEach(fn=>{try{fn(payload);}catch(e){console.error(e);}})}
  function on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);return()=>{const a=listeners.get(name)||[];listeners.set(name,a.filter(x=>x!==fn));};}
  function uid(){return 'la-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
  function nowIso(){return new Date().toISOString();}
  function validateRecord(r){
    const errors=[];
    if(!r.plantId) errors.push('plantId fehlt');
    if(!r.locationId) errors.push('locationId fehlt');
    if(!r.method) errors.push('method fehlt');
    if(!r.measuredAt) errors.push('measuredAt fehlt');
    if(r.lux!=null && (!Number.isFinite(Number(r.lux)) || Number(r.lux)<0)) errors.push('lux ungültig');
    if(r.ppfd!=null && (!Number.isFinite(Number(r.ppfd)) || Number(r.ppfd)<0)) errors.push('ppfd ungültig');
    return errors;
  }
  async function init(options={}){
    state.storage=options.storage||null;
    if(state.storage?.load) state.records=(await state.storage.load('light-analysis.records'))||[];
    else {try{state.records=JSON.parse(localStorage.getItem('light-analysis.records')||'[]');}catch(_){state.records=[];}}
    emit('ready',{version:VERSION,count:state.records.length});
    return api;
  }
  async function persist(){
    if(state.storage?.save) await state.storage.save('light-analysis.records',state.records);
    else localStorage.setItem('light-analysis.records',JSON.stringify(state.records));
  }
  async function saveRecord(input){
    const record={id:input.id||uid(), measuredAt:input.measuredAt||nowIso(), createdAt:input.createdAt||nowIso(), ...input};
    const errors=validateRecord(record); if(errors.length) throw new Error(errors.join('; '));
    state.records=[record,...state.records.filter(x=>x.id!==record.id)]; await persist(); emit('record-saved',record); return record;
  }
  function listRecords(filter={}){
    return state.records.filter(r=>(!filter.plantId||r.plantId===filter.plantId)&&(!filter.locationId||r.locationId===filter.locationId)&&(!filter.method||r.method===filter.method));
  }
  async function removeRecord(id){state.records=state.records.filter(r=>r.id!==id);await persist();emit('record-removed',{id});}
  function getCapabilities(){return {ambientLightSensor:typeof global.AmbientLightSensor!=='undefined',camera:!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia),manualLux:true,manualPpfd:true};}
  async function startAmbientSensor(options={}){
    if(typeof global.AmbientLightSensor==='undefined') throw new Error('AmbientLightSensor nicht verfügbar');
    stopAmbientSensor();
    state.sensor=new global.AmbientLightSensor({frequency:options.frequency||2});
    state.sensor.addEventListener('reading',()=>{state.sensorReading={lux:state.sensor.illuminance,at:nowIso()};emit('sensor-reading',state.sensorReading);});
    state.sensor.addEventListener('error',e=>emit('sensor-error',{name:e.error?.name||'SensorError',message:e.error?.message||String(e)}));
    state.sensor.start(); return true;
  }
  function stopAmbientSensor(){if(state.sensor){try{state.sensor.stop();}catch(_){} state.sensor=null;}}
  function latestSensorReading(){return state.sensorReading;}
  function exportJson(){return JSON.stringify({schema:'light-analysis-export-v1',exportedAt:nowIso(),records:state.records},null,2);}
  const api={VERSION,METHOD,QUALITY,init,on,getCapabilities,saveRecord,listRecords,removeRecord,startAmbientSensor,stopAmbientSensor,latestSensorReading,exportJson};
  global.LightMeasurementCore=api;
})(window);
