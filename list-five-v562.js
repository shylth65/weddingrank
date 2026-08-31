/* WeddingRank venue list: 5 at a time v5.62 */
(()=>{
'use strict';
const PAGE=5;
let shown=PAGE;
let applying=false;
let lastSignature='';
const cardsHost=()=>document.querySelector('#cards');
function signature(){const host=cardsHost();if(!host)return'';return Array.from(host.querySelectorAll('.card')).map(x=>x.dataset.id||x.querySelector('h3')?.textContent||'').join('|')}
function ensureControls(){
 const host=cardsHost();if(!host)return null;
 let bar=document.querySelector('#wrFiveControls');
 if(!bar){
  bar=document.createElement('div');bar.id='wrFiveControls';bar.className='listControls';
  bar.innerHTML='<span id="wrFiveCount"></span><button id="wrFiveMore" type="button">예식장 5곳 더보기</button>';
  const old=document.querySelector('#listControls');
  if(old)old.insertAdjacentElement('afterend',bar);else host.insertAdjacentElement('afterend',bar);
  bar.querySelector('#wrFiveMore')?.addEventListener('click',()=>{shown+=PAGE;apply(false)});
 }
 return bar;
}
function apply(resetOnNew=true){
 if(applying)return;applying=true;
 try{
  const host=cardsHost();if(!host)return;
  const cards=[...host.querySelectorAll('.card')];
  if(!cards.length){const bar=document.querySelector('#wrFiveControls');if(bar)bar.hidden=true;return}
  const sig=signature();
  if(resetOnNew&&sig!==lastSignature)shown=PAGE;
  lastSignature=sig;
  cards.forEach((c,i)=>{c.hidden=i>=shown;c.style.display=i<shown?'':'none'});
  const old=document.querySelector('#listControls');if(old)old.style.display='none';
  const bar=ensureControls();if(!bar)return;bar.hidden=false;
  const count=bar.querySelector('#wrFiveCount'),more=bar.querySelector('#wrFiveMore');
  const visible=Math.min(shown,cards.length);
  if(count)count.textContent=`현재 ${visible}곳 표시중`;
  if(more){more.hidden=visible>=cards.length;more.textContent=`예식장 ${Math.min(PAGE,cards.length-visible)}곳 더보기`}
 }finally{applying=false}
}
function start(){
 const host=cardsHost();if(!host)return setTimeout(start,250);
 const mo=new MutationObserver(()=>setTimeout(()=>apply(true),0));
 mo.observe(host,{childList:true,subtree:false});
 document.querySelector('#search')?.addEventListener('input',()=>{shown=PAGE;setTimeout(()=>apply(true),0)});
 document.querySelector('#sido')?.addEventListener('change',()=>{shown=PAGE;setTimeout(()=>apply(true),0)});
 apply(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
