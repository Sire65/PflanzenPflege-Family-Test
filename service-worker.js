const CACHE='pflanzenpflege-v0-2-5';
const ASSETS=[
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/plants/01_kroton.jpg",
  "./assets/plants/02_pachira.jpg",
  "./assets/plants/03_zamioculcas.jpg",
  "./assets/plants/04_olive.jpg",
  "./assets/plants/05_areca.jpg",
  "./assets/plants/06_yucca1.jpg",
  "./assets/plants/07_monstera.jpg",
  "./assets/plants/08_oxalis.jpg",
  "./assets/plants/09_dracaena.jpg",
  "./assets/plants/10_ficus.jpg",
  "./assets/plants/11_peperomia.jpg",
  "./assets/plants/12_yucca2.jpg"
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET') return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
