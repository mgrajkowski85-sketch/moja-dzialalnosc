const SUPABASE_URL = "https://ooarpvrivgzkvhpxpffb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_H5qWRUFDD_SAkeNfDFe-Ig_c3M_-6z0";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state={documents:[],clients:[],user:null};

const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString('pl-PL',{style:'currency',currency:'PLN'});
const today=()=>new Date().toISOString().slice(0,10);

function setAuthMsg(msg){$('authMsg').textContent=msg||'';}
function showMain(){
 $('authView').hidden=true;$('mainView').hidden=false;
 $('userEmail').textContent=state.user?.email||'';
}
function showAuth(){ $('authView').hidden=false;$('mainView').hidden=true; }

async function login(){
 setAuthMsg('');
 const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
 if(error)setAuthMsg(error.message);
}
async function signup(){
 setAuthMsg('');
 const email=$('email').value.trim(), password=$('password').value;
 if(!email||password.length<6){setAuthMsg('Podaj e-mail i hasło (minimum 6 znaków).');return;}
 const {error}=await sb.auth.signUp({email,password});
 if(error)setAuthMsg(error.message); else setAuthMsg('Konto utworzone. Jeśli pojawi się prośba o potwierdzenie e-maila, potwierdź wiadomość.');
}
$('loginBtn').onclick=login;$('signupBtn').onclick=signup;

function showQr(){
 let modal=$('qrModal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='qrModal';
  document.body.appendChild(modal);
 }
 modal.innerHTML=`<div class="qr-card">
  <button class="qr-close secondary" onclick="closeQr()">Zamknij</button>
  <h2>📱 Otwórz aplikację na telefonie</h2>
  <p>Zeskanuj ten kod aparatem telefonu.</p>
  <div id="qrCode"></div>
  <div class="qr-url">${escapeHtml(location.href.split('#')[0])}</div>
 </div>`;
 modal.classList.add('open');
 const target=location.origin+location.pathname;
 new QRCode($('qrCode'),{text:target,width:260,height:260,colorDark:"#111111",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
 modal.onclick=e=>{if(e.target===modal)closeQr();};
}
function closeQr(){
 const modal=$('qrModal');
 if(modal)modal.classList.remove('open');
}
$('loginQrBtn').onclick=showQr;
$('qrBtn').onclick=showQr;
$('logoutBtn').onclick=async()=>{await sb.auth.signOut();state.user=null;showAuth();};

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
 $(b.dataset.view).classList.add('active');
 render();
});

function nextNumber(){
 const y=new Date().getFullYear(),m=String(new Date().getMonth()+1).padStart(2,'0');
 const max=state.documents.reduce((n,d)=>{
   const match=String(d.number||'').match(/^(\d+)\/\d{2}\/\d{4}$/); return match?Math.max(n,Number(match[1])):n;
 },0);
 return `${max+1}/${m}/${y}`;
}

async function loadData(){
 const [{data:clients,error:cErr},{data:docs,error:dErr}]=await Promise.all([
   sb.from('clients').select('*').order('created_at',{ascending:false}),
   sb.from('documents').select('*').order('sale_date',{ascending:false}).order('created_at',{ascending:false})
 ]);
 if(cErr||dErr){alert((cErr||dErr).message);return;}
 state.clients=clients||[];state.documents=docs||[];
 render();
}

const pantaxAddressMap={
 "Wspólnota Mieszkaniowa Ul.Dobra 1 w Garwolinie":"ul. Dobra 1, Garwolin",
 "Wspólnota Mieszkaniowa Domu Przy Ul.Dobra 3 w Garwolinie":"ul. Dobra 3, Garwolin",
 "Wspólnota Mieszkaniowa Domu Przy Ul.Dobra 5 w Garwolinie":"ul. Dobra 5, Garwolin",
 "Wspólnota Mieszkaniowa Al.Legionów 44M w Garwolinie":"Al. Legionów 44M, Garwolin",
 "Wspólnota Mieszkaniowa Janusza Korczaka 46 w Garwolinie":"ul. Janusza Korczaka 46, Garwolin"
};

