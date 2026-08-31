/* WeddingRank homepage TOP10 bridge v5.38 */
(()=>{
  const applyCopy=()=>{
    const section=document.querySelector('.homeRankingPreview');
    if(!section)return;
    const title=section.querySelector('h2');
    const desc=section.querySelector('.sectionDesc');
    if(title)title.textContent='전국 대표 웨딩홀 TOP 10';
    if(desc)desc.innerHTML='WeddingRank가 선정한 <b>전국 대표 웨딩홀 100선</b> 중 상위 10곳입니다. 지역 대표성·시설 유형·공개정보·인지도 신호를 종합해 선정합니다.';
  };
  const loadEditorialTop10=()=>{
    applyCopy();
    if(document.querySelector('script[data-wr-editorial-top10]'))return;
    const s=document.createElement('script');
    s.src='home-top10-v535.js?v=5.38';
    s.defer=true;
    s.dataset.wrEditorialTop10='1';
    document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadEditorialTop10,{once:true});
  else loadEditorialTop10();
})();
