const CACHE='virusdef-v41';
const FILES=['./','./index.html','./style.css','./js/data.js','./js/audio.js','./js/background.js','./js/game.js','./js/draw.js','./js/ui.js','./js/screens.js','./js/scenery.js','./js/worldmap.js','./js/main.js','./js/icons.js','./js/vendor/qrcode.js','./js/vendor/jsQR.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request)));});
