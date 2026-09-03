/* WeddingRank member session + MY evaluation history v1.1 */
(()=>{
'use strict';
const C=window.WEDDINGRANK_CONFIG||{};
const BASE=String(C.SUPABASE_URL||'').replace(/\/+$/,'');
const KEY=C.SUPABASE_ANON_KEY||C.SUPABASE_PUBLISHABLE_KEY||C.SUPABASE_KEY||'';
const ACCESS='wr_access_token',REFRESH='wr_refresh_token',REMEMBER='wr_remember_login',EMAIL='wr_saved_email';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function getAccess(){return localStorage.getItem(ACCESS)||sessionStorage.getItem(ACCESS)||''}
function getRefresh(){return localStorage.getItem(REFRESH)||sessionStorage.getItem(REFRESH)||''}
function isRemember(){return localStorage.getItem(REMEMBER)==='1'}
function saveAuth(d,remember,email){
  [localStorage,sessionStorage].forEach(s=>{s.removeItem(ACCESS);s.removeItem(REFRESH)});
  const st=remember?localStorage:sessionStorage;
  if(d?.access_token)st.setItem(ACCESS,d.access_token);
  if(d?.refresh_token)st.setItem(REFRESH,d.refresh_token);
  if(remember){localStorage.setItem(REMEMBER,'1');if(email)localStorage.setItem(EMAIL,email)}
  else{localStorage.removeItem(REMEMBER);localStorage.removeItem(EMAIL)}
}
async function auth(path,options={},token=''){
  const h={apikey:KEY,'Content-Type':'application/json',...(options.headers||{})};if(token)h.Authorization='Bearer '+token;
  const r=await fetch(`${BASE}/auth/v1/${path}`,{...options,headers:h,cache:'no-store'}),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch(_){}if(!r.ok)throw new Error(d.message||d.msg||t||`Auth ${r.status}`);return d;
}
async function api(path,token=getAccess()){
  const h={apikey:KEY};if(token)h.Authorization='Bearer '+token;
  const r=await fetch(`${BASE}/rest/v1/${path}`,{headers:h,cache:'no-store'}),t=await r.text();if(!r.ok)throw new Error(t||`HTTP ${r.status}`);return t?JSON.parse(t):[];
}
function installRemember(){
  const pass=$('#siteAuthPasswordLabel');if(!pass||$('#wrRememberLogin'))return;
  const label=document.createElement('label');label.id='wrRememberWrap';label.className='siteAuthLabel';label.style.cssText='display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-top:4px';
  label.innerHTML='<input id="wrRememberLogin" type="checkbox" style="width:18px;height:18px;margin-top:2px"><span><b>아이디 저장 · 로그인 상태 유지</b><br><small style="font-weight:400;color:#777">비밀번호 원문은 저장하지 않습니다.</small></span>';
  pass.insertAdjacentElement('afterend',label);$('#wrRememberLogin').checked=isRemember();const saved=localStorage.getItem(EMAIL);if(saved&&$('#siteAuthEmail'))$('#siteAuthEmail').value=saved;
}
function ensureHistoryBox(){
  const card=$('#siteAuthModal .siteAuthCard')||$('#siteAuthModal section');if(!card)return null;
  let box=$('#wrMyHistory');if(box)return box;
  box=document.createElement('section');box.id='wrMyHistory';box.style.cssText='display:none;margin-top:18px;padding-top:16px;border-top:1px solid #e8e8e8;max-height:34vh;overflow:auto;text-align:left';
  card.appendChild(box);return box;
}
async function loadHistory(){
  const box=ensureHistoryBox(),token=getAccess();if(!box||!token)return;
  box.style.display='block';box.innerHTML='<h3 style="margin:0 0 10px">내 평가 히스토리</h3><p style="color:#777">불러오는 중…</p>';
  try{
    const user=await auth('user',{method:'GET'},token);
    const rows=await api(`reviews?select=review_id,hall_id,visit_role,overall_score,review_text,created_at&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`,token);
    const ids=[...new Set(rows.map(r=>r.hall_id).filter(Boolean))];let halls=[];
    if(ids.length)halls=await api(`wedding_halls?select=hall_id,name,sido,sigungu&hall_id=in.(${ids.map(x=>encodeURIComponent(String(x))).join(',')})`,'');
    const hm=new Map(halls.map(h=>[String(h.hall_id),h]));
    box.innerHTML='<h3 style="margin:0 0 10px">내 평가 히스토리</h3>'+(rows.length?rows.map(r=>{const h=hm.get(String(r.hall_id))||{},area=[h.sido,h.sigungu].filter(Boolean).join(' ');return `<article style="padding:12px 0;border-top:1px solid #eee"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(h.name||'예식장')}</strong><b>${r.overall_score!=null?Number(r.overall_score).toFixed(1)+' / 5':'평가'}</b></div><div style="font-size:12px;color:#777;margin:4px 0">${esc(area)}${area?' · ':''}${esc((r.created_at||'').slice(0,10))} · ${esc(r.visit_role||'이용자')}</div>${r.review_text?`<p style="margin:6px 0;white-space:pre-wrap">${esc(r.review_text)}</p>`:''}<a href="#hall=${encodeURIComponent(r.hall_id)}" data-close-auth style="font-size:13px;font-weight:700">해당 예식장 보기 →</a></article>`}).join(''):'<p style="padding:10px 0;color:#777">아직 등록한 예식장 평가가 없습니다.</p>');
  }catch(e){box.innerHTML='<h3 style="margin:0 0 10px">내 평가 히스토리</h3><p style="color:#a33">평가 내역을 불러오지 못했습니다.</p>';console.warn('MY history',e)}
}
function syncMyModal(){
  const modal=$('#siteAuthModal');if(!modal||modal.hidden)return;
  const title=($('#siteAuthTitle')?.textContent||'').trim(),my=title==='MY'||($('#siteAccountBtn')?.textContent||'').trim()==='MY'&&!!getAccess();
  const emailLabel=$('#siteAuthEmail')?.closest('label'),passLabel=$('#siteAuthPasswordLabel'),remember=$('#wrRememberWrap'),history=ensureHistoryBox();
  if(my){if(emailLabel)emailLabel.style.display='none';if(passLabel)passLabel.style.display='none';if(remember)remember.style.display='none';if(history)history.style.display='block';loadHistory()}
  else{if(emailLabel)emailLabel.style.display='';if(passLabel)passLabel.style.display='';if(remember)remember.style.display='flex';if(history)history.style.display='none'}
}
function boot(){
  installRemember();ensureHistoryBox();
  document.addEventListener('click',e=>{if(e.target.closest?.('#siteAccountBtn'))setTimeout(syncMyModal,80);if(e.target.closest?.('[data-close-auth]'))setTimeout(()=>{const h=$('#wrMyHistory');if(h)h.style.display='none'},50)},true);
  [300,800,1600,3000].forEach(ms=>setTimeout(()=>{installRemember();syncMyModal()},ms));
  const modal=$('#siteAuthModal');if(modal)new MutationObserver(syncMyModal).observe(modal,{attributes:true,attributeFilter:['hidden']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
