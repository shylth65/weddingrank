const cfg = window.WEDDINGRANK_CONFIG || {};
let halls = [];
let priceByHall = new Map();
let currentUser = null;
let accessToken = null;
let rankingMode = "overall";
let visibleHallCount = 24;
const PAGE_SIZE = 24;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

function getKey(){return cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||""}
function getUrl(){return String(cfg.SUPABASE_URL||"").trim().replace(/\/+$/,"")}
function headers(){const key=getKey();return{apikey:key,Authorization:`Bearer ${key}`}}
function authHeaders(){return{apikey:getKey(),Authorization:`Bearer ${accessToken||getKey()}`,"Content-Type":"application/json"}}

async function api(path){
  const r=await fetch(`${getUrl()}/rest/v1/${path}`,{headers:headers()});
  const text=await r.text();
  if(!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0,300)}`);
  return text?JSON.parse(text):[];
}
async function authRest(path){
  const r=await fetch(`${getUrl()}/rest/v1/${path}`,{headers:authHeaders()});
  const text=await r.text();
  if(!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0,300)}`);
  return text?JSON.parse(text):[];
}
function showError(e){const s=$("#status");if(s)s.textContent=`연결 오류: ${e.message||e}`}
function money(v){return v==null?"확인중":Number(v).toLocaleString("ko-KR")+"원"}
function score(v){return v==null?"—":Number(v).toFixed(1)}
function avg(arr,key){const vals=arr.map(x=>Number(x[key])).filter(v=>Number.isFinite(v)&&v>0);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null}

function buildPriceMap(prices){
  priceByHall=new Map();
  for(const p of prices){
    if(!p.hall_id||priceByHall.has(p.hall_id)) continue;
    priceByHall.set(p.hall_id,p);
  }
}
function priceBadge(hallId){
  const p=priceByHall.get(hallId);
  if(!p) return '<span class="badge price pendingPrice">가격정보 확인중</span>';
  if(p.meal_price_per_person!=null) return `<span class="badge price verifiedPrice">식대 ${Number(p.meal_price_per_person).toLocaleString("ko-KR")}원</span>`;
  if(p.rental_fee!=null) return `<span class="badge price verifiedPrice">대관 ${Number(p.rental_fee).toLocaleString("ko-KR")}원</span>`;
  return '<span class="badge price verifiedPrice">가격정보 있음</span>';
}

async function load(){
  try{
    if(!getUrl()) throw new Error("SUPABASE_URL이 없습니다.");
    if(!getKey()) throw new Error("Publishable key가 없습니다.");
    const [hallRows,priceRows]=await Promise.all([
      api("wedding_halls?select=hall_id,name,sido,sigungu,road_address,phone,website,venue_type&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc&limit=500"),
      api("wedding_prices?select=hall_id,effective_date,rental_fee,meal_price_per_person&order=effective_date.desc&limit=1000")
    ]);
    halls=hallRows;
    buildPriceMap(priceRows);
    if($("#publicCount")) $("#publicCount").textContent=halls.length+"곳";
    if($("#status")) $("#status").textContent=`공개 예식장 ${halls.length}곳 · 가격정보 ${priceByHall.size}곳`;
    setupRegions();
    render(true);
    route();
  }catch(e){showError(e)}
}

function setupRegions(){
  const regions=[...new Set(halls.map(x=>x.sido).filter(Boolean))].sort();
  const sido=$("#sido");
  if(sido) sido.innerHTML='<option value="">전국</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join("");
  const rankingRegion=$("#rankingRegion");
  if(rankingRegion) rankingRegion.innerHTML='<option value="">전국</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join("");
  const rb=$("#regionButtons");
  if(rb){
    rb.innerHTML=regions.map(x=>`<button data-region="${esc(x)}">${esc(x)}</button>`).join("");
    rb.onclick=e=>{if(e.target.dataset.region){$("#sido").value=e.target.dataset.region;visibleHallCount=PAGE_SIZE;showList();render()}};
  }
}
function showList(){if($("#listView"))$("#listView").hidden=false;if($("#detailView"))$("#detailView").hidden=true;if($("#rankingView"))$("#rankingView").hidden=true}

