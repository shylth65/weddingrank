/* WeddingRank compare-state + auth hotfix v5.24 */
(()=>{
  const KEY='wr_compare_ids';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(Boolean).slice(0,3)}catch(_){return[]}};
  const write=ids=>localStorage.setItem(KEY,JSON.stringify([...new Set(ids)].slice(0,3)));
  const syncButtons=()=>{const ids=new Set(read());document.querySelectorAll('.compareToggle').forEach(b=>{const id=b.closest('[data-id]')?.dataset.id;b.textContent=id&&ids.has(id)?'✓ 비교함':'＋ 비교'})};
  const closeModal=()=>{const m=document.querySelector('#compareModal');if(m)m.hidden=true;document.body.classList.remove('compareModalOpen');const t=document.querySelector('#compareTray');if(t&&read().length)t.style.visibility=''};
  const clearAll=()=>{write([]);syncButtons();const t=document.querySelector('#compareTray');if(t){t.hidden=true;t.style.visibility='hidden'};closeModal();window.dispatchEvent(new CustomEvent('weddingrank:compare-cleared'))};
  document.addEventListener('click',ev=>{const clear=ev.target.closest?.('#clearCompare');if(clear){ev.preventDefault();ev.stopImmediatePropagation();clearAll();return}const close=ev.target.closest?.('#compareModal .compareClose');if(close){ev.preventDefault();closeModal();return}if(ev.target?.id==='compareModal')closeModal()},true);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeModal()},true);
  const mo=new MutationObserver(()=>{const m=document.querySelector('#compareModal'),t=document.querySelector('#compareTray');if(m&&!m.hidden){const ids=read();if(ids.length<2){closeModal();return}document.body.classList.add('compareModalOpen');if(t)t.style.visibility='hidden'}syncButtons()});
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  window.WeddingRankCompare={read,write,clear:clearAll,close:closeModal,sync:syncButtons};

  // Public review login hotfix: always return to the custom domain and avoid rapid repeat sends.
  let loginBusy=false,lastLoginSend=0;
  document.addEventListener('click',async ev=>{
    const btn=ev.target.closest?.('#loginBtn');
    if(!btn)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const email=(document.querySelector('#loginEmail')?.value||'').trim();
    if(!email||!email.includes('@')){alert('이메일을 입력해주세요.');return}
    const remain=60-Math.floor((Date.now()-lastLoginSend)/1000);
    if(loginBusy||remain>0){alert(`로그인 메일은 잠시 후 다시 요청해주세요.${remain>0?` (${remain}초)`:''}`);return}
    const cfg=window.WEDDINGRANK_CONFIG||{},base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,''),key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
    if(!base||!key){alert('로그인 설정을 확인중입니다. 잠시 후 다시 시도해주세요.');return}
    loginBusy=true;btn.disabled=true;
    try{
      const redirect=location.origin+location.pathname;
      const r=await fetch(base+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});
      const raw=await r.text();
      if(!r.ok){
        let code='';try{code=JSON.parse(raw).error_code||''}catch(_){}
        if(r.status===429||code==='over_email_send_rate_limit')throw new Error('RATE_LIMIT');
        throw new Error('SEND_FAILED');
      }
      lastLoginSend=Date.now();
      alert('로그인 링크를 이메일로 보냈습니다. 메일의 링크를 누르면 WeddingRank로 돌아옵니다.');
    }catch(e){
      if(e?.message==='RATE_LIMIT')alert('이메일 발송 횟수가 많습니다. 잠시 후 다시 시도해주세요.');
      else alert('로그인 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      console.warn('WeddingRank login hotfix',e);
    }finally{loginBusy=false;btn.disabled=false}
  },true);

  // Put the live venue ranking directly below the hero/trust area and render a real TOP 10.
  async function promoteHomeRanking(){
    const section=document.querySelector('.homeRankingPreview');
    const find=document.querySelector('#find');
    const body=document.querySelector('#homeRankPreviewBody');
    if(!section||!find||!body)return;
    find.parentNode.insertBefore(section,find);
    section.classList.add('homeRankingTop');
    const h2=section.querySelector('h2');
    if(h2)h2.textContent='전국 예식장 순위 TOP 10';
    const desc=section.querySelector('.sectionDesc');
    if(desc)desc.textContent='실제 이용자 평가가 등록된 예식장만 종합평점과 평가 수를 기준으로 순위를 공개합니다.';
    try{
      if(typeof api!=='function')return;
      const rows=await api('wedding_hall_rankings?select=*&order=overall_score.desc.nullslast');
      const ranked=rows.filter(x=>Number(x.review_count)>0&&x.overall_score!=null)
        .sort((a,b)=>(Number(b.overall_score)-Number(a.overall_score))||(Number(b.review_count)-Number(a.review_count)))
        .slice(0,10);
      if(!ranked.length){
        body.innerHTML='<div class="rankingPreviewEmpty"><b>아직 TOP 10을 공개할 만큼 이용자 평가가 쌓이지 않았습니다.</b><span>첫 평가가 등록되는 예식장부터 순위에 자동 반영됩니다.</span></div>';
        return;
      }
      body.innerHTML='<div class="previewTopGrid">'+ranked.map((h,i)=>`<article class="previewTopCard" data-id="${h.hall_id}" tabindex="0" role="link"><strong class="previewTopNo">${i+1}</strong><div class="previewTopHall"><b>${esc(h.name||'예식장')}</b><span>${esc([h.sido,h.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(h.overall_score).toFixed(2)}</strong><span>${Number(h.review_count)}개 평가</span></div></article>`).join('')+'</div>';
      body.querySelectorAll('.previewTopCard').forEach(card=>{
        const go=()=>location.hash=`hall=${card.dataset.id}`;
        card.addEventListener('click',go);
        card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
      });
    }catch(e){
      body.innerHTML='<div class="rankingPreviewEmpty"><b>예식장 순위 정보를 불러오는 중입니다.</b><span>잠시 후 다시 확인해주세요.</span></div>';
      console.warn('WeddingRank home ranking',e);
    }
  }

  // Review UX v5.26: turn score selects into accessible star controls without changing stored values.
  function installReviewStyles(){
    if(document.querySelector('#wrReviewUxStyles'))return;
    const style=document.createElement('style');
    style.id='wrReviewUxStyles';
    style.textContent=`
      .reviewWrite{margin-top:34px;padding:28px;border:1px solid #ecd8d4;border-radius:20px;background:linear-gradient(180deg,#fff,#fff9f8)}
      .reviewWrite h3{font-size:24px;margin:0 0 8px;letter-spacing:-.7px}.reviewWrite h3:before{content:'★';display:inline-grid;place-items:center;width:34px;height:34px;margin-right:9px;border-radius:11px;background:#f7e2df;color:var(--rose-dark);font-size:17px;vertical-align:middle}
      #reviewForm{margin-top:18px}.scoreInputs{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px!important}
      #reviewForm .scoreInputs>label{position:relative;margin:0!important;padding:15px;border:1px solid #eee2df;border-radius:14px;background:#fff;font-weight:800;color:#544b49}
      .wrStarRating{display:flex;gap:3px;margin-top:9px}.wrStar{border:0;background:transparent;padding:2px 1px;cursor:pointer;font-size:27px;line-height:1;color:#ddd2cf;transition:transform .12s ease,color .12s ease}.wrStar:hover{transform:scale(1.08)}.wrStar.isOn{color:#e8a318}.wrStar:focus-visible{outline:2px solid #b77b77;outline-offset:2px;border-radius:5px}
      .wrStarSource{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:.01!important;pointer-events:none!important;bottom:4px!important;left:4px!important}
      #reviewForm>label:first-child{font-weight:800}#reviewForm>label:first-child select,#reviewForm textarea{border-radius:12px!important;border-color:#e4d8d5!important}
      #reviewForm textarea{min-height:140px!important;line-height:1.65}.submitReview{width:100%;min-height:56px;margin-top:12px!important;border-radius:14px!important;background:var(--rose-dark)!important;color:#fff!important;font-size:16px!important;font-weight:900!important;box-shadow:0 8px 20px rgba(131,84,86,.18)}.submitReview:hover{background:#74484a!important}.submitReview:disabled{box-shadow:none}
      .loginRow{padding:14px;border:1px solid #eee2df;border-radius:14px;background:#fff}.loginRow button{background:var(--rose-dark);color:#fff}.signed{padding:12px 14px;border-radius:12px;background:#fff;border:1px solid #eee2df}.signed button{margin-left:auto}
      @media(max-width:800px){.reviewWrite{padding:20px 16px}.reviewWrite h3{font-size:21px}.scoreInputs{grid-template-columns:1fr!important}.wrStar{font-size:30px}.loginRow{align-items:stretch;flex-direction:column}.loginRow button{min-height:46px}}
    `;
    document.head.appendChild(style);
  }
  function upgradeReviewUI(){
    installReviewStyles();
    const h3=document.querySelector('.reviewWrite h3');
    if(h3&&h3.textContent.trim()!=='이 예식장 평가하기')h3.textContent='이 예식장 평가하기';
    const form=document.querySelector('#reviewForm');
    if(!form)return;
    form.querySelectorAll('.scoreInputs label').forEach(label=>{
      const select=label.querySelector('select[name]');
      if(!select||select.dataset.starified==='1')return;
      select.dataset.starified='1';
      select.classList.add('wrStarSource');
      const stars=document.createElement('div');
      stars.className='wrStarRating';
      stars.setAttribute('role','radiogroup');
      stars.setAttribute('aria-label',(label.childNodes[0]?.textContent||'평가')+' 점수');
      const paint=()=>{
        const value=Number(select.value||0);
        stars.querySelectorAll('.wrStar').forEach(btn=>{
          const on=Number(btn.dataset.value)<=value;
          btn.classList.toggle('isOn',on);
          btn.setAttribute('aria-checked',String(Number(btn.dataset.value)===value));
        });
      };
      for(let v=1;v<=5;v++){
        const btn=document.createElement('button');
        btn.type='button';btn.className='wrStar';btn.dataset.value=String(v);btn.textContent='★';btn.setAttribute('role','radio');btn.setAttribute('aria-label',`${v}점`);btn.setAttribute('aria-checked','false');
        btn.addEventListener('click',()=>{select.value=String(v);select.dispatchEvent(new Event('change',{bubbles:true}));paint()});
        stars.appendChild(btn);
      }
      select.insertAdjacentElement('afterend',stars);paint();
    });
  }
  document.addEventListener('submit',ev=>{
    const form=ev.target.closest?.('#reviewForm');if(!form)return;
    const missing=[...form.querySelectorAll('.scoreInputs select[name]')].some(s=>!s.value);
    if(missing){ev.preventDefault();ev.stopImmediatePropagation();alert('8개 평가항목의 별점을 모두 선택해주세요.');}
  },true);
  const reviewObserver=new MutationObserver(upgradeReviewUI);
  reviewObserver.observe(document.documentElement,{subtree:true,childList:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{promoteHomeRanking();upgradeReviewUI()},{once:true});
  else{promoteHomeRanking();upgradeReviewUI()}
})();