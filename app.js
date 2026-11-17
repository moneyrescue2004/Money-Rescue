const KEY='money-rescue-local-v1';
const initial={budget:50,items:[{id:1,name:'Melk',done:false},{id:2,name:'Eieren',done:false},{id:3,name:'Brood',done:false},{id:4,name:'Snacks',done:false}],prices:[],receipts:[],id:5};
let s;try{s={...initial,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{s={...initial}}
const $=id=>document.getElementById(id), euro=n=>new Intl.NumberFormat('nl-BE',{style:'currency',currency:'EUR'}).format(n||0);
function save(){localStorage.setItem(KEY,JSON.stringify(s));render()}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200)}
function esc(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
 $('budget').value=s.budget;const spent=s.receipts.reduce((a,x)=>a+x.total,0),budget=Number(s.budget)||0;
 $('progress').style.width=(budget?Math.min(100,spent/budget*100):0)+'%';$('budget-info').textContent=`${euro(spent)} geregistreerd van ${euro(budget)}.`;
 $('items').innerHTML=s.items.map(x=>`<div class="shopping-row ${x.done?'done':''}"><input type="checkbox" data-check="${x.id}" ${x.done?'checked':''}><span>${esc(x.name)}</span><button data-del-item="${x.id}">Verwijder</button></div>`).join('');$('empty-items').hidden=!!s.items.length;
 $('saved-prices').innerHTML=s.prices.map(x=>`<div class="price-row"><div><b>${esc(x.product)}</b><small>${esc(x.store)} · ${esc(x.date)}</small></div><strong>${euro(x.price)}</strong><button class="remove" data-del-price="${x.id}">×</button></div>`).join('');$('empty-prices').hidden=!!s.prices.length;
 $('receipts').innerHTML=s.receipts.map(x=>`<div class="receipt-row"><div><b>${euro(x.total)} · ${esc(x.store)}</b><small>${esc(x.date)} ${esc(x.note||'')}</small></div><button class="remove" data-del-receipt="${x.id}">×</button></div>`).join('');$('empty-receipts').hidden=!!s.receipts.length;
}
function tab(name){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name))}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('budget').onchange=e=>{s.budget=Math.max(0,Number(e.target.value)||0);save()};
$('add-form').onsubmit=e=>{e.preventDefault();let name=$('new-item').value.trim();if(name){s.items.push({id:s.id++,name,done:false});$('new-item').value='';save()}};
$('items').onclick=e=>{let id=Number(e.target.dataset.delItem);if(id){s.items=s.items.filter(x=>x.id!==id);save()}};
$('items').onchange=e=>{if(e.target.dataset.check){let id=Number(e.target.dataset.check);s.items=s.items.map(x=>x.id===id?{...x,done:e.target.checked}:x);save()}};
$('clear').onclick=()=>{if(confirm('Je volledige lijst leegmaken?')){s.items=[];save()}};
$('optimize').onclick=()=>{tab('prices');$('price-search').value=s.items[0]?.name||'';$('local-compare').value=s.items[0]?.name||'';toast('Vergelijk de producten uit je lijst één voor één via de prijszoeker.')};
$('price-date').value=new Date().toISOString().slice(0,10);
$('price-form').onsubmit=e=>{e.preventDefault();let price=Number($('price').value),product=$('product').value.trim();if(!product||!price||price<=0)return;s.prices.push({id:s.id++,product,store:$('store').value,price,date:$('price-date').value});$('product').value='';$('price').value='';save();toast('Prijs opgeslagen')};
$('prices').onclick=e=>{let id=Number(e.target.dataset.delPrice);if(id){s.prices=s.prices.filter(x=>x.id!==id);save()}};

