/* WeddingRank v5.9 - detail summary + mobile navigation */
(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const won=v=>v==null?'확인중':Number(v)===0?'무료':Number(v).toLocaleString('ko-KR')+'원';

  function ensureMobileNav(){
    if($('#mobileNav'))return;
    const nav=document.createElement('nav');
    nav.id='mobileNav';
    nav.className='mobileNav';
    nav.innerHTML=`<button data-go="home"><span>⌂</span><b>홈</b></button><button data-go="find"><span>⌕</span><b>찾기</b></button><button data-go="rank"><span>★</span><b>랭킹</b></button><button data-go="compare"><span>⇄</span><b>비교</b></button>`;
    document.body.appendChild(nav);
    nav.addEventListener('click',ev=>{
      const b=ev.target.closest('button');if(!b)return;
      const go=b.dataset.go;
      if(go==='home'){location.hash='';window.scrollTo({top:0,behavior:'smooth'})}
      if(go==='find'){location.hash='';setTimeout(()=>$('#rankings')?.scrollIntoView({behavior:'smooth'}),30)}
      if(go==='rank')location.hash='#rankings';
      if(go==='compare'){
        const open=$('#openCompare');
        if(open)open.click(); else alert('예식장 목록에서 2곳 이상을 비교 목록에 담아주세요.');
      }
    });
  }

  async function buildDetailSummary(){
    const id=(location.hash.match(/^#hall=(.+)$/)||[])[1];
    if(!id||!$('#detailView')||$('#detailView').hidden)return;
    const main=$('.detailMain');if(!main)return;
    $('#detailQuickSummary')?.remove();
    try{
      const [prices,rooms,reviews]=await Promise.all([
        api(`wedding_prices?select=effective_date,rental_fee,meal_price_per_person,minimum_guarantee,verified_at&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc&limit=100`),
        api(`hall_rooms?select=room_id,room_name&hall_id=eq.${encodeURIComponent(id)}&limit=100`),
        api(`reviews?select=overall_score&hall_id=eq.${encodeURIComponent(id)}&limit=200`)
      ]);
      const min=k=>{const a=prices.map(p=>p[k]).filter(v=>v!=null).map(Number);return a.length?Math.min(...a):null};
      const latest=prices.map(p=>p.verified_at||p.effective_date).filter(Boolean).sort().reverse()[0]||null;
      const scores=reviews.map(r=>Number(r.overall_score)).filter(v=>Number.isFinite(v)&&v>0);
      const avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
      const box=document.createElement('section');
      box.id='detailQuickSummary';
      box.className='detailQuickSummary';
      box.innerHTML=`<div class="summaryHead"><div><span>한눈에 보기</span><h2>핵심 정보</h2></div>${latest?`<small>최근 확인 ${esc(String(latest).slice(0,10))}</small>`:''}</div><div class="summaryGrid"><div><small>식대 시작</small><b>${won(min('meal_price_per_person'))}</b></div><div><small>대관료 시작</small><b>${won(min('rental_fee'))}</b></div><div><small>최소보증</small><b>${min('minimum_guarantee')!=null?Number(min('minimum_guarantee')).toLocaleString('ko-KR')+'명':'확인중'}</b></div><div><small>등록 홀</small><b>${rooms.length?rooms.length+'개':'확인중'}</b></div><div><small>이용자 평점</small><b>${avg!=null?avg.toFixed(1)+' / 5.0':'평가대기'}</b></div></div><div class="summaryActions"><button type="button" data-scroll="prices">가격 보기</button><button type="button" data-scroll="reviewSummary">평가 보기</button><button type="button" class="primary" data-scroll="consultForm">견적 상담</button></div>`;
      main.insertAdjacentElement('afterbegin',box);
      box.addEventListener('click',ev=>{const b=ev.target.closest('[data-scroll]');if(!b)return;$('#'+b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})});
    }catch(err){console.warn('detail quick summary skipped',err)}
  }

  function improveConsultation(){
    const form=$('#consultForm');if(!form)return;
    const block=form.closest('.detailBlock');
    if(block&&!block.querySelector('.consultSteps')){
      const p=document.createElement('div');
      p.className='consultSteps';
      p.innerHTML='<span>1. 희망일 입력</span><span>2. 예상 하객수 입력</span><span>3. 상담 요청</span>';
      form.insertAdjacentElement('beforebegin',p);
    }
    const btn=form.querySelector('.submitReview');
    if(btn)btn.textContent='이 예식장 견적 상담 신청';
  }

  function improveReviewUX(){
    const wrap=$('.reviewWrite');if(!wrap||wrap.querySelector('.reviewGuide'))return;
    const guide=document.createElement('p');
    guide.className='reviewGuide';
    guide.textContent='실제 방문·예식 경험을 기준으로 평가해 주세요. 광고성·추정 평가는 랭킹에 반영하지 않습니다.';
    wrap.querySelector('h3')?.insertAdjacentElement('afterend',guide);
  }

  function refreshPageEnhancements(){
    ensureMobileNav();
    setTimeout(()=>{buildDetailSummary();improveConsultation();improveReviewUX()},500);
  }

  window.addEventListener('hashchange',refreshPageEnhancements);
  setTimeout(refreshPageEnhancements,800);
})();