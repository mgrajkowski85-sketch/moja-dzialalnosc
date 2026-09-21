const CACHE_NAME='moja-dzialalnosc-v1';
const SHELL=[
 './',
 './index.html',
 './src/style.css',
 './src/app.js',
 './manifest.webmanifest',
 './icons/icon.svg'
];

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET')return;
 if(url.origin!==location.origin)return;
 event.respondWith(
   fetch(event.request).then(response=>{
     const copy=response.clone();
     caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
     return response;
   }).catch(()=>caches.match(event.request).then(c=>c||caches.match('./index.html')))
 );
});
