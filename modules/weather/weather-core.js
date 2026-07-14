(function(global){
  'use strict';
  const VERSION='0.1.0';
  const listeners=new Map();
  let cfg=null, state={status:'idle',updatedAt:null,data:null,error:null,source:null};
  const emit=(name,payload)=>{(listeners.get(name)||[]).forEach(fn=>{try{fn(payload)}catch(e){console.error(e)}})};
  const on=(name,fn)=>{const a=listeners.get(name)||[];a.push(fn);listeners.set(name,a);return()=>listeners.set(name,a.filter(x=>x!==fn))};
  const storage={
    get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}},
    set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
  };
  function init(options){
    cfg=Object.assign({timezone:'auto',cacheKey:'weather-core-cache-v1',maxAgeMinutes:90},options||{});
    if(!cfg.provider||typeof cfg.provider.fetchForecast!=='function') throw new Error('WeatherCore: provider.fetchForecast fehlt');
    return api;
  }
  function normalize(raw){
    if(!raw||!Array.isArray(raw.days)) throw new Error('WeatherCore: ungültiges Provider-Ergebnis');
    return {location:raw.location||null,timezone:raw.timezone||cfg.timezone,current:raw.current?{
      time:raw.current.time||null,tempC:Number(raw.current.tempC),feelsC:Number(raw.current.feelsC),humidity:Number(raw.current.humidity),
      precipitation:Number(raw.current.precipitation||0),windKmh:Number(raw.current.windKmh||0),weatherCode:raw.current.weatherCode??null
    }:null,days:raw.days.map(d=>({
      date:d.date,minC:Number(d.minC),maxC:Number(d.maxC),feelsMinC:Number(d.feelsMinC),feelsMaxC:Number(d.feelsMaxC),rainMm:Number(d.rainMm||0),rainProbability:Number(d.rainProbability||0),
      windKmh:Number(d.windKmh||0),weatherCode:d.weatherCode??null,sunrise:d.sunrise||null,sunset:d.sunset||null
    })),hours:Array.isArray(raw.hours)?raw.hours:[],moon:raw.moon||null};
  }
  async function refresh(force=false){
    if(!cfg) throw new Error('WeatherCore zuerst initialisieren');
    const cached=storage.get(cfg.cacheKey);
    const fresh=cached&&cached.updatedAt&&(Date.now()-Date.parse(cached.updatedAt)<cfg.maxAgeMinutes*60000);
    if(!force&&fresh){state={status:'cached',updatedAt:cached.updatedAt,data:cached.data,error:null,source:cached.source};emit('updated',state);return state}
    state={...state,status:'loading',error:null};emit('status',state);
    try{
      const raw=await cfg.provider.fetchForecast(cfg);
      const data=normalize(raw), updatedAt=new Date().toISOString();
      state={status:'online',updatedAt,data,error:null,source:cfg.provider.id||'unknown'};
      storage.set(cfg.cacheKey,{updatedAt,data,source:state.source}); emit('updated',state); return state;
    }catch(error){
      if(cached){state={status:'degraded',updatedAt:cached.updatedAt,data:cached.data,error:String(error.message||error),source:cached.source};emit('updated',state);return state}
      state={status:'error',updatedAt:null,data:null,error:String(error.message||error),source:cfg.provider.id||null};emit('updated',state);return state;
    }
  }
  function getState(){return JSON.parse(JSON.stringify(state))}
  const api={VERSION,init,refresh,getState,on}; global.WeatherCore=api;
})(window);
