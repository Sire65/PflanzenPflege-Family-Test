(function(global){
'use strict';
function buildPrompt(context){return {schema:'plant-light-photo-analysis-v1',plant:context.plant||{},location:context.location||{},capturedAt:context.capturedAt||new Date().toISOString(),instructions:['Bewerte Fensterabstand, Schatten, direkte/indirekte Sonne und künstliche Beleuchtung.','Erkenne mögliche Hinweise auf Lichtmangel oder Sonnenbrand, aber formuliere keine sichere Diagnose.','Erfinde keinen exakten Luxwert. Liefere höchstens einen groben Bereich und kennzeichne ihn als Schätzung.'],responseSchema:{assessment:'too_dark|borderline|suitable|too_bright|uncertain',estimatedLuxRange:{min:'number|null',max:'number|null'},confidence:'low|medium|high',observations:['string'],recommendations:['string'],warnings:['string']}};}
async function analyze({imageDataUrl,context={},adapter}){if(!imageDataUrl)throw new Error('Bild fehlt');if(!adapter?.analyze)throw new Error('KI-Adapter nicht verbunden');const result=await adapter.analyze({imageDataUrl,prompt:buildPrompt(context)});return {...result,method:'ai_photo',quality:'qualitative',analyzedAt:new Date().toISOString()};}
global.LightPhotoAnalysisModule={buildPrompt,analyze};
})(window);
