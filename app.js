/**
 * LA FONTANA — lightweight, framework-free front end.
 * Motion integration point: animateRing() and showPizzaPhoto().
 * All prices and ingredients below are transcribed from the supplied menu.
 * IMPORTANT: demo basket does not process payments or transmit orders.
 */
const pizzas = [
  { id:'margherita', name:'Margherita (V)', price:10.00, ingredients:['Tomato sauce','Mozzarella'] },
  { id:'salamino', name:'Salamino', price:13.00, ingredients:['Pepperoni','Mozzarella','Tomato sauce'] },
  { id:'prosciutto-funghi', name:'Prosciutto e Funghi', price:13.80, ingredients:['Ham','Mushrooms','Mozzarella','Tomato sauce'] },
  { id:'calabrese', name:'La Calabrese', price:13.70, ingredients:['Nduja spicy sausage','Tomato sauce','Mozzarella'] },
  { id:'golosa', name:'La Golosa (V)', price:14.00, ingredients:['Gorgonzola cheese','Onion','Mozzarella','Tomato sauce'] },
  { id:'vegetariana', name:'Vegetariana (V)', price:13.70, ingredients:['Roasted bell pepper','Grilled courgette','Mushroom','Red onion','Mozzarella','Tomato sauce'] },
  { id:'bufalina', name:'Bufalina (V)', price:14.50, ingredients:['Tomato sauce','Buffalo mozzarella','Parmigiano','Fresh basil'] },
  { id:'quattro-formaggi', name:'Quattro Formaggi (V)', price:14.50, ingredients:['Gorgonzola','Goat cheese','Parmigiano','Mozzarella','Tomato sauce'] },
  { id:'fontana', name:'La Fontana', price:15.50, ingredients:['Tomato sauce','Mozzarella','Parma ham','Parmesan','Fresh rocket'] },
  { id:'calzone', name:'Calzone', price:16.50, ingredients:['Spinach','Ham','Mushrooms','Mozzarella','Tomato sauce'], note:'Folded pizza filled with' },
  { id:'napoletana', name:'Napoletana', price:15.00, ingredients:['Anchovies','Olives','Capers','Tomato sauce','Mozzarella'] },
  { id:'ghiotta', name:'La Ghiotta', price:17.00, ingredients:['Chilli beef','Garlic sausage','Pepperoni','Ham','Onion','Mozzarella','Tomato sauce'] },
  { id:'bianca', name:'Bianca', price:15.50, ingredients:['Ham','Mushroom','Spinach','Garlic','Mozzarella','White sauce','Parmesan shavings'] },
  { id:'bruschetta', name:'Bruschetta', price:8.50, ingredients:['Garlic bread','Fresh tomatoes','Basil'] },
  { id:'capricciosa', name:'Capricciosa', price:15.50, ingredients:['Ham','Mushrooms','Artichoke','Olives','Tomato sauce','Mozzarella'] }
];

const GBP = new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
const $ = (sel) => document.querySelector(sel);
const modulo = (n,m) => ((n % m) + m) % m;
const gallery = $('#pizza-gallery');
const arcLabels = $('#arc-labels');
const stage = $('.pizza-stage');
const disc = $('#pizza-disc');
const arcPath = $('#arc-path');
const arcNamePath = $('#arc-name-path');
const arcDots = $('#arc-dots');
const arcNames = $('#arc-names');
const SVG_NS = 'http://www.w3.org/2000/svg';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let selectedIndex = 8;
let quantity = 1;
let basket = [];
let toastTimer = null;
// pos eases towards target; both are unwrapped so the ring can keep turning past the last pizza.
const ring = { items:[], geo:null, pos:selectedIndex, target:selectedIndex, anim:null, raf:0 };
const preloaded = new Set();

try {
  const raw = JSON.parse(localStorage.getItem('la_fontana_demo_cart') || '[]');
  if (Array.isArray(raw)) basket = raw.filter(item => Number.isInteger(item.index) && item.index >= 0 && item.index < pizzas.length && Number.isInteger(item.qty) && item.qty > 0);
} catch (_) { basket = []; }

