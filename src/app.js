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

function fillClientSelect(){
 $('clientSelect').innerHTML='<option value="">— wpisz ręcznie —</option>'+state.clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}
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
 const used=state.documents.some(d=>d.client_id===id||d.client_name===c.name);
 const msg=used?`Klient "${c.name}" ma dokumenty. Usunąć tylko z listy klientów? Dokumenty zostaną.`:`Usunąć klienta "${c.name}"?`;
 if(!confirm(msg))return;
 const {error}=await sb.from('clients').delete().eq('id',id);
 if(error){alert(error.message);return;}
 await loadData();
}

function showClientDetails(id){
 const c=state.clients.find(x=>x.id===id);
 if(!c)return;
 const docs=state.documents.filter(d=>d.client_id===id||d.client_name===c.name);
 let modal=$('clientModal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='clientModal';
  document.body.appendChild(modal);
 }
 modal.innerHTML=`<div class="client-modal-card">
  <div class="client-modal-head">
   <div><h3>${escapeHtml(c.name)}</h3><small>Dane klienta</small></div>
   <button class="secondary" onclick="closeClientDetails()">Zamknij</button>
  </div>
  <div class="client-info">
   <div><span>NIP</span><b>${escapeHtml(c.nip||'Brak')}</b></div>
   <div><span>Adres</span><b>${escapeHtml(c.address||'Brak')}</b></div>
   <div><span>Dokumenty</span><b>${docs.length}</b></div>
  </div>
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

function render(){
 const now=new Date(),ym=now.toISOString().slice(0,7),yy=String(now.getFullYear());
 const mi=state.documents.filter(d=>String(d.sale_date||'').startsWith(ym)).reduce((s,d)=>s+Number(d.total||0),0);
 const yi=state.documents.filter(d=>String(d.sale_date||'').startsWith(yy)).reduce((s,d)=>s+Number(d.total||0),0);
 $('monthIncome').textContent=money(mi);$('yearIncome').textContent=money(yi);$('docCount').textContent=state.documents.length;$('clientCount').textContent=state.clients.length;
 $('number').value=nextNumber();fillClientSelect();
 const docs=[...state.documents].sort((a,b)=>(b.sale_date||'').localeCompare(a.sale_date||'')||(b.created_at||'').localeCompare(a.created_at||''));
 $('documentsList').innerHTML=docs.length?docs.map(d=>`<div class="row"><div><b>${escapeHtml(d.number)}</b><br>${escapeHtml(d.sale_date)}<br>${escapeHtml(d.client_name)}<br>${escapeHtml(d.item_name)}</div><div><b>${money(d.total)}</b><div class="row-actions"><button onclick="printDocument('${d.id}')">Drukuj / PDF</button><button class="danger" onclick="deleteDocument('${d.id}')">Usuń</button></div></div></div>`).join(''):'<div class="empty">Brak dokumentów.</div>';
 $('clientsList').innerHTML=state.clients.length?state.clients.map(c=>`<div class="row client-row" onclick="showClientDetails('${c.id}')"><div><b class="client-name">${escapeHtml(c.name)}</b><div class="client-hint">Kliknij, aby zobaczyć dane klienta</div></div><button class="danger" onclick="event.stopPropagation();deleteClient('${c.id}')">Usuń klienta</button></div>`).join(''):'<div class="empty">Brak klientów.</div>';
}

$('issueDate').value=today();$('saleDate').value=today();

sb.auth.onAuthStateChange(async(_event,session)=>{
 state.user=session?.user||null;
 if(state.user){showMain();await loadData();$('number').value=nextNumber();}
 else showAuth();
});
