/* WeddingRank member session + MY evaluation history v1 */
(()=>{
'use strict';
const C=window.WEDDINGRANK_CONFIG||{};
const BASE=String(C.SUPABASE_URL||'').replace(/\/+$/,'');
const KEY=C.SUPABASE_ANON_KEY||C.SUPABASE_PUBLISHABLE_KEY||C.SUPABASE_KEY||'';
const ACCESS='wr_access_token',REFRESH='wr_refresh_token',REMEMBER='wr_remember_login',EMAIL='wr_saved_email',TEMP='wr_session_login';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// Bridge session-only tokens to the legacy app before app.js starts.
if(sessionStorage.getItem(ACCESS) && !localStorage.getItem(ACCESS)){
  localStorage.setItem(ACCESS,sessionStorage.getItem(ACCESS));
  if(sessionStorage.getItem(REFRESH))localStorage.setItem(REFRESH,sessionStorage.getItem(REFRESH));
  sessionStorage.setItem(TEMP,'1');
}
function getAccess(){return localStorage.getItem(ACCESS)||sessionStorage.getItem(ACCESS)||''}
function getRefresh(){return localStorage.getItem(REFRESH)||sessionStorage.getItem(REFRESH)||''}
function isRemember(){return localStorage.getItem(REMEMBER)==='1'}
function clearAuth(){[localStorage,sessionStorage].forEach(s=>{s.removeItem(ACCESS);s.removeItem(REFRESH)});localStorage.removeItem(REMEMBER)}
function saveAuth(d,remember,email){
  [localStorage,sessionStorage].forEach(s=>{s.removeItem(ACCESS);s.removeItem(REFRESH)});
  const st=remember?localStorage:sessionStorage;
  if(d.access_token)st.setItem(ACCESS,d.access_token);
  if(d.refresh_token)st.setItem(REFRESH,d.refresh_token);
  if(remember){localStorage.setItem(REMEMBER,'1');localStorage.setItem(EMAIL,email)}
  else {localStorage.removeItem(REMEMBER);localStorage.removeItem(EMAIL);localStorage.setItem(ACCESS,d.access_token||'');if(d.refresh_token)localStorage.setItem(REFRESH,d.refresh_token);sessionStorage.setItem(TEMP,'1')}
}
async function auth(path,options={},token=''){
  const h={apikey:KEY,'Content-Type':'application/json',...(options.headers||{})};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetch(`${BASE}/auth/v1/${path}`,{...options,headers:h,cache:'no-store'});
  const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch(_){}
  if(!r.ok)throw new Error(d.message||d.msg||t||`Auth ${r.status}`);
  return d;
}
function jwtExpired(token){try{const p=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return !p.exp||Date.now()>=p.exp*1000-60000}catch(_){return true}}
async function refreshIfNeeded(){
  const a=getAccess(),r=getRefresh();if(!r||(!jwtExpired(a)&&a))return;
  try{
    const d=await auth('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:r})});
    saveAuth(d,isRemember(),localStorage.getItem(EMAIL)||'');
    location.reload();
  }catch(_){clearAuth()}
}
function installRemember(){
  const passLabel=$('#siteAuthPasswordLabel');if(!passLabel||$('#wrRememberLogin'))return;
  const label=document.createElement('label');label.className='siteAuthLabel';label.id='wrRememberWrap';
  label.style.cssText='display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-top:2px';
  label.innerHTML='<input id="wrRememberLogin" type="checkbox" style="width:18px;height:18px;margin-top:2px"><span><b>아이디 저장 · 로그인 상태 유지</b><br><small style="font-weight:400;color:#777">비밀번호 원문은 저장하지 않고 로그인 토큰을 안전하게 유지합니다.</small></span>';
  passLabel.insertAdjacentElement('afterend',label);
  $('#wrRememberLogin').checked=isRemember();
  const saved=localStorage.getItem(EMAIL);if(saved&&$('#siteAuthEmail'))$('#siteAuthEmail').value=saved;
}
function isLoginMode(){const n=$('#siteAuthNewPasswordLabel');return !n || n.hidden || getComputedStyle(n).display==='none'}
async function login(){
  const email=$('#siteAuthEmail')?.value.trim().toLowerCase()||'',password=$('#siteAuthPassword')?.value||'',btn=$('#siteAuthSubmit'),remember=Boolean($('#wrRememberLogin')?.checked);
  if(!email||!email.includes('@'))return alert('이메일 주소를 확인해주세요.');
  if(password.length<8)return alert('비밀번호는 8자 이상 입력해주세요.');
  btn.disabled=true;btn.textContent='확인 중…';
  try{
    let d;
    try{d=await auth('token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})})}
    catch(e){
      if(!/invalid login credentials/i.test(e.message))throw e;
      d=await auth('signup',{method:'POST',body:JSON.stringify({email,password,data:{display_name:'WeddingRank 회원'}})});
      if(!d.access_token){alert('가입 확인 메일을 확인한 뒤 같은 화면에서 로그인해주세요.');return}
    }
    if(!d.access_token)throw new Error('로그인 토큰을 받지 못했습니다.');
    saveAuth(d,remember,email);
    alert(remember?'로그인되었습니다. 다음 접속부터 로그인 상태를 유지합니다.':'로그인되었습니다.');
    location.reload();
  }catch(e){alert('로그인·가입 오류: '+e.message)}
  finally{btn.disabled=false;btn.textContent='로그인 · 간편회원가입'}
}
async function api(path,token=getAccess()){
  const h={apikey:KEY};if(token)h.Authorization='Bearer '+token;
  const r=await fetch(`${BASE}/rest/v1/${path}`,{headers:h,cache:'no-store'}),t=await r.text();
  if(!r.ok)throw new Error(t||`HTTP ${r.status}`);return t?JSON.parse(t):[];
}
function ensureHistoryBox(){
  const card=$('#siteAuthModal section');if(!card)return null;
  let box=$('#wrMyHistory');if(box)return box;
  box=document.createElement('section');box.id='wrMyHistory';box.style.cssText='margin-top:20px;padding-top:18px;border-top:1px solid #e8e8e8;max-height:42vh;overflow:auto';
  const logout=$('#siteAuthLogout');(logout?.parentElement||card).appendChild(box);return box;
}
async function loadHistory(){
  const box=ensureHistoryBox();if(!box)return;
  const token=getAccess();if(!token){box.innerHTML='';return}
  box.innerHTML='<h3 style="margin:0 0 10px">내 평가 히스토리</h3><p style="color:#777">불러오는 중…</p>';
  try{
    const user=await auth('user',{method:'GET'},token);
    const rows=await api(`reviews?select=review_id,hall_id,visit_role,food_score,parking_score,access_score,facility_score,bride_waiting_score,banquet_score,service_score,value_score,overall_score,review_text,created_at&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`,token);
    const ids=[...new Set(rows.map(r=>r.hall_id).filter(Boolean))];let halls=[];
    if(ids.length)halls=await api(`wedding_halls?select=hall_id,name,sido,sigungu&hall_id=in.(${ids.map(encodeURIComponent).join(',')})`,'');
    const hm=new Map(halls.map(h=>[String(h.hall_id),h]));
    box.innerHTML='<h3 style="margin:0 0 10px">내 평가 히스토리</h3>'+(rows.length?rows.map(r=>{const h=hm.get(String(r.hall_id))||{};const nm=h.name||'예식장';const area=[h.sido,h.sigungu].filter(Boolean).join(' ');return `<article style="padding:12px 0;border-top:1px solid #eee"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(nm)}</strong><b>${r.overall_score!=null?Number(r.overall_score).toFixed(1)+' / 5':'평점'}</b></div><div style="font-size:12px;color:#777;margin:4px 0">${esc(area)}${area?' · ':''}${esc((r.created_at||'').slice(0,10))} · ${esc(r.visit_role||'이용자')}</div>${r.review_text?`<p style="margin:6px 0;white-space:pre-wrap">${esc(r.review_text)}</p>`:''}<a href="#hall=${encodeURIComponent(r.hall_id)}" style="font-size:13px">해당 예식장 보기 →</a></article>`}).join(''):'<p style="padding:10px 0;color:#777">아직 등록한 예식장 평가가 없습니다.</p>');
  }catch(e){box.innerHTML='<h3 style="margin:0 0 10px">내 평가 히스토리</h3><p style="color:#a33">평가 내역을 불러오지 못했습니다.</p>';console.warn('MY history',e)}
}
function boot(){
  installRemember();refreshIfNeeded();
  // Allow the legacy app to consume a session token, then remove the persistent bridge.
  if(sessionStorage.getItem(TEMP)==='1'&&!isRemember())setTimeout(()=>{localStorage.removeItem(ACCESS);localStorage.removeItem(REFRESH)},1400);
  document.addEventListener('click',e=>{
    const submit=e.target.closest?.('#siteAuthSubmit');
    if(submit&&isLoginMode()){
      e.preventDefault();e.stopImmediatePropagation();login();return;
    }
    const account=e.target.closest?.('#siteAccountBtn');if(account&&(account.textContent||'').trim()==='MY')setTimeout(loadHistory,150);
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&isLoginMode()&&['siteAuthEmail','siteAuthPassword'].includes(e.target?.id)){e.preventDefault();e.stopImmediatePropagation();login()}},true);
  [500,1400].forEach(ms=>setTimeout(installRemember,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