function ensureListControls(){
  const cards=$("#cards");
  if(!cards||$("#listControls")) return;
  const wrap=document.createElement("div");
  wrap.id="listControls";
  wrap.className="listControls";
  wrap.innerHTML='<span id="listResultCount"></span><button id="loadMoreBtn" type="button">예식장 더보기</button>';
  cards.insertAdjacentElement("afterend",wrap);
  $("#loadMoreBtn").addEventListener("click",()=>{visibleHallCount+=PAGE_SIZE;render()});
}
function render(reset=false){
  if(reset) visibleHallCount=PAGE_SIZE;
  const q=($("#search")?.value||"").trim().toLowerCase();
  const sido=$("#sido")?.value||"";
  const filtered=halls.filter(h=>(!sido||h.sido===sido)&&(!q||[h.name,h.sido,h.sigungu,h.road_address].join(" ").toLowerCase().includes(q)));
  const visible=filtered.slice(0,visibleHallCount);
  const cards=$("#cards");
  if(!cards)return;
  cards.innerHTML=visible.map(h=>`
    <article class="card clickable" data-id="${h.hall_id}" tabindex="0" role="link">
      <div class="cardTop"><div class="area">${esc(h.sido||"")} ${esc(h.sigungu||"")}</div>${priceByHall.has(h.hall_id)?'<span class="dataReady">가격확인</span>':''}</div>
      <h3>${esc(h.name)}</h3>
      <p>${esc(h.road_address||"주소 확인중")}</p>
      <div class="badges"><span class="badge">${esc(h.venue_type||"예식장")}</span>${priceBadge(h.hall_id)}</div>
      <div class="more">상세정보 보기 →</div>
    </article>`).join("");
  if($("#empty")) $("#empty").hidden=filtered.length!==0;
  ensureListControls();
  if($("#listResultCount")) $("#listResultCount").textContent=`검색결과 ${filtered.length}곳 · ${visible.length}곳 표시중`;
  const more=$("#loadMoreBtn");
  if(more){more.hidden=visible.length>=filtered.length;more.textContent=`예식장 더보기 (${Math.min(PAGE_SIZE,filtered.length-visible.length)}곳)`}
  document.querySelectorAll(".card[data-id]").forEach(c=>{
    const go=()=>location.hash=`hall=${c.dataset.id}`;
    c.onclick=go;
    c.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}};
  });
}

async function showDetail(id){
  const h=halls.find(x=>x.hall_id===id);if(!h)return;
  $("#listView").hidden=true;$("#detailView").hidden=false;if($("#rankingView"))$("#rankingView").hidden=true;window.scrollTo(0,0);
  $("#detailName").textContent=h.name;
  $("#detailArea").textContent=[h.sido,h.sigungu].filter(Boolean).join(" ");
  $("#detailAddress").textContent=h.road_address||"주소 확인중";
  $("#detailPhone").textContent=h.phone||"전화번호 확인중";
  $("#detailWebsite").innerHTML=h.website?`<a href="${esc(h.website)}" target="_blank" rel="noopener">공식/참고 사이트 열기 ↗</a>`:"홈페이지 확인중";
  try{
    const results=await Promise.allSettled([
      api(`hall_rooms?select=room_name,floor,capacity_min,capacity_max&hall_id=eq.${encodeURIComponent(id)}`),
      api(`wedding_prices?select=effective_date,rental_fee,meal_price_per_person,minimum_guarantee,notes&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc`),
      api(`reviews?select=visit_role,food_score,parking_score,access_score,facility_score,bride_waiting_score,banquet_score,service_score,value_score,overall_score,review_text,created_at&hall_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=100`)
    ]);
    const rooms=results[0].status==="fulfilled"?results[0].value:[];
    const prices=results[1].status==="fulfilled"?results[1].value:[];
    const reviews=results[2].status==="fulfilled"?results[2].value:[];
    $("#rooms").innerHTML=rooms.length?rooms.map(r=>`<div class="info-row"><b>${esc(r.room_name)}</b><span>${esc(r.floor||"")} ${r.capacity_min?`· 최소 ${r.capacity_min}명`:""} ${r.capacity_max?`· 최대 ${r.capacity_max}명`:""}</span></div>`).join(""):'<div class="pending">홀 정보 확인중</div>';
    $("#prices").innerHTML=prices.length?prices.map(p=>`<div class="pricebox"><div><small>기준일</small><b>${esc(p.effective_date||"-")}</b></div><div><small>대관료</small><b>${money(p.rental_fee)}</b></div><div><small>1인 식대</small><b>${money(p.meal_price_per_person)}</b></div><div><small>최소보증</small><b>${p.minimum_guarantee?`${p.minimum_guarantee}명`:"확인중"}</b></div><p>${esc(p.notes||"가격은 계약 전 재확인이 필요합니다.")}</p></div>`).join(""):'<div class="pending big">가격정보 확인중<br><small>확인되는 순서대로 업데이트합니다.</small></div>';
    renderReviews(reviews);renderAuth();setupConsultForm();
  }catch(e){console.error(e)}
}