async function syncClientsFromDocuments(){
 if(!state.user||!state.documents.length)return;
 const byName=new Map();
 for(const d of state.documents){
   const name=String(d.client_name||'').trim();
   if(!name)continue;
   const cur=byName.get(name)||{name,nip:'',address:''};
   if(!cur.nip && d.client_nip)cur.nip=String(d.client_nip).trim();
   if(!cur.address && d.client_address)cur.address=String(d.client_address).trim();
   byName.set(name,cur);
 }
 for(const c of byName.values()){
   const existing=state.clients.find(x=>String(x.name||'').trim().toLowerCase()===c.name.toLowerCase());
   if(existing){
     const changes={};
     if(!existing.nip && c.nip)changes.nip=c.nip;
     if(!existing.address && c.address)changes.address=c.address;
     if(!existing.address){
       const mapped=Object.entries(pantaxAddressMap).find(([name])=>name.toLowerCase()===c.name.toLowerCase());
       if(mapped)changes.address=mapped[1];
     }
     if(Object.keys(changes).length) await sb.from('clients').update(changes).eq('id',existing.id);
   }else{
     const mapped=Object.entries(pantaxAddressMap).find(([name])=>name.toLowerCase()===c.name.toLowerCase());
     await sb.from('clients').insert({user_id:state.user.id,name:c.name,nip:c.nip||null,address:c.address||mapped?.[1]||null});
   }
 }
}

function cleanNip(value){
 return String(value||'').replace(/[^0-9]/g,'');
}

function validNip(nip){
 const d=cleanNip(nip);
 if(d.length!==10)return false;
 const w=[6,5,7,2,3,4,5,6,7];
 const sum=w.reduce((s,x,i)=>s+(Number(d[i])*x),0);
 const check=sum%11;
 return check<10 && check===Number(d[9]);
}

function setNipButtonsBusy(busy){
 const buttons=[$('lookupClientNip'),$('lookupInvoiceNip')].filter(Boolean);
 buttons.forEach(b=>{b.disabled=busy;if(b.disabled)b.dataset.oldText=b.textContent;b.textContent=busy?'Pobieranie…':'Pobierz dane';});
}

async function fetchText(url){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),6000);
 try{
   const res=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});
   const raw=await res.text();
   if(!res.ok)throw new Error('HTTP '+res.status);
   return raw;
 }finally{clearTimeout(timer);}
}

async function fetchJsonAny(targetUrl){
 const attempts=[
   'https://corsproxy.io/?url='+encodeURIComponent(targetUrl),
   'https://api.allorigins.win/raw?url='+encodeURIComponent(targetUrl),
   'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(targetUrl),
   targetUrl
 ];
 const jobs=attempts.map(async url=>{
   const raw=await fetchText(url);
   return JSON.parse(raw);
 });
 try{
   return {data:await Promise.any(jobs)};
 }catch(_){
   throw new Error('Serwisy wyszukiwania NIP nie odpowiedziały.');
 }
}

async function fetchCompanyFromPublicRegistry(nip){
 const clean=cleanNip(nip);

 const mfUrl='https://wl-api.mf.gov.pl/api/search/nip/'+encodeURIComponent(clean)+'?date='+today();
 try{
   const result=await fetchJsonAny(mfUrl);
   const subject=result.data?.result?.subject;
   if(subject){
     return {
       nip:subject.nip||clean,
       name:subject.name||'',
       address:subject.workingAddress||subject.residenceAddress||'',
       regon:subject.regon||'',
       source:'Wykaz VAT MF'
     };
   }
 }catch(err){console.warn('MF lookup failed',err);}

 try{
   const regonUrl='https://skanfirmy.pl/nip/'+encodeURIComponent(clean)+'?format=json';
   const result=await fetchJsonAny(regonUrl);
   const data=result.data;
   const d=data?.dane;
   if(d){
     const addressParts=[d.ulica||'',d.nrNieruchomosci||'',d.nrLokalu?'/'+d.nrLokalu:'',d.kodPocztowy||'',d.miejscowosc||''].filter(Boolean);
     return {
       nip:data?.nip||clean,
       name:d.nazwa||'',
       address:addressParts.join(' ').trim(),
       regon:d.regon||data?.regon||'',
       source:'REGON/GUS'
     };
   }
 }catch(err){console.warn('REGON lookup failed',err);}

 return null;
}