function makeImagePath(pizza, large=false) {
  return `assets/${pizza.id}${large ? '-feature' : ''}.webp`;
}
function renderGallery() {
  gallery.replaceChildren();
  pizzas.forEach((pizza,index) => {
    const button = document.createElement('button');
    button.type='button';
    button.className=`pizza-card${index===selectedIndex?' selected':''}`;
    button.dataset.index=String(index);
    button.setAttribute('aria-label',`Select ${pizza.name}, ${GBP.format(pizza.price)}`);
    button.setAttribute('aria-pressed',String(index === selectedIndex));
    const img=document.createElement('img');
    img.src=makeImagePath(pizza); img.alt=''; img.loading='lazy'; img.decoding='async';
    const label=document.createElement('span'); label.textContent=pizza.name;
    button.append(img,label);
    button.addEventListener('click',()=>selectPizza(index));
    gallery.append(button);
  });
}

// Pizza ring: names are SVG text laid along a circular rail above the pizza, each with its dot on
// the line. On a change the rail turns, the pizza rotates around its centre and the new photo
// cross-fades in. Geometry tokens (--arc-*, --pizza-turn) are set per breakpoint on .pizza-stage.
// Send the Figma prototype to match its easing and timing in animateRing().
function cssNumber(styles,name,fallback) {
  const value=parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value)?value:fallback;
}
// Angles are measured from the top of the circle, clockwise.
function ringPoint(angle,radius=ring.geo.radius) {
  return [ring.geo.cx+radius*Math.sin(angle),ring.geo.cy-radius*Math.cos(angle)];
}
function ringArc(radius,from,to) {
  const [x1,y1]=ringPoint(from,radius),[x2,y2]=ringPoint(to,radius);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 ${to-from>Math.PI?1:0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
function buildRing() {
  pizzas.forEach((pizza,index)=>{
    const halo=document.createElementNS(SVG_NS,'circle');halo.setAttribute('class','arc-halo');
    const dot=document.createElementNS(SVG_NS,'circle');dot.setAttribute('class','arc-dot');
    const text=document.createElementNS(SVG_NS,'text');text.setAttribute('class','arc-name');text.setAttribute('text-anchor','middle');
    const label=document.createElementNS(SVG_NS,'textPath');label.setAttribute('href','#arc-name-path');label.textContent=pizza.name;
    text.append(label);
    // Transparent button over the curved name and its dot, for mouse, touch and keyboard.
    const button=document.createElement('button');
    button.type='button';button.className='arc-item';
    button.setAttribute('aria-label',`Select ${pizza.name}`);
    button.addEventListener('click',()=>selectPizza(index));
    arcDots.append(halo,dot);arcNames.append(text);arcLabels.append(button);
    ring.items.push({halo,dot,text,label,button,length:0});
  });
}
function layoutRing() {
  const css=getComputedStyle(stage);
  const discRadius=disc.offsetWidth/2;
  const radius=discRadius*cssNumber(css,'--arc-flatness',1.3);
  const step=cssNumber(css,'--arc-spacing',118)/radius;
  const font=cssNumber(css,'--arc-font',11);
  const g=ring.geo={
    cx:stage.clientWidth/2,cy:disc.offsetTop-cssNumber(css,'--arc-gap',24)+radius,radius,step,perSide:1,textFrom:-Math.PI*.49,
    dot:cssNumber(css,'--arc-dot',8)/2,dotActive:cssNumber(css,'--arc-dot-active',18)/2,
    font,fontActive:cssNumber(css,'--arc-font-active',13),labelGap:cssNumber(css,'--arc-label-gap',6),turn:cssNumber(css,'--pizza-turn',24)
  };
  arcNamePath.setAttribute('d',ringArc(radius,g.textFrom,-g.textFrom));
  ring.items.forEach(item=>{
    item.text.style.display='';item.text.style.fontSize=`${font}px`;
    item.length=item.text.getComputedTextLength();
  });
  // An outer slot is usable if the longest name placed there stays inside the stage and clear of the arrow.
  const spread=cssNumber(css,'--arc-spread',45)*Math.PI/180;
  const arrow=$('#ring-prev');
  const arrowRight=arrow.offsetLeft+arrow.offsetWidth,arrowTop=arrow.offsetTop;
  const half=Math.max(...ring.items.map(item=>item.length))/2,lift=g.dot+g.labelGap;
  const fits=slot=>{
    const angle=slot*step,sin=Math.sin(angle),cos=Math.cos(angle);
    const left=g.cx-(radius+lift)*sin-half*cos;
    const bottom=g.cy-(radius+lift)*cos+half*sin+font*.3;
    return angle<=spread && left>=4 && (bottom<arrowTop-2 || left>arrowRight+6);
  };
  while (g.perSide<Math.floor((pizzas.length-1)/2) && fits(g.perSide+1)) g.perSide++;
  arcPath.setAttribute('d',ringArc(radius,-(g.perSide+.75)*step,(g.perSide+.75)*step));
  renderRing();
}
function renderRing() {
  const g=ring.geo;
  if (!g) return;
  const n=pizzas.length;
  ring.items.forEach((item,index)=>{
    const offset=modulo(index-ring.pos+n/2,n)-n/2;
    const distance=Math.abs(offset);
    const opacity=Math.min(1,Math.max(0,g.perSide+1-distance));
    const shown=opacity>0;
    item.text.style.display=item.dot.style.display=item.halo.style.display=shown?'':'none';
    item.text.classList.toggle('active',index===selectedIndex);
    item.button.hidden=opacity<.5;
    item.button.setAttribute('aria-pressed',String(index===selectedIndex));
    if (!shown) return;
    const angle=offset*g.step;
    const focus=Math.max(0,1-distance);
    const dotRadius=g.dot+(g.dotActive-g.dot)*focus;
    const fontSize=g.font+(g.fontActive-g.font)*focus;
    const lift=dotRadius+g.labelGap;
    const [x,y]=ringPoint(angle);
    for (const [circle,r] of [[item.dot,dotRadius],[item.halo,dotRadius+g.dotActive*.55]]) {
      circle.setAttribute('cx',x.toFixed(1));circle.setAttribute('cy',y.toFixed(1));circle.setAttribute('r',r.toFixed(2));
    }
    item.dot.style.opacity=item.text.style.opacity=opacity;
    item.halo.style.opacity=focus;
    item.text.style.fontSize=`${fontSize.toFixed(2)}px`;
    item.text.setAttribute('dy',(-lift).toFixed(2));
    item.label.setAttribute('startOffset',((angle-g.textFrom)*g.radius).toFixed(1));
    const inner=g.radius-dotRadius-5,outer=g.radius+lift+fontSize+5;
    const [bx,by]=ringPoint(angle,(inner+outer)/2);
    Object.assign(item.button.style,{
      left:`${bx.toFixed(1)}px`,top:`${by.toFixed(1)}px`,
      width:`${(item.length*fontSize/g.font+16).toFixed(1)}px`,height:`${(outer-inner).toFixed(1)}px`,
      transform:`translate(-50%,-50%) rotate(${(angle*180/Math.PI).toFixed(2)}deg)`
    });
  });
  turnPhotos();
}
const easeInOutCubic=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOutCubic=t=>1-Math.pow(1-t,3);
function animateRing() {
  const distance=Math.abs(ring.target-ring.pos);
  if (reducedMotion.matches || distance<.001) {
    if (ring.raf) cancelAnimationFrame(ring.raf);
    ring.raf=0;ring.anim=null;ring.pos=ring.target;renderRing();
    return;
  }
  // Already turning: continue at speed instead of easing in again from a standstill.
  ring.anim={from:ring.pos,to:ring.target,start:performance.now(),duration:Math.min(1200,650+150*(distance-1)),ease:ring.raf?easeOutCubic:easeInOutCubic};
  if (!ring.raf) ring.raf=requestAnimationFrame(stepRing);
}
function stepRing(now) {
  const {from,to,start,duration,ease}=ring.anim;
  const t=Math.min(1,Math.max(0,(now-start)/duration));
  ring.pos=from+(to-from)*ease(t);
  renderRing();
  if (t<1) ring.raf=requestAnimationFrame(stepRing);
  else {ring.raf=0;ring.anim=null;}
}
// Each photo layer remembers the ring position of its pizza: it is upright when the ring rests there and
// turns around the pizza's centre with the ring while it moves, so the outgoing pizza rotates away, the new
// one rotates in, and shapes that are not round (the calzone) always settle the right way up.
function turnPhotos() {
  const turn=reducedMotion.matches||!ring.geo?0:ring.geo.turn;
  for (const layer of disc.children) layer.style.transform=`rotate(${((Number(layer.dataset.pos)-ring.pos)*turn).toFixed(2)}deg)`;
}
function showPizzaPhoto(index) {
  const previous=[...disc.children];
  const layer=document.createElement('div');
  layer.className='pizza-photo';
  layer.dataset.pos=String(ring.target);
  layer.style.backgroundImage=`url("${makeImagePath(pizzas[index],true)}")`;
  if (reducedMotion.matches) {
    previous.forEach(old=>old.remove());
    disc.append(layer);
    return;
  }
  layer.style.opacity='0';
  disc.append(layer);
  turnPhotos();
  layer.getBoundingClientRect();
  layer.style.opacity='';
  // The photos underneath fade out a little later, so the pizza never looks see-through.
  previous.forEach(old=>{
    if (old.classList.contains('is-leaving')) return;
    old.classList.add('is-leaving');
    const remove=()=>old.remove();
    old.addEventListener('transitionend',remove,{once:true});
    setTimeout(remove,1200);
  });
}
function preloadAround(index) {
  [1,-1,2,-2].forEach(offset=>{
    const src=makeImagePath(pizzas[modulo(index+offset,pizzas.length)],true);
    if (preloaded.has(src)) return;
    preloaded.add(src);
    const img=new Image();img.decoding='async';img.src=src;
  });
}
function describePizza(p) {
  const joined=p.ingredients.join(', ');
  return p.note ? `${p.note.toLowerCase()} ${joined.charAt(0).toLowerCase()}${joined.slice(1)}.` : `${joined}.`;
}
function renderDetails() {
  const p=pizzas[selectedIndex];
  stage.classList.toggle('calzone-selected',p.id==='calzone');
  $('#pizza-name').textContent=p.name;
  $('#pizza-price').textContent=GBP.format(p.price);
  $('#pizza-description').textContent=describePizza(p);
  $('#details-number').textContent=`${String(selectedIndex+1).padStart(2,'0')} / ${pizzas.length}`;
  const list=$('#ingredient-list'); list.replaceChildren();
  p.ingredients.forEach(name => {
    const chip=document.createElement('span');chip.className='ingredient-chip';chip.textContent=name;list.append(chip);
  });
  $('#quantity').textContent=quantity;
  $('#add-price').textContent=GBP.format(p.price*quantity);
  $('#pizza-disc').setAttribute('aria-label',`Illustrative overhead pizza image: ${p.name}`);
  gallery.querySelectorAll('.pizza-card').forEach((card,i)=>{
    card.classList.toggle('selected',i===selectedIndex);
    card.setAttribute('aria-pressed',String(i===selectedIndex));
  });
}
function selectPizza(nextIndex) {
  const index=modulo(nextIndex,pizzas.length);
  if (index===selectedIndex) return;
  // Turn the shortest way round, so the ring wraps from the last pizza to the first.
  let delta=modulo(index-selectedIndex,pizzas.length);
  if (delta>pizzas.length/2) delta-=pizzas.length;
  selectedIndex=index;quantity=1;
  renderDetails();
  ring.target+=delta;
  showPizzaPhoto(index);
  animateRing();
  preloadAround(index);
}
function showToast(text) {
  const el=$('#toast');el.textContent=text;el.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}
function persistBasket() {
  try{localStorage.setItem('la_fontana_demo_cart',JSON.stringify(basket));}catch(_){}
}
function updateBasket() {
  let total=0,count=0;
  basket.forEach(item=>{total+=pizzas[item.index].price*item.qty;count+=item.qty;});
  $('#cart-total').textContent=GBP.format(total);
  $('#basket-sum').textContent=GBP.format(total);
  $('#cart-count').textContent=count;
  $('#cart-count').hidden=count===0;
  const node=$('#basket-items');node.replaceChildren();
  if (!basket.length) {
    const p=document.createElement('p');p.className='basket-empty';p.textContent='Your basket is empty. Choose a pizza to start.';node.append(p);
  }
  basket.forEach(item=>{
    const p=pizzas[item.index];
    const row=document.createElement('div');row.className='basket-row';
    const img=document.createElement('img');img.src=makeImagePath(p);img.alt='';
    const info=document.createElement('div');const title=document.createElement('strong');title.textContent=p.name;
    const sub=document.createElement('small');sub.textContent=`Qty ${item.qty} · ${GBP.format(p.price)} each`;
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${p.name}`);
    remove.addEventListener('click',()=>{basket=basket.filter(row=>row.index!==item.index);persistBasket();updateBasket();});
    info.append(title,sub,remove);
    const price=document.createElement('span');price.className='basket-row-price';price.textContent=GBP.format(p.price*item.qty);
    row.append(img,info,price);node.append(row);
  });
  $('#copy-order').disabled=basket.length===0;
  persistBasket();
}
function openBasket(){
  $('#drawer-backdrop').hidden=false;
  const d=$('#basket-drawer');d.inert=false;d.setAttribute('aria-hidden','false');d.classList.add('open');document.body.classList.add('drawer-open');
  $('#close-basket').focus();
}
function closeBasket(){
  const d=$('#basket-drawer');d.classList.remove('open');d.inert=true;d.setAttribute('aria-hidden','true');$('#drawer-backdrop').hidden=true;document.body.classList.remove('drawer-open');$('#cart-launch').focus();
}
function copyOrder(){
  if(!basket.length)return;
  const lines=['LA FONTANA — PRE-ORDER ENQUIRY',...basket.map(item=>`${item.qty} × ${pizzas[item.index].name} — ${GBP.format(item.qty*pizzas[item.index].price)}`),`Total: ${$('#basket-sum').textContent}`,'Please confirm availability and collection time.'];
  const text=lines.join('\n');
  if(navigator.clipboard && window.isSecureContext){navigator.clipboard.writeText(text).then(()=>showToast('Order copied — call the restaurant to confirm.')).catch(()=>fallbackCopy(text));}
  else fallbackCopy(text);
}
function fallbackCopy(text){
  const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();
  try{document.execCommand('copy');showToast('Order copied — call to confirm.');}catch(_){showToast('Please note down your order before calling.');}field.remove();
}
function init(){
  const photo=disc.firstElementChild;
  photo.dataset.pos=String(ring.pos);
  photo.style.backgroundImage=`url("${makeImagePath(pizzas[selectedIndex],true)}")`;
  renderGallery();buildRing();layoutRing();renderDetails();updateBasket();
  preloadAround(selectedIndex);
  if('ResizeObserver' in window){const ro=new ResizeObserver(()=>layoutRing());ro.observe(stage);ro.observe(disc);}
  else window.addEventListener('resize',layoutRing);
  // Re-measure the names once the web font has replaced the fallback.
  document.fonts?.ready.then(layoutRing);
  $('#ring-prev').addEventListener('click',()=>selectPizza(selectedIndex-1));
  $('#ring-next').addEventListener('click',()=>selectPizza(selectedIndex+1));
  $('#qty-minus').addEventListener('click',()=>{quantity=Math.max(1,quantity-1);renderDetails();});
  $('#qty-plus').addEventListener('click',()=>{quantity=Math.min(30,quantity+1);renderDetails();});
  $('#add-to-basket').addEventListener('click',()=>{
    const existing=basket.find(item=>item.index===selectedIndex);
    if(existing)existing.qty+=quantity;else basket.push({index:selectedIndex,qty:quantity});
    updateBasket();showToast(`${quantity} × ${pizzas[selectedIndex].name} added to your basket`);
  });
  $('#cart-launch').addEventListener('click',openBasket);
  $('#close-basket').addEventListener('click',closeBasket);
  $('#drawer-backdrop').addEventListener('click',closeBasket);
  $('#copy-order').addEventListener('click',copyOrder);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && $('#basket-drawer').classList.contains('open'))closeBasket();
    if(['ArrowLeft','ArrowRight'].includes(event.key) && (document.activeElement?.closest('.pizza-stage') || document.activeElement?.closest('.pizza-gallery'))){
      event.preventDefault();
      const ringFocused=document.activeElement.classList.contains('arc-item');
      selectPizza(selectedIndex+(event.key==='ArrowRight'?1:-1));
      // Keep keyboard focus on the selected name as the ring turns.
      if(ringFocused)ring.items[selectedIndex].button.focus({preventScroll:true});
    }
  });
  const menuBtn=$('#mobile-menu-btn'),mobileNav=$('#mobile-nav');
  menuBtn.addEventListener('click',()=>{
    const open=mobileNav.hidden;mobileNav.hidden=!open;menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu');
  });
  mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileNav.hidden=true;menuBtn.setAttribute('aria-expanded','false');}));
}
document.addEventListener('DOMContentLoaded',init);
