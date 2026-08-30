/* WeddingRank v5.12 - mobile navigation state + safer form UX */
(()=>{
  const $=s=>document.querySelector(s);

  function syncMobileNav(){
    const nav=$('#mobileNav');if(!nav)return;
    const hash=location.hash||'';
    const active=hash==='#rankings'?'rank':hash==='#find'?'find':hash.startsWith('#hall=')?'find':'home';
    nav.querySelectorAll('button[data-go]').forEach(b=>{
      const on=b.dataset.go===active;
      b.classList.toggle('active',on);
      b.setAttribute('aria-current',on?'page':'false');
    });
  }

  function improveForms(){
    const review=$('#reviewForm');
    if(review&&!review.dataset.v512){
      review.dataset.v512='1';
      review.addEventListener('submit',()=>{
        const btn=review.querySelector('.submitReview');if(!btn)return;
        btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='평가 등록중…';
        setTimeout(()=>{if(document.body.contains(btn)){btn.disabled=false;btn.textContent=btn.dataset.oldText||'평가 등록'}},7000);
      },true);
    }
    const consult=$('#consultForm');
    if(consult&&!consult.dataset.v512){
      consult.dataset.v512='1';
      consult.addEventListener('submit',()=>{
        const btn=consult.querySelector('.submitReview');if(!btn)return;
        btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='상담 신청중…';
        setTimeout(()=>{if(document.body.contains(btn)){btn.disabled=false;btn.textContent=btn.dataset.oldText||'이 예식장 견적 상담 신청'}},7000);
      },true);
    }
  }

  const observer=new MutationObserver(()=>{syncMobileNav();improveForms()});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('hashchange',()=>{syncMobileNav();setTimeout(improveForms,250)});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{syncMobileNav();improveForms()},900));
})();