async function lookupNip(nip,target){
 const clean=cleanNip(nip);
 if(!validNip(clean)){alert('Podaj prawidłowy 10-cyfrowy NIP.');return null;}
 const btn=target==='client'?$('lookupClientNip'):$('lookupInvoiceNip');
 const oldText=btn?.textContent;
 if(btn){btn.disabled=true;btn.textContent='Pobieranie…';}
 try{
   const data=await fetchCompanyFromPublicRegistry(clean);
   if(!data){
     alert('Nie znaleziono firmy o tym NIP w dostępnych rejestrach.');
     return null;
   }
   const name=data.name||'';
   const address=data.address||'';
   if(target==='client'){
     $('newClientNip').value=data.nip||clean;
     if(name)$('newClientName').value=name;
     if(address)$('newClientAddress').value=address;
   }else{
     $('clientNip').value=data.nip||clean;
     if(name)$('clientName').value=name;
     if(address)$('clientAddress').value=address;
   }
   return data;
 }catch(err){
   alert('Nie udało się pobrać danych NIP. '+(err?.message||'Sprawdź połączenie z internetem.'));
   return null;
 }finally{
   if(btn){btn.disabled=false;btn.textContent=oldText||'Pobierz dane';}
 }
}

function fillClientSelect(){
 $('clientSelect').innerHTML='<option value="">— wpisz ręcznie —</option>'+state.clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}
$('lookupClientNip').onclick=()=>lookupNip($('newClientNip').value,'client');
$('lookupInvoiceNip').onclick=()=>lookupNip($('clientNip').value,'invoice');

$('clientSelect').onchange=()=>{
 const c=state.clients.find(x=>x.id===$('clientSelect').value);
 if(!c)return;
 $('clientName').value=c.name||'';$('clientNip').value=c.nip||'';$('clientAddress').value=c.address||'';
};

$('invoiceForm').onsubmit=async e=>{
 e.preventDefault();
 const qty=Number($('qty').value),price=Number($('price').value);
 const clientId=$('clientSelect').value||null;
 const payload={
  user_id:state.user.id,number:$('number').value,issue_date:$('issueDate').value,sale_date:$('saleDate').value,
  payment:$('payment').value,seller_name:$('sellerName').value,seller_nip:$('sellerNip').value,seller_address:$('sellerAddress').value,
  client_id:clientId,client_name:$('clientName').value,client_nip:$('clientNip').value,client_address:$('clientAddress').value,
  item_name:$('itemName').value,quantity:qty,unit_price:price,total:qty*price
 };
 const {error}=await sb.from('documents').insert(payload);
 if(error){alert(error.message);return;}
 await loadData(); alert('Dokument zapisany w chmurze.');
 $('invoiceForm').reset();$('issueDate').value=today();$('saleDate').value=today();$('number').value=nextNumber();fillClientSelect();
};

$('clientForm').onsubmit=async e=>{
 e.preventDefault();
 const payload={user_id:state.user.id,name:$('newClientName').value,nip:$('newClientNip').value,address:$('newClientAddress').value};
 const {error}=await sb.from('clients').insert(payload);
 if(error){alert(error.message);return;}
 e.target.reset();await loadData();
};

async function deleteClient(id){
 const c=state.clients.find(x=>x.id===id);if(!c)return;
 const used=state.documents.some(d=>d.client_id===id);
 const msg=used ? 'Klient "'+c.name+'" ma przypisane dokumenty. Klient zostanie usunięty z listy, a dokumenty pozostaną w historii.' : 'Usunąć klienta "'+c.name+'"?';
 if(!confirm(msg))return;
 if(used){
  const {error:docError}=await sb.from('documents').update({client_id:null}).eq('client_id',id);
  if(docError){alert('Nie udało się odłączyć klienta od dokumentów: '+docError.message);return;}
 }
 const {error}=await sb.from('clients').delete().eq('id',id);
 if(error){alert('Nie udało się usunąć klienta: '+error.message);return;}
 await loadData();
}

