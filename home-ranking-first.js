/* WeddingRank homepage ranking-first layout v5.30 */
(()=>{
  function moveRankingFirst(){
    if(location.hash==='#rankings'||location.hash.startsWith('#hall='))return;
    const list=document.querySelector('#listView');
    const ranking=list?.querySelector('.homeRankingPreview');
    const hero=list?.querySelector('.hero');
    if(!list||!ranking||!hero)return;
    if(ranking.nextElementSibling!==hero) list.insertBefore(ranking,hero);
    ranking.classList.add('homeRankingFirst');
    const h2=ranking.querySelector('h2');
    if(h2)h2.textContent='전국 예식장 종합랭킹 TOP 10';
  }
  const mo=new MutationObserver(()=>moveRankingFirst());
  mo.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',moveRankingFirst,{once:true});
  window.addEventListener('hashchange',()=>setTimeout(moveRankingFirst,30));
  [50,150,400,900,1600].forEach(ms=>setTimeout(moveRankingFirst,ms));
})();