const retailerNames={
 colruyt:'Colruyt',lidl:'Lidl',aldi:'Aldi',albert_heijn_be:'Albert Heijn',
 delhaize:'Delhaize',carrefour:'Carrefour',jumbo:'Jumbo',intermarche:'Intermarché',
 spar:'Spar',bio_planet:'Bio-Planet'
};
function retailerLabel(value){
 const key=String(value||'').toLowerCase().replace(/[\s-]+/g,'_');
 return retailerNames[key]||String(value||'Supermarkt').replace(/_/g,' ');
}
function money(value){const n=Number(value);return Number.isFinite(n)?euro(n):'Prijs niet vermeld'}
function extractOfferRows(payload){
 const candidates=Array.isArray(payload)?payload:
  payload.results||payload.products||payload.items||payload.data||payload.offers||[];
 if(!Array.isArray(candidates))return [];
 return candidates.map(x=>{
  const retailer=x.retailer||x.store||x.supermarket||x.chain||x.retailer_id;
  return {
   name:x.name||x.title||x.product_name||x.description||'Product',
   retailer:retailerLabel(retailer),
   price:x.price??x.current_price??x.promo_price??x.offer_price,
   originalPrice:x.original_price??x.regular_price??x.was_price,
   quantity:x.quantity||x.pack_size||x.size||'',
   unitPrice:x.unit_price||x.price_per_unit||'',
   validFrom:x.valid_from||x.start_date||'',
   validUntil:x.valid_until||x.end_date||'',
   isCurrent:x.is_current_deal??(x.promotion_status==='active'),
   approximate:!!(x.approximate||x.approx),
   url:x.url||x.product_url||x.source_url||''
  };
 }).filter(x=>x.retailer && x.price!==undefined && x.price!==null);
}
$('price-search-form').onsubmit=async e=>{
 e.preventDefault();
 const q=$('price-search').value.trim();
 if(!q)return;
 const area=$('live-results');
 area.innerHTML='<p class="muted">Aanbiedingen zoeken…</p>';
 try{
  const r=await fetch('/api/prices?q='+encodeURIComponent(q),{headers:{'Accept':'application/json'}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||'De prijszoeker is tijdelijk niet beschikbaar.');
  const rows=extractOfferRows(data);
  if(!rows.length){
   area.innerHTML='<p class="empty">Geen bruikbare aanbiedingen gevonden voor deze zoekterm. Probeer een merk of algemenere productnaam.</p>';
   return;
  }
  rows.sort((a,b)=>Number(a.price)-Number(b.price));
  area.innerHTML='<h3>Gevonden aanbiedingen</h3>'+rows.map(x=>{
   const date=x.validUntil?' · geldig t/m '+esc(x.validUntil):'';
   const status=x.isCurrent===false?' · toekomstige/niet-actieve actie':'';
   const unit=x.unitPrice?' · '+esc(String(x.unitPrice)):'';
   const pack=x.quantity?' · '+esc(String(x.quantity)):'';
   const old=x.originalPrice?`<small>Normale prijs: ${money(x.originalPrice)}</small>`:'';
   return `<div class="price-row"><div><b>${esc(x.name)}</b><small>${esc(x.retailer)}${pack}${unit}${date}${status}</small>${old}${x.approximate?'<small>Zoekmatch: productidentiteit niet gegarandeerd</small>':''}</div><strong>${money(x.price)}</strong></div>`;
  }).join('')+'<p class="muted">Laagste getoonde prijs staat bovenaan. Dit zijn zoekresultaten/aanbiedingen, geen gegarandeerde vergelijking van exact hetzelfde product in elke winkel.</p>';
 }catch(err){
  area.innerHTML='<p class="empty">'+esc(err.message||'Prijszoeker niet beschikbaar.')+'</p>';
 }
};
$('local-compare-form').onsubmit=e=>{
 e.preventDefault();
 const q=$('local-compare').value.trim().toLocaleLowerCase('nl-BE');
 const found=s.prices.filter(x=>x.product.trim().toLocaleLowerCase('nl-BE')===q).sort((a,b)=>a.price-b.price);
 const area=$('local-results');
 if(!found.length){
  area.innerHTML='<p class="empty">Geen exact overeenkomende opgeslagen prijzen gevonden. Voeg eerst dezelfde productnaam, hoeveelheid en vergelijkbare verpakking toe voor de winkels die je wilt vergelijken.</p>';
  return;
 }
 const best=found[0].price;
 area.innerHTML='<h3>Jouw opgeslagen prijzen</h3>'+found.map((x,i)=>`<div class="price-row"><div><b>${esc(x.store)}</b><small>${esc(x.product)} · gecontroleerd op ${esc(x.date)}</small></div><strong>${euro(x.price)}</strong>${i===0?'<span class="best-price">Laagste</span>':''}</div>`).join('')+`<p class="muted">Verschil tussen hoogste en laagste opgeslagen prijs: ${euro(found[found.length-1].price-best)}. Alleen geldig voor de exacte productnaam die je hebt ingevoerd; controleer verpakking en datum.</p>`;
};

$('photo').onchange=e=>{let f=e.target.files[0];if(!f)return;if(!f.type.startsWith('image/'))return toast('Kies een foto.');if(f.size>8*1024*1024)return toast('Foto is groter dan 8 MB.');let r=new FileReader();r.onload=()=>{$('preview').src=r.result;$('preview').hidden=false;toast('Foto lokaal geladen; nog geen automatische herkenning.')};r.readAsDataURL(f)};
$('receipt-form').onsubmit=e=>{e.preventDefault();let total=Number($('total').value);if(!total||total<=0)return;s.receipts.push({id:s.id++,total,store:$('receipt-store').value,note:$('note').value,date:new Date().toLocaleDateString('nl-BE')});$('total').value='';$('note').value='';save();toast('Uitgave opgeslagen op dit apparaat')};
$('receipts').onclick=e=>{let id=Number(e.target.dataset.delReceipt);if(id){s.receipts=s.receipts.filter(x=>x.id!==id);save()}};
const mealIdeas=[
 {name:'Havermout met banaan',items:['havermout','bananen','melk'],method:'Kook de havermout met melk en serveer met plakjes banaan.',type:'breakfast'},
 {name:'Yoghurt met appel',items:['natuur yoghurt','appels'],method:'Snijd de appel in stukjes en meng met de yoghurt.',type:'breakfast'},
 {name:'Brood met ei',items:['brood','eieren'],method:'Kook of bak de eieren en serveer met brood.',type:'breakfast'},
 {name:'Linzen-tomatensoep',items:['linzen','tomatenblokjes','ui','wortel','bouillon'],method:'Fruit ui en wortel, voeg linzen, tomaten en bouillon toe en laat gaar koken.',type:'lunch'},
 {name:'Aardappel-groentepan',items:['aardappelen','diepvriesgroenten','ui'],method:'Kook de aardappelen. Bak ui en groenten in een pan en meng alles.',type:'dinner'},
 {name:'Pasta met tomatensaus',items:['pasta','tomatenblokjes','ui'],method:'Kook de pasta. Fruit ui, voeg tomatenblokjes toe en laat sudderen.',type:'dinner'},
 {name:'Rijst met groenten en ei',items:['rijst','diepvriesgroenten','eieren','sojasaus'],method:'Kook de rijst. Bak groenten en ei, voeg rijst en een beetje sojasaus toe.',type:'dinner'},
 {name:'Wraps met bonen',items:['wraps','bonen','mais','tomaat'],method:'Warm bonen en maïs op, snijd tomaat en vul de wraps.',type:'dinner'}
];
$('planner-form').onsubmit=e=>{e.preventDefault();const type=$('plan-type').value, budget=Number($('plan-budget').value),people=Number($('plan-people').value),days=Number($('plan-days').value),pref=$('plan-pref').value.trim().toLowerCase();if(!budget||budget<1)return toast('Vul een geldig budget in.');s.budget=budget;save();let chosen;if(type==='list'){chosen=['havermout','bananen','brood','eieren','pasta','tomatenblokjes','aardappelen','diepvriesgroenten','appels','natuur yoghurt'].slice(0,Math.min(10,days+5));}else{let pool=mealIdeas.filter(m=>!(pref.includes('vegetar')===false&&pref.includes('geen vlees')));chosen=[];for(let d=0;d<days;d++){let breakfast=pool.filter(m=>m.type==='breakfast')[d%2],lunch=pool.filter(m=>m.type==='lunch')[0],dinner=pool.filter(m=>m.type==='dinner')[d%4];chosen.push({day:d+1,meals:[breakfast,lunch,dinner]});}}
let ingredients=type==='list'?chosen: [...new Set(chosen.flatMap(d=>d.meals.flatMap(m=>m.items)))];let title=type==='list'?'Je basisboodschappenlijst':`Maaltijdplan voor ${days} ${days===1?'dag':'dagen'}`;let html=`<div class="plan-card"><h3>${title}</h3><p class="muted">Budget: ${euro(budget)} · ${people} ${people===1?'persoon':'personen'}. Dit is een startvoorstel, geen prijsberekening. Controleer hoeveelheden en prijzen in de winkel.</p>`;if(type==='meals'){html+=chosen.map(d=>`<div class="meal-day"><b>Dag ${d.day}</b>${d.meals.map(m=>`<p><strong>${m.type==='breakfast'?'Ontbijt':m.type==='lunch'?'Lunch':'Avondeten'}:</strong> ${esc(m.name)}<br><span class="muted">${esc(m.method)}</span></p>`).join('')}</div>`).join('');}else{html+='<p>Een eenvoudige startlijst met basisproducten.</p>';}html+=`<h3>Benodigde boodschappen</h3><ul>${ingredients.map(i=>`<li>${esc(i)}</li>`).join('')}</ul><button class="primary wide" id="add-plan-list">Voeg boodschappen toe aan mijn lijst</button></div>`;$('plan-result').innerHTML=html;$('add-plan-list').onclick=()=>{ingredients.forEach(name=>{if(!s.items.some(x=>x.name.toLowerCase()===name.toLowerCase()))s.items.push({id:s.id++,name,done:false})});save();toast('Boodschappen toegevoegd aan je lijst');tab('list')};};

const chatHistory=[];
function addMsg(who,text){
 let p=document.createElement('p');
 p.className='bubble';
 p.style.background=who==='user'?'#123d32':'#eff5f0';
 p.style.color=who==='user'?'white':'#123d32';
 p.textContent=text;
 $('chat-log').appendChild(p);
 p.scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('question').oninput=e=>$('chat-form').querySelector('button').disabled=!e.target.value.trim();
$('chat-form').onsubmit=async e=>{
 e.preventDefault();
 const q=$('question').value.trim();
 if(!q)return;
 const btn=$('chat-form').querySelector('button');
 addMsg('user',q);
 chatHistory.push({role:'user',text:q});
 $('question').value='';
 btn.disabled=true;
 btn.textContent='Even denken…';
 const waiting=document.createElement('p');
 waiting.className='bubble';
 waiting.textContent='MONEY RESCUE denkt na…';
 $('chat-log').appendChild(waiting);
 try{
  const response=await fetch('/api/chat',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    messages:chatHistory.slice(-12),
    context:{
     budget:Number(s.budget)||0,
     shoppingList:s.items.map(x=>({name:x.name,done:x.done})),
     savedPrices:s.prices.slice(-40).map(x=>({product:x.product,store:x.store,price:x.price,currency:'EUR',checkedDate:x.date}))
    }
   })
  });
  const data=await response.json().catch(()=>({}));
  waiting.remove();
  if(!response.ok){
   const message=response.status===429
    ?'De gratis AI-gebruiksgrens is tijdelijk bereikt. Probeer later opnieuw.'
    :response.status===503
     ?'De AI-verbinding is nog niet volledig ingesteld. De beheerder moet de Gemini-sleutel veilig toevoegen in Netlify.'
     :'De AI kon nu niet antwoorden. Probeer het straks opnieuw.';
   addMsg('bot',data.detail||data.error||message);
   return;
  }
  const answer=String(data.reply||'Ik kon geen antwoord maken. Probeer je vraag anders te formuleren.');
  chatHistory.push({role:'model',text:answer});
  addMsg('bot',answer);
 }catch(err){
  waiting.remove();
  addMsg('bot','Ik kan de AI-server momenteel niet bereiken. Controleer je internetverbinding of probeer later opnieuw.');
 }finally{
  btn.disabled=!$('question').value.trim();
  btn.textContent='Verstuur';
 }
};
document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{$('question').value=b.dataset.prompt;$('chat-form').querySelector('button').disabled=false});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
