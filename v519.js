// WeddingRank v5.19 - detail page action navigation and safer consultation UX
(() => {
  function enhanceDetailActions(){
    const detail = document.querySelector('#detailView');
    if(!detail || detail.dataset.actions519==='1') return;
    detail.dataset.actions519='1';
    const blocks=[...detail.querySelectorAll('.detailBlock')];
    const review=blocks.find(x=>x.querySelector('#reviewSummary'));
    const consult=blocks.find(x=>x.querySelector('#consultForm'));
    const hero=detail.querySelector('.detailHero');
    if(hero && review && consult){
      review.id='reviews'; consult.id='consultation';
      const bar=document.createElement('div');
      bar.className='detailActionBar';
      bar.innerHTML='<a href="#reviews">후기 보기·작성</a><a class="primary" href="#consultation">예식 상담 신청</a>';
      hero.appendChild(bar);
    }
    const form=detail.querySelector('#consultForm');
    if(form){
      const date=form.querySelector('input[name="preferred_date"]');
      if(date) date.min=new Date().toISOString().slice(0,10);
      const phone=form.querySelector('input[name="phone"]');
      if(phone){phone.inputMode='tel';phone.autocomplete='tel'}
      const name=form.querySelector('input[name="customer_name"]');
      if(name) name.autocomplete='name';
      const submit=form.querySelector('button[type="submit"]');
      form.addEventListener('submit',()=>{if(submit){submit.disabled=true;submit.dataset.oldText=submit.textContent;submit.textContent='신청 처리중…';setTimeout(()=>{submit.disabled=false;submit.textContent=submit.dataset.oldText||'상담 신청'},4500)}},true);
    }
  }
  const css=document.createElement('style');
  css.textContent='.detailActionBar{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}.detailActionBar a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border:1px solid #ffc7d7;border-radius:13px;color:#d94370;background:#fff;text-decoration:none;font-weight:900}.detailActionBar a.primary{background:linear-gradient(90deg,#ff668c,#f63e77);border:0;color:#fff}#reviews,#consultation{scroll-margin-top:82px}@media(max-width:800px){.detailActionBar{display:grid;grid-template-columns:1fr 1fr;gap:8px}.detailActionBar a{padding:0 8px;font-size:13px}.detailBlock form input,.detailBlock form textarea{font-size:16px!important}}';
  document.head.appendChild(css);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhanceDetailActions); else enhanceDetailActions();
})();