function renderReviews(reviews){
  const box=$("#reviewSummary"),list=$("#reviewList");if(!box||!list)return;
  if(!reviews.length){box.innerHTML='<div class="pending big">아직 등록된 평가가 없습니다.<br><small>첫 평가가 등록되면 랭킹에 자동 반영됩니다.</small></div>';list.innerHTML="";return}
  const metrics=[["음식","food_score"],["교통/접근성","access_score"],["주차","parking_score"],["예식홀/시설","facility_score"],["신부대기실","bride_waiting_score"],["연회장","banquet_score"],["서비스","service_score"],["가성비","value_score"]];
  const overall=avg(reviews,"overall_score");
  box.innerHTML=`<div class="reviewScore"><div><small>종합평점</small><strong>${score(overall)}</strong><span>/ 5.0</span><p>${reviews.length}개 평가</p></div><div class="metricGrid">${metrics.map(([n,k])=>`<div><span>${n}</span><b>${score(avg(reviews,k))}</b></div>`).join("")}</div></div>`;
  list.innerHTML=reviews.filter(r=>r.review_text).slice(0,10).map(r=>`<article class="reviewItem"><div><b>${esc(r.visit_role||"이용자")}</b><span>${esc((r.created_at||"").slice(0,10))}</span></div><p>${esc(r.review_text)}</p></article>`).join("");
}