function showClientDetails(id){
 const c=state.clients.find(x=>x.id===id);
 if(!c)return;
 const docs=state.documents.filter(d=>d.client_id===id||String(d.client_name||'').trim().toLowerCase()===String(c.name||'').trim().toLowerCase());
 const recent=docs.slice(0,5).map(d=>`<div class="client-doc"><b>${escapeHtml(d.sale_date||'')}</b><span>${escapeHtml(d.item_name||'')}</span><strong>${money(d.total)}</strong></div>`).join('');
 let modal=$('clientModal');
 if(!modal){modal=document.createElement('div');modal.id='clientModal';document.body.appendChild(modal);}
 modal.innerHTML=`<div class="client-modal-card">
  <div class="client-modal-head">
   <div><h3>${escapeHtml(c.name)}</h3><small>Dane klienta</small></div>
   <div class="client-modal-actions"><button class="secondary" onclick="editClient('${c.id}')">Edytuj</button><button class="secondary" onclick="closeClientDetails()">Zamknij</button></div>
  </div>
  <div class="client-info">
   <div><span>NIP</span><b>${escapeHtml(c.nip||'Brak danych w bazie')}</b></div>
   <div><span>Adres</span><b>${escapeHtml(c.address||'Brak danych w bazie')}</b></div>
   <div><span>Liczba dokumentów</span><b>${docs.length}</b></div>
  </div>
  <h4 class="client-section-title">Ostatnie dokumenty</h4>
  <div class="client-docs">${recent||'<div class="empty">Brak dokumentów.</div>'}</div>
 </div>`;
 modal.classList.add('open');
 modal.onclick=e=>{if(e.target===modal)closeClientDetails();};
}
function closeClientDetails(){
 const modal=$('clientModal');
 if(modal)modal.classList.remove('open');
}

async function deleteDocument(id){
 if(!confirm('Usunąć ten dokument z chmury?'))return;
 const {error}=await sb.from('documents').delete().eq('id',id);
 if(error){alert(error.message);return;}
 await loadData();
}

function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function printDocument(id){
 const d=state.documents.find(x=>x.id===id);if(!d){alert('Nie znaleziono dokumentu.');return;}
 let area=$('printArea');if(!area){area=document.createElement('div');area.id='printArea';document.body.appendChild(area);}
 area.innerHTML=`<div class="printDoc"><h1>Dokument sprzedaży nr ${escapeHtml(d.number)}</h1>
 <div class="printTop"><div><b>Sprzedawca</b><br>${escapeHtml(d.seller_name)}<br>${escapeHtml(d.seller_nip)}<br>${escapeHtml(d.seller_address)}</div>
 <div><b>Nabywca</b><br>${escapeHtml(d.client_name)}<br>${escapeHtml(d.client_nip)}<br>${escapeHtml(d.client_address)}</div></div>
 <p><b>Data wystawienia:</b> ${escapeHtml(d.issue_date)} &nbsp;&nbsp; <b>Data sprzedaży:</b> ${escapeHtml(d.sale_date)}</p>
 <p><b>Forma płatności:</b> ${escapeHtml(d.payment)}</p>
 <table><thead><tr><th>Opis</th><th>Ilość</th><th>Cena</th><th>Wartość</th></tr></thead>
 <tbody><tr><td>${escapeHtml(d.item_name)}</td><td>${escapeHtml(d.quantity)}</td><td>${money(d.unit_price)}</td><td>${money(d.total)}</td></tr></tbody></table>
 <div class="printTotal">Razem: ${money(d.total)}</div><div class="printFooter">Dokument wygenerowany w aplikacji Moja Działalność</div></div>`;
 document.body.classList.add('printingDocument');
 const cleanup=()=>{document.body.classList.remove('printingDocument');area.innerHTML='';window.removeEventListener('afterprint',cleanup);};
 window.addEventListener('afterprint',cleanup);window.print();setTimeout(()=>{if(document.body.classList.contains('printingDocument'))cleanup();},5000);
}

