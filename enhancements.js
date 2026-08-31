/* WeddingRank compare-state + auth + review UX v5.50 */
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

  let loginBusy=false,lastLoginSend=0;
  document.addEventListener('click',async ev=>{
    const btn=ev.target.closest?.('#loginBtn');
    if(!btn)return;
    ev.preventDefault();ev.stopImmediatePropagation();
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
      if(!r.ok){let code='';try{code=JSON.parse(raw).error_code||''}catch(_){}if(r.status===429||code==='over_email_send_rate_limit')throw new Error('RATE_LIMIT');throw new Error('SEND_FAILED')}
      lastLoginSend=Date.now();alert('로그인 링크를 이메일로 보냈습니다. 메일의 링크를 누르면 WeddingRank로 돌아옵니다.');
    }catch(e){if(e?.message==='RATE_LIMIT')alert('이메일 발송 횟수가 많습니다. 잠시 후 다시 시도해주세요.');else alert('로그인 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');console.warn('WeddingRank login hotfix',e)}finally{loginBusy=false;btn.disabled=false}
  },true);

  function installReviewStyles(){
    if(document.querySelector('#wrReviewUxStyles'))return;
    const style=document.createElement('style');style.id='wrReviewUxStyles';style.textContent=`
      .reviewWrite{margin-top:34px;padding:28px;border:1px solid #ecd8d4;border-radius:20px;background:linear-gradient(180deg,#fff,#fff9f8)}
      .reviewWrite h3{font-size:24px;margin:0 0 8px;letter-spacing:-.7px}.reviewWrite h3:before{content:'★';display:inline-grid;place-items:center;width:34px;height:34px;margin-right:9px;border-radius:11px;background:#f7e2df;color:var(--rose-dark);font-size:17px;vertical-align:middle}
      #reviewForm{margin-top:18px}.scoreInputs{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px!important}
      #reviewForm .scoreInputs>label{position:relative;margin:0!important;padding:15px;border:1px solid #eee2df;border-radius:14px;background:#fff;font-weight:800;color:#544b49}
      .wrStarRating{display:flex;gap:3px;margin-top:9px}.wrStar{border:0;background:transparent;padding:2px 1px;cursor:pointer;font-size:27px;line-height:1;color:#ddd2cf;transition:transform .12s ease,color .12s ease}.wrStar:hover{transform:scale(1.08)}.wrStar.isOn{color:#e8a318}.wrStar:focus-visible{outline:2px solid #b77b77;outline-offset:2px;border-radius:5px}.wrStarSource{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:.01!important;pointer-events:none!important;bottom:4px!important;left:4px!important}
      #reviewForm>label:first-child{font-weight:800}#reviewForm>label:first-child select,#reviewForm textarea{border-radius:12px!important;border-color:#e4d8d5!important}#reviewForm textarea{min-height:140px!important;line-height:1.65}.submitReview{width:100%;min-height:56px;margin-top:12px!important;border-radius:14px!important;background:var(--rose-dark)!important;color:#fff!important;font-size:16px!important;font-weight:900!important;box-shadow:0 8px 20px rgba(131,84,86,.18)}.submitReview:hover{background:#74484a!important}.submitReview:disabled{box-shadow:none}
      .loginRow{padding:14px;border:1px solid #eee2df;border-radius:14px;background:#fff}.loginRow button{background:var(--rose-dark);color:#fff}.signed{padding:12px 14px;border-radius:12px;background:#fff;border:1px solid #eee2df}.signed button{margin-left:auto}
      .wrProfile{margin:14px 0 18px;padding:16px;border-radius:16px;background:#fff;border:1px solid #eadfdd}.wrProfileTop{display:flex;align-items:center;justify-content:space-between;gap:12px}.wrProfileName{font-weight:900;font-size:17px}.wrLevel{font-weight:900;color:#8b5759;background:#f8e8e5;padding:6px 9px;border-radius:999px}.wrStats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.wrStats span{padding:9px 6px;text-align:center;border-radius:10px;background:#faf7f6;font-size:12px}.wrStats b{display:block;font-size:16px;color:#443b39}.wrBadges{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.wrBadge{font-size:12px;padding:5px 8px;border-radius:999px;background:#fff3d9;border:1px solid #f1dfb7}.wrRewardNote{margin:10px 0 0;font-size:12px;color:#7a6e6b}
      .wrReviewMeta{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.wrVerified{font-size:11px;font-weight:900;color:#19704a;background:#e7f7ef;padding:4px 7px;border-radius:999px}.wrHelpful{border:1px solid #e2d7d4;background:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;font-weight:800;color:#665b58}.wrHelpful.isOn{background:#f8e8e5;border-color:#d8aaa5;color:#8b5759}.wrVerifyBox{margin-top:12px;padding:13px;border-radius:12px;background:#fff;border:1px dashed #d9c2bd}.wrVerifyBox select,.wrVerifyBox input{width:100%;margin-top:7px}.wrVerifyBtn{margin-top:8px;border:0;border-radius:10px;padding:10px 12px;background:#8b5759;color:#fff;font-weight:900;cursor:pointer}
      @media(max-width:800px){.reviewWrite{padding:20px 16px}.reviewWrite h3{font-size:21px}.scoreInputs{grid-template-columns:1fr!important}.wrStar{font-size:30px}.loginRow{align-items:stretch;flex-direction:column}.loginRow button{min-height:46px}.wrStats{grid-template-columns:repeat(2,1fr)}}
    `;document.head.appendChild(style)
  }
  function upgradeReviewUI(){
    installReviewStyles();const h3=document.querySelector('.reviewWrite h3');if(h3&&h3.textContent.trim()!=='이 예식장 평가하기')h3.textContent='이 예식장 평가하기';const form=document.querySelector('#reviewForm');if(!form)return;
    form.querySelectorAll('.scoreInputs label').forEach(label=>{const select=label.querySelector('select[name]');if(!select||select.dataset.starified==='1')return;select.dataset.starified='1';select.classList.add('wrStarSource');const stars=document.createElement('div');stars.className='wrStarRating';stars.setAttribute('role','radiogroup');stars.setAttribute('aria-label',(label.childNodes[0]?.textContent||'평가')+' 점수');const paint=()=>{const value=Number(select.value||0);stars.querySelectorAll('.wrStar').forEach(btn=>{const on=Number(btn.dataset.value)<=value;btn.classList.toggle('isOn',on);btn.setAttribute('aria-checked',String(Number(btn.dataset.value)===value))})};for(let v=1;v<=5;v++){const btn=document.createElement('button');btn.type='button';btn.className='wrStar';btn.dataset.value=String(v);btn.textContent='★';btn.setAttribute('role','radio');btn.setAttribute('aria-label',`${v}점`);btn.setAttribute('aria-checked','false');btn.addEventListener('click',()=>{select.value=String(v);select.dispatchEvent(new Event('change',{bubbles:true}));paint()});stars.appendChild(btn)}select.insertAdjacentElement('afterend',stars);paint()})
  }
  document.addEventListener('submit',ev=>{const form=ev.target.closest?.('#reviewForm');if(!form)return;const missing=[...form.querySelectorAll('.scoreInputs select[name]')].some(s=>!s.value);if(missing){ev.preventDefault();ev.stopImmediatePropagation();alert('8개 평가항목의 별점을 모두 선택해주세요.')}},true);
  const reviewObserver=new MutationObserver(upgradeReviewUI);reviewObserver.observe(document.documentElement,{subtree:true,childList:true});

  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=()=>String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=()=>cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const token=()=>localStorage.getItem('wr_access_token')||'';
  const apiHeaders=(auth=false)=>({apikey:key(),Authorization:`Bearer ${auth&&token()?token():key()}`,'Content-Type':'application/json'});
  async function rest(path,auth=false,options={}){const r=await fetch(base()+'/rest/v1/'+path,{...options,headers:{...apiHeaders(auth),...(options.headers||{})}});const t=await r.text();if(!r.ok)throw new Error(t||`HTTP ${r.status}`);return t?JSON.parse(t):[]}
  const hallId=()=>{const m=location.hash.match(/^#hall=(.+)$/);return m?m[1]:null};
  async function userId(){if(!token())return null;try{const r=await fetch(base()+'/auth/v1/user',{headers:apiHeaders(true)});if(!r.ok)return null;return (await r.json()).id||null}catch(_){return null}}

  async function renderProfile(){
    const wrap=document.querySelector('.reviewWrite');if(!wrap)return;let box=document.querySelector('#wrProfile');if(!box){box=document.createElement('div');box.id='wrProfile';wrap.querySelector('#authBox')?.insertAdjacentElement('afterend',box)}
    const uid=await userId();if(!uid){box.innerHTML='<p class="wrRewardNote">리뷰 작성 시 100P · 인증 완료 시 200P · 내 리뷰가 도움돼요를 받을 때마다 5P가 쌓입니다.</p>';return}
    try{const [profiles,badges]=await Promise.all([rest(`profiles?select=nickname,points,level,review_count,verified_review_count,helpful_received&user_id=eq.${encodeURIComponent(uid)}&limit=1`,true),rest(`user_badges?select=badge_code,badges(name,icon)&user_id=eq.${encodeURIComponent(uid)}`,true)]);const p=profiles[0]||{nickname:'WeddingRank 회원',points:0,level:1,review_count:0,verified_review_count:0,helpful_received:0};box.className='wrProfile';box.innerHTML=`<div class="wrProfileTop"><span class="wrProfileName">${escapeHtml(p.nickname||'WeddingRank 회원')}</span><span class="wrLevel">LV.${Number(p.level||1)} · ${Number(p.points||0).toLocaleString('ko-KR')}P</span></div><div class="wrStats"><span><b>${p.review_count||0}</b>리뷰</span><span><b>${p.verified_review_count||0}</b>인증</span><span><b>${p.helpful_received||0}</b>도움받음</span><span><b>${Math.max(0,100-(Number(p.points||0)%100))}</b>다음 LV까지</span></div>${badges.length?`<div class="wrBadges">${badges.map(x=>`<span class="wrBadge">${escapeHtml(x.badges?.icon||'🏅')} ${escapeHtml(x.badges?.name||x.badge_code)}</span>`).join('')}</div>`:''}<p class="wrRewardNote">리뷰 +100P · 인증 +200P · 도움돼요 수신 +5P</p>`}catch(e){console.warn('profile UX',e)}
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

  let enhancedHall='';
  async function enhanceReviewList(force=false){
    const id=hallId(),list=document.querySelector('#reviewList');if(!id||!list||(!force&&enhancedHall===id&&list.dataset.reputation==='1'))return;
    try{const uid=await userId();const reviews=await rest(`reviews?select=review_id,user_id,visit_role,overall_score,review_text,created_at,verification_status,helpful_count&hall_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=20`,!!uid);let mine=new Set();if(uid){const votes=await rest(`review_helpful?select=review_id&user_id=eq.${encodeURIComponent(uid)}`,true);mine=new Set(votes.map(v=>v.review_id))}list.dataset.reputation='1';enhancedHall=id;list.innerHTML=reviews.filter(r=>r.review_text).map(r=>`<article class="reviewItem" data-review-id="${r.review_id}"><div class="wrReviewMeta"><b>${escapeHtml(r.visit_role||'이용자')}</b>${r.verification_status==='인증완료'?'<span class="wrVerified">✓ 인증리뷰</span>':''}<span>${escapeHtml((r.created_at||'').slice(0,10))}</span></div><p>${escapeHtml(r.review_text)}</p><button type="button" class="wrHelpful${mine.has(r.review_id)?' isOn':''}" data-review-id="${r.review_id}" ${uid===r.user_id?'disabled title="내 리뷰에는 누를 수 없습니다."':''}>👍 도움돼요 <span>${Number(r.helpful_count||0)}</span></button>${uid===r.user_id?verificationMarkup(r):''}</article>`).join('');renderProfile()}catch(e){console.warn('review reputation UX',e)}
  }
  function verificationMarkup(r){if(r.verification_status==='인증완료')return '';if(r.verification_status==='인증대기')return '<div class="wrVerifyBox">인증자료 검토 중입니다.</div>';return `<div class="wrVerifyBox"><b>실이용 인증하면 +200P</b><select class="wrVerifyType"><option value="견적">견적 인증</option><option value="계약">계약 인증</option><option value="실예식">실예식 인증</option></select><input class="wrEvidence" placeholder="인증자료 확인용 링크(선택)"><button type="button" class="wrVerifyBtn" data-review-id="${r.review_id}">인증 요청</button></div>`}

  document.addEventListener('click',async ev=>{
    const helpful=ev.target.closest?.('.wrHelpful');if(helpful&&!helpful.disabled){const uid=await userId();if(!uid){alert('도움돼요는 로그인 후 이용할 수 있습니다.');return}const rid=helpful.dataset.reviewId;helpful.disabled=true;try{if(helpful.classList.contains('isOn'))await rest(`review_helpful?review_id=eq.${encodeURIComponent(rid)}&user_id=eq.${encodeURIComponent(uid)}`,true,{method:'DELETE',headers:{Prefer:'return=minimal'}});else await rest('review_helpful',true,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({review_id:rid,user_id:uid})});enhancedHall='';await enhanceReviewList(true)}catch(e){alert('도움돼요 처리 중 오류가 발생했습니다.')}finally{helpful.disabled=false}return}
    const verify=ev.target.closest?.('.wrVerifyBtn');if(verify){const uid=await userId();if(!uid)return alert('로그인이 필요합니다.');const box=verify.closest('.wrVerifyBox'),type=box.querySelector('.wrVerifyType')?.value||'견적',evidence=(box.querySelector('.wrEvidence')?.value||'').trim();verify.disabled=true;try{await rest('review_verifications',true,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({review_id:verify.dataset.reviewId,user_id:uid,verification_type:type,evidence_url:evidence||null})});alert('인증 요청이 접수되었습니다. 승인되면 200P가 지급됩니다.');box.innerHTML='인증자료 검토 중입니다.'}catch(e){alert(e.message.includes('23505')?'이미 같은 종류의 인증을 요청했습니다.':'인증 요청 처리 중 오류가 발생했습니다.')}finally{verify.disabled=false}}
  });

  const repObserver=new MutationObserver(()=>{if(document.querySelector('#reviewList')?.dataset.reputation!=='1')enhanceReviewList();if(document.querySelector('.reviewWrite'))renderProfile()});repObserver.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('hashchange',()=>{enhancedHall='';setTimeout(()=>enhanceReviewList(true),500)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{upgradeReviewUI();setTimeout(()=>enhanceReviewList(true),700)},{once:true});else{upgradeReviewUI();setTimeout(()=>enhanceReviewList(true),700)}
})();