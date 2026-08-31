/* WeddingRank homepage ranking-first layout v5.31 */
(()=>{
  let moved=false;
  function moveRankingFirst(){
    if(location.hash==='#rankings'||location.hash.startsWith('#hall='))return;
    const list=document.querySelector('#listView');
    const ranking=list?.querySelector('.homeRankingPreview');
    const hero=list?.querySelector('.hero');
    if(!list||!ranking||!hero)return;
    if(ranking.nextElementSibling!==hero) list.insertBefore(ranking,hero);
    ranking.classList.add('homeRankingFirst');
    const h2=ranking.querySelector('h2');
    if(h2&&h2.textContent!=='전국 예식장 종합랭킹 TOP 10')h2.textContent='전국 예식장 종합랭킹 TOP 10';
    moved=true;
  }
  document.addEventListener('DOMContentLoaded',moveRankingFirst,{once:true});
  window.addEventListener('load',moveRankingFirst,{once:true});
  window.addEventListener('hashchange',()=>setTimeout(moveRankingFirst,30));
  [100,400,1000].forEach(ms=>setTimeout(()=>{if(!moved)moveRankingFirst();},ms));
})();
