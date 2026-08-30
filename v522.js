/* WeddingRank v5.22 - login/review QA hardening */
(()=>{
  const $=s=>document.querySelector(s);
  function enhance(){
    const email=$('#loginEmail'); if(email){email.autocomplete='email';email.inputMode='email';email.spellcheck=false}
    const review=$('#reviewFormWrap form');
    if(review && review.dataset.qa522!=='1'){
      review.dataset.qa522='1';
      const text=review.querySelector('textarea[name="review_text"]');if(text){text.maxLength=2000;text.setAttribute('aria-label','예식장 이용 후기')}
      review.querySelectorAll('input[type="number"]').forEach(i=>{i.min='1';i.max='5';i.step='1';i.inputMode='numeric'});
      const submit=review.querySelector('button[type="submit"]');
      review.addEventListener('submit',()=>{if(submit&&!submit.disabled){const old=submit.textContent;submit.dataset.oldText=old;submit.disabled=true;submit.textContent='평가 등록중…';setTimeout(()=>{if(document.contains(submit)){submit.disabled=false;submit.textContent=submit.dataset.oldText||old}},5000)}},true);
    }
  }
  const obs=new MutationObserver(enhance);obs.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',enhance);
})();