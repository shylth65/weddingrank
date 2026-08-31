/* WeddingRank venue list: 5 at a time v5.65 */
(()=>{
'use strict';
const PAGE=5;
let shown=PAGE;
let lastSignature='';
const host=()=>document.querySelector('#cards');
function signature(){const h=host();if(!h)return'';return [...h.querySelectorAll('.card')].map(x=>x.dataset.id||x.querySelector('h3')?.textContent||'').join('|')}
function ensureControls(){
  const h=host(); if(!h) return null;
  let bar=document.querySelector('#wrFiveControls');
  if(!bar){
    bar=document.createElement('div');
    bar.id='wrFiveControls';
    bar.className='listControls';
    bar.innerHTML='<span id="wrFiveCount"></span><button id="wrFiveMore" type="button">예식장 5곳 더보기</button>';
    h.insertAdjacentElement('afterend',bar);
    bar.querySelector('#wrFiveMore')?.addEventListener('click',()=>{shown+=PAGE;apply(false)});
  }
  return bar;
}
function apply(resetOnNew=true){
  const h=host(); if(!h) return;
  const cards=[...h.querySelectorAll('.card')];
  const bar=ensureControls();
  if(!cards.length){if(bar)bar.hidden=true;return}
  const sig=signature();
  if(resetOnNew && sig!==lastSignature) shown=PAGE;
  lastSignature=sig;
  cards.forEach((c,i)=>{const visible=i<shown;c.hidden=!visible;c.style.display=visible?'':'none'});
  document.querySelector('#listControls')?.style.setProperty('display','none','important');
  if(!bar)return;
  bar.hidden=false;
  const visible=Math.min(shown,cards.length);
  const count=bar.querySelector('#wrFiveCount');
  const more=bar.querySelector('#wrFiveMore');
  if(count)count.textContent=`현재 ${visible}곳 표시중`;
  if(more){more.hidden=visible>=cards.length;more.textContent=`예식장 ${Math.min(PAGE,cards.length-visible)}곳 더보기`}
}
function resetAndApply(){shown=PAGE;setTimeout(()=>apply(true),120)}
function start(){
  document.querySelector('#search')?.addEventListener('input',resetAndApply,{passive:true});
  document.querySelector('#sido')?.addEventListener('change',resetAndApply);
  [0,400,1000,2200,4500,7000].forEach(ms=>setTimeout(()=>apply(true),ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