function route(){const m=location.hash.match(/^#hall=(.+)$/);if(m)showDetail(m[1]);else if(location.hash==="#rankings")loadRankings();else showList()}

async function authApi(path,options={}){
  const key=getKey(),h={apikey:key,"Content-Type":"application/json",...(options.headers||{})};if(accessToken)h.Authorization=`Bearer ${accessToken}`;
  const r=await fetch(`${getUrl()}/auth/v1/${path}`,{...options,headers:h}),t=await r.text();let data={};try{data=t?JSON.parse(t):{}}catch(_){}if(!r.ok)throw new Error(data.msg||data.message||`Auth ${r.status}`);return data;
}
async function restoreSession(){
  accessToken=localStorage.getItem("wr_access_token");if(!accessToken){renderAuth();return}
  try{currentUser=await authApi("user",{method:"GET"});renderAuth()}catch(e){localStorage.removeItem("wr_access_token");accessToken=null;currentUser=null;renderAuth()}
}
function logoutUser(){localStorage.removeItem("wr_access_token");accessToken=null;currentUser=null;renderAuth()}
function syncHeaderAuth(){const login=document.querySelector('.authAction[data-auth-mode="login"]'),signup=document.querySelector('.authAction[data-auth-mode="signup"]');if(login)login.textContent=currentUser?'로그인됨':'로그인';if(signup)signup.textContent=currentUser?'로그아웃':'회원가입'}
function renderAuth(){
  syncHeaderAuth();const box=$("#authBox");if(!box)return;
  box.innerHTML=currentUser?`<div class="signed"><span>${esc(currentUser.email||"로그인 사용자")}</span><button id="logoutBtn">로그아웃</button></div>`:`<div class="loginRow"><button id="loginBtn" type="button">로그인·회원가입</button></div><small>이메일과 비밀번호로 로그인합니다.</small>`;
  $("#logoutBtn")?.addEventListener("click",logoutUser);
  $("#loginBtn")?.addEventListener("click",()=>openSiteAuth("login"));renderReviewForm();
}
async function submitSiteAuth(){const email=$("#siteAuthEmail")?.value.trim(),password=$("#siteAuthPassword")?.value||"",signup=siteAuthMode==="signup";if(!email||!email.includes("@"))return alert("이메일 주소를 확인해주세요.");if(password.length<8)return alert("비밀번호는 8자 이상 입력해주세요.");try{const d=await authApi(signup?"signup":"token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});if(d.access_token){accessToken=d.access_token;localStorage.setItem("wr_access_token",accessToken);currentUser=await authApi("user",{method:"GET"});renderAuth()}alert(signup?(d.access_token?"회원가입과 로그인이 완료되었습니다.":"회원가입 확인 메일을 보냈습니다. 이메일 확인 후 로그인해주세요."):"로그인되었습니다.");closeSiteAuth()}catch(e){alert((signup?"회원가입":"로그인")+" 오류: "+e.message)}}
async function resetSitePassword(){const email=$("#siteAuthEmail")?.value.trim();if(!email||!email.includes("@"))return alert("이메일 주소를 먼저 입력해주세요.");try{await authApi("recover?redirect_to="+encodeURIComponent("https://weddingrank.kr/"),{method:"POST",body:JSON.stringify({email})});alert("비밀번호 재설정 메일을 보냈습니다.")}catch(e){alert(e.message==="email rate limit exceeded"?"이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.":"재설정 메일 오류: "+e.message)}}
let siteAuthMode="login";
function openSiteAuth(mode="login"){siteAuthMode=mode;const modal=$("#siteAuthModal"),title=$("#siteAuthTitle"),guide=$("#siteAuthGuide"),submit=$("#siteAuthSubmit"),email=$("#siteAuthEmail"),password=$("#siteAuthPassword");if(!modal)return;const signup=mode==="signup";title.textContent=signup?"회원가입":"로그인";guide.textContent=signup?"이메일과 비밀번호로 가입합니다.":"가입한 이메일과 비밀번호를 입력하세요.";submit.textContent=signup?"회원가입":"로그인";if(password)password.autocomplete=signup?"new-password":"current-password";modal.hidden=false;document.body.classList.add("authModalOpen");setTimeout(()=>email?.focus(),30)}
function closeSiteAuth(){const modal=$("#siteAuthModal");if(modal)modal.hidden=true;document.body.classList.remove("authModalOpen")}
function shareWeddingRank(){
  const text=encodeURIComponent("WeddingRank - 전국 예식장 순위·평가·가격 비교\n"+location.href),route=encodeURIComponent(location.hostname||"weddingrank.kr");
  if(/Android|iPhone|iPad/i.test(navigator.userAgent)){location.href=`bandapp://create/post?text=${text}&route=${route}`;setTimeout(()=>window.open(`https://band.us/plugin/share?body=${text}&route=${route}`,"share_band","width=410,height=540,resizable=yes"),700)}
  else window.open(`https://band.us/plugin/share?body=${text}&route=${route}`,"share_band","width=410,height=540,resizable=yes");
}
function setupHeaderActions(){
  document.querySelectorAll(".authAction").forEach(btn=>btn.addEventListener("click",()=>{if(currentUser){if(btn.dataset.authMode==="signup")logoutUser();return}openSiteAuth(btn.dataset.authMode||"login")}));
  document.querySelectorAll("[data-close-auth]").forEach(btn=>btn.addEventListener("click",closeSiteAuth));
  $("#shareSiteBtn")?.addEventListener("click",shareWeddingRank);
  $("#siteAuthSubmit")?.addEventListener("click",submitSiteAuth);$("#siteAuthReset")?.addEventListener("click",resetSitePassword);["siteAuthEmail","siteAuthPassword"].forEach(id=>$("#"+id)?.addEventListener("keydown",e=>{if(e.key==="Enter")$("#siteAuthSubmit")?.click()}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSiteAuth()});
}
function parseAuthHash(){
  const p=new URLSearchParams(location.hash.slice(1));
  if(p.get("access_token")){accessToken=p.get("access_token");localStorage.setItem("wr_access_token",accessToken);history.replaceState(null,"",location.pathname)}
}
async function renderReviewForm(){
  const wrap=$("#reviewFormWrap");if(!wrap)return;
  if(!currentUser){wrap.innerHTML='<div class="pending">평가를 작성하려면 먼저 이메일로 로그인해주세요.</div>';return}
  const hallId=(location.hash.match(/^#hall=(.+)$/)||[])[1];if(!hallId)return;
  wrap.innerHTML='<div class="pending">내 평가 여부를 확인하는 중입니다…</div>';
  try{
    const existing=await authRest(`reviews?select=review_id,overall_score,created_at&hall_id=eq.${encodeURIComponent(hallId)}&user_id=eq.${encodeURIComponent(currentUser.id)}&limit=1`);
    if(existing.length){const r=existing[0];wrap.innerHTML=`<div class="pending big"><b>이 예식장은 이미 평가하셨습니다.</b><br><small>등록일 ${esc((r.created_at||"").slice(0,10))}${r.overall_score!=null?` · 종합평점 ${Number(r.overall_score).toFixed(2)}점`:""}</small><br><small>현재는 예식장당 1인 1평가만 등록할 수 있습니다.</small></div>`;return}
  }catch(e){console.warn("기존 평가 확인 실패",e)}
  const metrics=[["food_score","음식"],["access_score","교통/접근성"],["parking_score","주차"],["facility_score","예식홀/시설"],["bride_waiting_score","신부대기실"],["banquet_score","연회장"],["service_score","서비스"],["value_score","가성비"]];
  wrap.innerHTML=`<form id="reviewForm"><label>방문 역할<select name="visit_role" required><option value="">선택</option><option>신랑신부</option><option>혼주</option><option>하객</option></select></label><div class="scoreInputs">${metrics.map(([k,n])=>`<label>${n}<select name="${k}" required><option value="">점수</option>${[5,4,3,2,1].map(v=>`<option value="${v}">${v}점</option>`).join("")}</select></label>`).join("")}</div><label>후기<textarea name="review_text" maxlength="1000" required></textarea></label><button type="submit" class="submitReview">평가 등록</button></form>`;
  $("#reviewForm")?.addEventListener("submit",submitReview);
}
async function submitReview(e){
  e.preventDefault();const hallId=(location.hash.match(/^#hall=(.+)$/)||[])[1];if(!hallId||!currentUser||!accessToken)return alert("로그인이 필요합니다.");
  const btn=e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="등록 중…"}
  const fd=new FormData(e.target),keys=["food_score","access_score","parking_score","facility_score","bride_waiting_score","banquet_score","service_score","value_score"],payload={hall_id:hallId,user_id:currentUser.id,visit_role:fd.get("visit_role"),review_text:fd.get("review_text")};keys.forEach(k=>payload[k]=Number(fd.get(k)));
  try{
    const r=await fetch(`${getUrl()}/rest/v1/reviews`,{method:"POST",headers:{...authHeaders(),Prefer:"return=representation"},body:JSON.stringify(payload)}),t=await r.text();
    if(!r.ok){if(r.status===409||t.includes("23505")||t.includes("reviews_user_hall_unique")){alert("이미 이 예식장을 평가하셨습니다. 예식장당 1인 1평가만 등록할 수 있습니다.");await renderReviewForm();return}throw new Error(t||`HTTP ${r.status}`)}
    alert("평가가 등록되었습니다. 랭킹에 바로 반영됩니다.");await showDetail(hallId);
  }catch(err){alert("평가 등록 오류: "+err.message)}finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent="평가 등록"}}
}

function setupConsultForm(){const f=$("#consultForm");if(!f||f.dataset.ready)return;f.dataset.ready="1";f.addEventListener("submit",submitConsult)}
async function submitConsult(e){
  e.preventDefault();const hallId=(location.hash.match(/^#hall=(.+)$/)||[])[1],fd=new FormData(e.target),status=$("#consultStatus");if(!hallId)return;
  const payload={hall_id:hallId,customer_name:String(fd.get("customer_name")||"").trim(),phone:String(fd.get("phone")||"").trim(),preferred_date:fd.get("preferred_date")||null,guest_count:fd.get("guest_count")?Number(fd.get("guest_count")):null,message:String(fd.get("message")||"").trim(),privacy_agreed:fd.get("privacy_agreed")==="on"};
  if(!payload.customer_name||!payload.phone||!payload.privacy_agreed)return alert("이름, 연락처와 개인정보 동의를 확인해주세요.");
  status.textContent="상담 신청을 접수하는 중입니다…";
  const r=await fetch(`${getUrl()}/rest/v1/consultation_requests`,{method:"POST",headers:{apikey:getKey(),Authorization:`Bearer ${getKey()}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(payload)});
  if(!r.ok){status.textContent="상담 접수 중 오류가 발생했습니다.";return alert("상담 신청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.")}
  e.target.reset();status.textContent="상담 신청이 접수되었습니다. 확인 후 연락드리겠습니다.";alert("상담 신청이 접수되었습니다.");
}

function setupRankingUI(){
  document.querySelectorAll(".rankTab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".rankTab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");rankingMode=btn.dataset.rank;loadRankings()}));
  $("#rankingRegion")?.addEventListener("change",loadRankings);
}
async function loadRankings(){
  if($("#listView"))$("#listView").hidden=true;if($("#detailView"))$("#detailView").hidden=true;if($("#rankingView"))$("#rankingView").hidden=false;
  const body=$("#rankingBody");if(!body)return;body.innerHTML='<div class="pending big">랭킹을 불러오는 중…</div>';
  try{
    const rows=await api("wedding_hall_rankings?select=*&order=overall_score.desc.nullslast"),region=$("#rankingRegion")?.value||"",key={overall:"overall_score",food:"food_score",parking:"parking_score",value:"value_score"}[rankingMode]||"overall_score";
    const filtered=rows.filter(x=>!region||x.sido===region);
    filtered.sort((a,b)=>{const ar=Number(a.review_count)>0&&a[key]!=null,br=Number(b.review_count)>0&&b[key]!=null;if(ar!==br)return ar?-1:1;if(!ar&&!br)return String(a.name||"").localeCompare(String(b.name||""),"ko");return(Number(b[key])-Number(a[key]))||(Number(b.review_count)-Number(a.review_count))});
    if(!filtered.length){body.innerHTML='<div class="pending big"><b>해당 지역의 공개 예식장이 없습니다.</b></div>';return}
    let rankedNo=0;
    body.innerHTML=filtered.slice(0,100).map(h=>{const ready=Number(h.review_count)>0&&h[key]!=null;if(ready)rankedNo++;return `<article class="rankRow${ready?"":" pendingRank"}" data-id="${h.hall_id}"><div class="rankNo">${ready?rankedNo:"대기"}</div><div class="rankHall"><b>${esc(h.name)}</b><span>${esc([h.sido,h.sigungu].filter(Boolean).join(" "))}</span></div><div class="rankScore">${ready?`<strong>${Number(h[key]).toFixed(2)}</strong><span>${h.review_count}개 평가</span>`:'<strong>평가대기</strong><span>첫 평가 등록 후 순위 산정</span>'}</div></article>`}).join("");
    document.querySelectorAll(".rankRow[data-id]").forEach(x=>x.onclick=()=>location.hash=`hall=${x.dataset.id}`);
  }catch(e){body.innerHTML=`<div class="pending big">랭킹 조회 오류: ${esc(e.message)}</div>`}
}

$("#search")?.addEventListener("input",()=>render(true));
$("#sido")?.addEventListener("change",()=>render(true));
window.addEventListener("hashchange",route);
window.addEventListener("DOMContentLoaded",()=>{setupRankingUI();setupHeaderActions()});
parseAuthHash();
restoreSession();
load();
