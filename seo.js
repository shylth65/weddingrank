(()=>{
  function installStyles(){
    if(document.querySelector('#wrMobileHeaderFix')) document.querySelector('#wrMobileHeaderFix').remove();
    const s=document.createElement('style');s.id='wrMobileHeaderFix';s.textContent=`
.wrMobilePrimary{display:none}
.reviewLoginInline{display:flex;gap:8px;align-items:center;margin-bottom:8px}.reviewLoginInline input{flex:1;min-width:0;padding:12px 13px;border:1px solid #e4dcda;border-radius:10px;background:#fff}.reviewLoginInline button{padding:12px 16px;border:0;border-radius:10px;background:#835456;color:#fff;font-weight:800;white-space:nowrap}
@media(max-width:800px){
  .mobileQuickNav,.wrMobileNav{display:none!important}
  .hero .quickLinks{display:none!important}
  .top .mainNav{display:none!important}
  .wrMobilePrimary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:10px 5vw 12px;background:#fff;border-bottom:1px solid #eee5e2}
  .wrMobilePrimary a{display:flex;align-items:center;justify-content:center;min-height:44px;border:1px solid #e2d4d1;border-radius:999px;background:#fff;font-size:13px;font-weight:900;color:#6f5558}
  .wrMobilePrimary a:first-child{border-color:#d6c6ea;color:#76549a;background:linear-gradient(135deg,#fff8fc,#f7f2ff)}
  .wrMobilePrimary a:last-child{border-color:#e5c9d8;color:#9a5578}
  .reviewLoginInline{flex-direction:column;align-items:stretch}.reviewLoginInline button{width:100%}
}`;document.head.appendChild(s);
  }
  function cleanupNav(){
    document.querySelectorAll('.wrMobileNav').forEach(n=>n.remove());
    document.querySelectorAll('.mobileQuickNav').forEach(n=>n.style.display='none');
    const quick=document.querySelector('.hero .quickLinks');if(quick){const seen=new Set();[...quick.querySelectorAll('a')].forEach(a=>{const k=(a.getAttribute('href')||'')+'|'+(a.textContent||'').trim();if(seen.has(k))a.remove();else seen.add(k)})}
    let n=document.querySelector('.wrMobilePrimary');
    if(!n){n=document.createElement('nav');n.className='wrMobilePrimary';n.setAttribute('aria-label','모바일 주요 메뉴');document.querySelector('.top')?.insertAdjacentElement('afterend',n)}
    if(n)n.innerHTML='<a href="#rankings">예식장 순위</a><a href="#find" data-review-link="1">예식장 평가</a>';
  }
  function overrideReviewLogin(){
    if(typeof renderAuth!=='function'||typeof syncHeaderAuth!=='function')return;
    renderAuth=function(){
      syncHeaderAuth();const box=document.querySelector('#authBox');if(!box)return;
      if(currentUser){box.innerHTML=`<div class="signed"><span>${esc(currentUser.email||'로그인 사용자')}</span><button id="logoutBtn">로그아웃</button></div>`;document.querySelector('#logoutBtn')?.addEventListener('click',logoutUser)}
      else{
        box.innerHTML='<div class="reviewLoginInline"><input id="reviewLoginEmail" type="email" inputmode="email" autocomplete="email" placeholder="이메일 주소"><button id="reviewLoginBtn" type="button">로그인</button></div><small>이메일과 비밀번호로 로그인합니다.</small>';
        document.querySelector('#reviewLoginBtn')?.addEventListener('click',()=>{const email=(document.querySelector('#reviewLoginEmail')?.value||'').trim();openSiteAuth('login');const target=document.querySelector('#siteAuthEmail');if(target&&email)target.value=email;target?.focus()});
      }
      renderReviewForm();
    };
    try{renderAuth()}catch(_){ }
  }
  const run=()=>{installStyles();cleanupNav();overrideReviewLogin();setTimeout(cleanupNav,250);setTimeout(()=>{cleanupNav();try{renderAuth()}catch(_){}},900)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('hashchange',()=>setTimeout(()=>{cleanupNav();try{renderAuth()}catch(_){}},350));
})();