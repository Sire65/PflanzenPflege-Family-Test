const CACHE='pflanzenpflege-v0-9-14';
const ASSETS=[
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./modules/weather/weather-core.js",
  "./modules/weather/frost-protection.js",
  "./modules/weather/bloom-calendar.js",
  "./modules/weather/plant-module-adapter.js",
  "./modules/light/light-measurement-core.js",
  "./modules/light/light-profile-engine.js",
  "./modules/light/light-photo-analysis.js",
  "./modules/light/plant-light-adapter.js",
  "./assets/photos/plants/indoor/01_kroton.jpg",
  "./assets/photos/plants/indoor/02_pachira.jpg",
  "./assets/photos/plants/indoor/03_zamioculcas.jpg",
  "./assets/photos/plants/indoor/04_olive.jpg",
  "./assets/photos/plants/indoor/05_areca.jpg",
  "./assets/photos/plants/indoor/06_yucca1.jpg",
  "./assets/photos/plants/indoor/07_monstera.jpg",
  "./assets/photos/plants/indoor/08_oxalis.jpg",
  "./assets/photos/plants/indoor/09_dracaena.jpg",
  "./assets/photos/plants/indoor/10_ficus.jpg",
  "./assets/photos/plants/indoor/11_peperomia.jpg",
  "./assets/photos/plants/indoor/12_yucca2.jpg",
  "./assets/photos/plants/outdoor/13_rechts_vor_haus_mischkuebel.jpg",
  "./assets/photos/plants/outdoor/14_links_vor_haus_wandelroeschen.jpg",
  "./assets/photos/plants/outdoor/15_ganz_links_hornveilchen.jpg",
  "./assets/photos/plants/outdoor/16_ganz_links_geranien.jpg",
  "./assets/photos/fertilizers/floraself_bluehpflanzen.svg",
  "./assets/photos/fertilizers/compo_gruenpflanzen_palmen.svg",
  "./assets/photos/fertilizers/compo_bio_kraeuter.svg",
  "./assets/photos/fertilizers/keyzers_universal_5l.svg",
  "./assets/photos/fertilizers/keyzers_etikett.png",
  "./assets/photos/diagnosis/roses/rose_sternrusstau_beispiel_001.jpg",
  "./assets/photos/office/gaertner_buero_001.png"
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET') return;
 const accept=e.request.headers.get('accept')||'';
 const url=new URL(e.request.url);
 const isShell=e.request.mode==='navigate'||accept.includes('text/html')||url.pathname.endsWith('/index.html');
 if(isShell){
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return r;}).catch(()=>caches.match('./index.html')));
  return;
 }
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});













































