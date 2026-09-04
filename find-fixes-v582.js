/* WeddingRank finder/ranking navigation fixes v5.82 */
(()=>{
  'use strict';
  function install(){
    const find=document.getElementById('find');
    const cards=document.getElementById('cards');
    if(find&&cards&&!document.getElementById('wrPriceBand')){
      const box=document.createElement('div');
      box.id='wrPriceBand';
      box.className='priceBand';
      box.innerHTML='<label for="priceFilter"><b>가격대별 찾기</b><span>1인 식대가 확인된 예식장을 기준으로 찾습니다.</span></label><select id="priceFilter" aria-label="1인 식대 가격대 선택"><option value="">전체 가격대</option><option value="under50000">5만원 미만</option><option value="50000-70000">5만~7만원</option><option value="70000-100000">7만~10만원</option><option value="over100000">10만원 이상</option><option value="verified">가격정보 확인 예식장</option></select><button id="clearFilters" type="button">검색조건 초기화</button>';
      cards.insertAdjacentElement('beforebegin',box);
      document.getElementById('priceFilter')?.addEventListener('change',()=>window.render?.(true));
      document.getElementById('clearFilters')?.addEventListener('click',()=>{
        const search=document.getElementById('search'),sido=document.getElementById('sido'),price=document.getElementById('priceFilter');
        if(search)search.value='';if(sido)sido.value='';if(price)price.value='';window.render?.(true);
      });
    }
    const topPriceLinks=[...document.querySelectorAll('.mainNav a')].filter(a=>/가격대/.test(a.textContent||''));
    topPriceLinks.forEach(a=>a.remove());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