function renderQuarterLimits(year, quarterlyLimit){
 const months=['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
 const el=$('quarterLimits');
 if(!el)return;
 const currentQuarter=Math.floor(new Date().getMonth()/3);
 el.innerHTML=[0,1,2,3].map(q=>{
   const startMonth=q*3;
   const qIncome=state.documents.filter(d=>{
     const dt=new Date(String(d.sale_date||'')+'T00:00:00');
     return dt.getFullYear()===year && Math.floor(dt.getMonth()/3)===q;
   }).reduce((s,d)=>s+Number(d.total||0),0);
   const remaining=Math.max(0,quarterlyLimit-qIncome);
   const isCurrent=q===currentQuarter;
   const monthRows=[0,1,2].map(i=>{
     const m=startMonth+i;
     const income=state.documents.filter(d=>String(d.sale_date||'').startsWith(`${year}-${String(m+1).padStart(2,'0')}-`)).reduce((s,d)=>s+Number(d.total||0),0);
     return `<tr><td>${months[m]}</td><td>${money(income)}</td></tr>`;
   }).join('');
   return `<div class="quarter-card ${isCurrent?'current-quarter':''}">
     <div class="quarter-header"><h3>${q+1}. kwartał ${year}${isCurrent?' <span class="current-tag">teraz</span>':''}</h3><div class="quarter-summary"><div><span>Limit</span><b>${money(quarterlyLimit)}</b></div><div><span>Wykorzystano</span><b>${money(qIncome)}</b></div><div><span>Pozostało</span><b>${money(remaining)}</b></div></div></div>
     <table class="quarter-table"><thead><tr><th>Miesiąc</th><th>Przychód</th></tr></thead><tbody>${monthRows}</tbody></table>
   </div>`;
 }).join('');
}

function render(){
 const now=new Date(),ym=now.toISOString().slice(0,7),yy=String(now.getFullYear());
 const mi=state.documents.filter(d=>String(d.sale_date||'').startsWith(ym)).reduce((s,d)=>s+Number(d.total||0),0);
 const yi=state.documents.filter(d=>String(d.sale_date||'').startsWith(yy)).reduce((s,d)=>s+Number(d.total||0),0);
 const year=now.getFullYear();
 const quarter=Math.floor(now.getMonth()/3);
 const qStart=new Date(year,quarter*3,1);
 const qEnd=new Date(year,quarter*3+3,1);
 const qIncome=state.documents.filter(d=>{
   const dt=new Date(String(d.sale_date||'')+'T00:00:00');
   return dt>=qStart && dt<qEnd;
 }).reduce((s,d)=>s+Number(d.total||0),0);
 const quarterlyLimit=10813.50;
 const quarterLeft=Math.max(0,quarterlyLimit-qIncome);
 const annualTheoreticalLimit=quarterlyLimit*4;
 const yearLeft=Math.max(0,annualTheoreticalLimit-yi);
 $('monthIncome').textContent=money(mi);$('yearIncome').textContent=money(yi);
 const qCard=$('limitsQuarterRemaining'); if(qCard) qCard.textContent=money(quarterLeft);
 const yCard=$('limitsYearRemaining'); if(yCard) yCard.textContent=money(yearLeft);
 $('docCount').textContent=state.documents.length;$('clientCount').textContent=state.clients.length;
 renderQuarterLimits(year, quarterlyLimit);
 $('number').value=nextNumber();fillClientSelect();
 const docs=[...state.documents].sort((a,b)=>(b.sale_date||'').localeCompare(a.sale_date||'')||(b.created_at||'').localeCompare(a.created_at||''));
 $('documentsList').innerHTML=docs.length?docs.map(d=>`<div class="row"><div><b>${escapeHtml(d.number)}</b><br>${escapeHtml(d.sale_date)}<br>${escapeHtml(d.client_name)}<br>${escapeHtml(d.item_name)}</div><div><b>${money(d.total)}</b><div class="row-actions"><button onclick="printDocument('${d.id}')">Drukuj / PDF</button><button class="danger" onclick="deleteDocument('${d.id}')">Usuń</button></div></div></div>`).join(''):'<div class="empty">Brak dokumentów.</div>';
 $('clientsList').innerHTML=state.clients.length?state.clients.map(c=>`<div class="row client-row" onclick="showClientDetails('${c.id}')"><div><b class="client-name">${escapeHtml(c.name)}</b><div class="client-hint">Kliknij, aby zobaczyć dane klienta</div></div><div class="row-actions"><button class="secondary" onclick="event.stopPropagation();editClient('${c.id}')">Edytuj</button><button class="danger" onclick="event.stopPropagation();deleteClient('${c.id}')">Usuń</button></div></div>`).join(''):'<div class="empty">Brak klientów.</div>';
}

$('issueDate').value=today();$('saleDate').value=today();

sb.auth.onAuthStateChange(async(_event,session)=>{
 state.user=session?.user||null;
 if(state.user){showMain();await loadData();$('number').value=nextNumber();}
 else showAuth();
});
