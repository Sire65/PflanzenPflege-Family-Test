(function(global){
'use strict';
function classifyLux(lux,profile){
  if(lux==null||!Number.isFinite(Number(lux))) return {level:'unknown',label:'Keine belastbare Luxmessung',reason:'Nur qualitative Bewertung verfügbar'};
  lux=Number(lux); const p=profile||{};
  const survival=Number(p.survivalMinLux||0), preferredMin=Number(p.preferredMinLux||0), preferredMax=Number(p.preferredMaxLux||Infinity), danger=Number(p.directSunRiskLux||Infinity);
  if(lux<survival) return {level:'critical_low',label:'Deutlich zu dunkel',delta:survival-lux};
  if(lux<preferredMin) return {level:'low',label:'Zu dunkel / grenzwertig',delta:preferredMin-lux};
  if(lux>danger) return {level:'critical_high',label:'Mögliche Sonnenbrandgefahr',delta:lux-danger};
  if(lux>preferredMax) return {level:'high',label:'Sehr hell - Verträglichkeit prüfen',delta:lux-preferredMax};
  return {level:'ok',label:'Geeigneter Lichtbereich',delta:0};
}
function recommendation(result,plant){
  const name=plant?.name||'Pflanze';
  const map={critical_low:`${name} deutlich näher an eine geeignete Lichtquelle stellen oder Pflanzenleuchte prüfen.`,low:`Standort von ${name} optimieren und nach 3-7 Tagen erneut messen.`,critical_high:`Direkte Mittagssonne abschirmen und Blätter auf Verbrennungen kontrollieren.`,high:`Langsam an hohe Lichtstärke gewöhnen und Blattreaktion beobachten.`,ok:`Standort beibehalten und saisonal erneut kontrollieren.`,unknown:`Fotoanalyse ergänzen oder Luxwert mit geeignetem Messgerät erfassen.`};
  return map[result.level]||map.unknown;
}
global.LightProfileEngine={classifyLux,recommendation};
})(window);
