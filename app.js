const cfg = window.WEDDINGRANK_CONFIG || {};
let halls = [];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[m]));

function getKey() {
  return cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_KEY || "";
}
function getUrl() {
  return String(cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}
function headers() {
  const key = getKey();
  return { apikey: key, Authorization: `Bearer ${key}` };
}
async function api(path) {
  const url = `${getUrl()}/rest/v1/${path}`;
  const r = await fetch(url, { headers: headers() });
  const text = await r.text();
  if (!r.ok) {
    console.error("WeddingRank Supabase API error", r.status, url, text);
    throw new Error(`Supabase ${r.status}: ${text.slice(0, 300)}`);
  }
  try { return JSON.parse(text); }
  catch (e) {
    console.error("WeddingRank JSON parse error", url, text);
    throw e;
  }
}
function showError(e) {
  console.error("WeddingRank load error:", e);
  const s = $("#status");
  if (s) s.textContent = `연결 오류: ${e.message || e}`;
}
async function load() {
  try {
    if (!getUrl()) throw new Error("SUPABASE_URL이 없습니다.");
    if (!getKey()) throw new Error("Publishable key가 없습니다.");

    // Keep the initial query deliberately minimal so optional columns
    // cannot break the whole public list.
    halls = await api(
      "wedding_halls?select=hall_id,name,sido,sigungu,road_address,phone,website,venue_type" +
      "&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc&limit=500"
    );

    if ($("#publicCount")) $("#publicCount").textContent = halls.length + "곳";
    if ($("#status")) $("#status").textContent = `공개 예식장 ${halls.length}곳`;
    setupRegions();
    render();
    route();
  } catch (e) { showError(e); }
}
function setupRegions() {
  const regions = [...new Set(halls.map(x => x.sido).filter(Boolean))].sort();
  const sido = $("#sido");
  if (sido) sido.innerHTML = '<option value="">전국</option>' +
    regions.map(x => `<option>${esc(x)}</option>`).join("");

  const rb = $("#regionButtons");
  if (rb) {
    rb.innerHTML = regions.map(x => `<button data-region="${esc(x)}">${esc(x)}</button>`).join("");
    rb.onclick = e => {
      if (e.target.dataset.region) {
        $("#sido").value = e.target.dataset.region;
        showList(); render(); location.hash = "rankings";
      }
    };
  }
}
function showList() {
  if ($("#listView")) $("#listView").hidden = false;
  if ($("#detailView")) $("#detailView").hidden = true;
}
function render() {
  const q = ($("#search")?.value || "").trim().toLowerCase();
  const sido = $("#sido")?.value || "";
  const filtered = halls.filter(h =>
    (!sido || h.sido === sido) &&
    (!q || [h.name,h.sido,h.sigungu,h.road_address].join(" ").toLowerCase().includes(q))
  );
  const cards = $("#cards");
  if (!cards) return;
  cards.innerHTML = filtered.map(h => `<article class="card clickable" data-id="${h.hall_id}">
    <div class="area">${esc(h.sido||"")} ${esc(h.sigungu||"")}</div>
    <h3>${esc(h.name)}</h3>
    <p>${esc(h.road_address||"주소 확인중")}</p>
    <div class="badges"><span class="badge">${esc(h.venue_type||"예식장")}</span><span class="badge price">가격정보 확인중</span></div>
    <div class="more">상세정보 보기 →</div>
  </article>`).join("");
  if ($("#empty")) $("#empty").hidden = filtered.length !== 0;
  document.querySelectorAll(".card[data-id]").forEach(c =>
    c.onclick = () => location.hash = `hall=${c.dataset.id}`
  );
}
async function showDetail(id) {
  const h = halls.find(x => x.hall_id === id);
  if (!h) return;
  $("#listView").hidden = true;
  $("#detailView").hidden = false;
  window.scrollTo(0,0);

  $("#detailName").textContent = h.name;
  $("#detailArea").textContent = [h.sido,h.sigungu].filter(Boolean).join(" ");
  $("#detailAddress").textContent = h.road_address || "주소 확인중";
  $("#detailPhone").textContent = h.phone || "전화번호 확인중";
  $("#detailWebsite").innerHTML = h.website
    ? `<a href="${esc(h.website)}" target="_blank" rel="noopener">공식/참고 사이트 열기 ↗</a>`
    : "홈페이지 확인중";

  try {
    const results = await Promise.allSettled([
      api(`hall_rooms?select=room_name,floor,capacity_min,capacity_max,ceremony_type,meal_type&hall_id=eq.${encodeURIComponent(id)}`),
      api(`wedding_prices?select=effective_date,rental_fee,decor_fee,meal_price_per_person,minimum_guarantee,source_name,source_url,notes&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc`),
      api(`reviews?select=visit_role,food_score,parking_score,access_score,facility_score,bride_waiting_score,banquet_score,service_score,value_score,overall_score,review_text,created_at&hall_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=100`)
    ]);
    const rooms = results[0].status === "fulfilled" ? results[0].value : [];
    const prices = results[1].status === "fulfilled" ? results[1].value : [];
    const reviews = results[2].status === "fulfilled" ? results[2].value : [];
    if (results[0].status === "rejected") console.error("hall_rooms error", results[0].reason);
    if (results[1].status === "rejected") console.error("wedding_prices error", results[1].reason);
    if (results[2].status === "rejected") console.error("reviews error", results[2].reason);
    $("#rooms").innerHTML = rooms.length ? rooms.map(r =>
      `<div class="info-row"><b>${esc(r.room_name)}</b><span>${esc(r.floor||"")} ${r.capacity_min?`· 최소 ${r.capacity_min}명`:""} ${r.capacity_max?`· 최대 ${r.capacity_max}명`:""}</span></div>`
    ).join("") : '<div class="pending">홀 정보 확인중</div>';

    $("#prices").innerHTML = prices.length ? prices.map(p => `<div class="pricebox">
      <div><small>기준일</small><b>${esc(p.effective_date||"-")}</b></div>
      <div><small>대관료</small><b>${money(p.rental_fee)}</b></div>
      <div><small>1인 식대</small><b>${money(p.meal_price_per_person)}</b></div>
      <div><small>최소보증</small><b>${p.minimum_guarantee?`${p.minimum_guarantee}명`:"확인중"}</b></div>
      <p>${esc(p.notes||"가격은 계약 전 재확인이 필요합니다.")}</p>
    </div>`).join("") : '<div class="pending big">가격정보 확인중<br><small>확인되는 순서대로 업데이트합니다.</small></div>';

    renderReviews(reviews);
  } catch(e) {
    console.error("WeddingRank detail error:", e);
    $("#rooms").innerHTML = `<div class="pending">조회 오류: ${esc(e.message)}</div>`;
    $("#prices").innerHTML = `<div class="pending">조회 오류: ${esc(e.message)}</div>`;
  }
}

function avg(arr, key) {
  const vals = arr.map(x => Number(x[key])).filter(v => Number.isFinite(v) && v > 0);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
}
function score(v) { return v == null ? "—" : v.toFixed(1); }
function renderReviews(reviews) {
  const box = $("#reviewSummary");
  const list = $("#reviewList");
  if (!box || !list) return;
  if (!reviews.length) {
    box.innerHTML = '<div class="pending big">아직 등록된 평가가 없습니다.<br><small>실제 이용자 평가가 쌓이면 랭킹에 반영됩니다.</small></div>';
    list.innerHTML = "";
    return;
  }
  const metrics = [
    ["음식","food_score"],["교통/접근성","access_score"],["주차","parking_score"],
    ["예식홀/시설","facility_score"],["신부대기실","bride_waiting_score"],["연회장","banquet_score"],
    ["서비스","service_score"],["가성비","value_score"]
  ];
  const overall = avg(reviews,"overall_score");
  box.innerHTML = `<div class="reviewScore"><div><small>종합평점</small><strong>${score(overall)}</strong><span>/ 5.0</span><p>${reviews.length}개 평가</p></div>
    <div class="metricGrid">${metrics.map(([n,k])=>`<div><span>${n}</span><b>${score(avg(reviews,k))}</b></div>`).join("")}</div></div>`;
  list.innerHTML = reviews.filter(r=>r.review_text).slice(0,10).map(r=>`<article class="reviewItem">
    <div><b>${esc(r.visit_role||"이용자")}</b><span>${esc((r.created_at||"").slice(0,10))}</span></div>
    <p>${esc(r.review_text)}</p>
  </article>`).join("");
}

function money(v) {
  return v === null || v === undefined ? "확인중" : Number(v).toLocaleString("ko-KR") + "원";
}
function route() {
  const m = location.hash.match(/^#hall=(.+)$/);
  if (m) showDetail(m[1]); else showList();
}

$("#search")?.addEventListener("input", render);
$("#sido")?.addEventListener("change", render);
window.addEventListener("hashchange", route);
let currentUser=null, accessToken=null;

parseAuthHash();
restoreSession();
load();

async function authApi(path, options={}) {
  const key=getKey(), url=`${getUrl()}/auth/v1/${path}`;
  const h={"apikey":key,"Content-Type":"application/json",...(options.headers||{})};
  if(accessToken) h.Authorization=`Bearer ${accessToken}`;
  const r=await fetch(url,{...options,headers:h});
  const t=await r.text();
  let data={}; try{data=t?JSON.parse(t):{}}catch(_){}
  if(!r.ok) throw new Error(data.msg||data.message||`Auth ${r.status}`);
  return data;
}
function saveSession(s){
  if(s?.access_token){accessToken=s.access_token; localStorage.setItem("wr_access_token",accessToken)}
  if(s?.user){currentUser=s.user}
  renderAuth();
}
async function restoreSession(){
  accessToken=localStorage.getItem("wr_access_token");
  if(!accessToken){renderAuth();return}
  try{currentUser=await authApi("user",{method:"GET"});renderAuth()}
  catch(e){localStorage.removeItem("wr_access_token");accessToken=null;currentUser=null;renderAuth()}
}
function renderAuth(){
  const b=$("#authBox"); if(!b)return;
  b.innerHTML=currentUser
   ? `<div class="signed"><span>${esc(currentUser.email||"로그인 사용자")}</span><button id="logoutBtn">로그아웃</button></div>`
   : `<div class="loginRow"><input id="loginEmail" type="email" placeholder="이메일 주소"><button id="loginBtn">이메일 로그인 링크 받기</button></div><small>이메일로 받은 로그인 링크를 이용합니다.</small>`;
  $("#logoutBtn")?.addEventListener("click",()=>{localStorage.removeItem("wr_access_token");accessToken=null;currentUser=null;renderAuth()});
  $("#loginBtn")?.addEventListener("click",sendMagicLink);
  renderReviewForm();
}
async function sendMagicLink(){
  const email=$("#loginEmail")?.value.trim(); if(!email)return alert("이메일을 입력해주세요.");
  try{
    await authApi("otp",{method:"POST",body:JSON.stringify({email,create_user:true,options:{email_redirect_to:location.origin+location.pathname}})});
    alert("로그인 링크를 이메일로 보냈습니다.");
  }catch(e){alert("로그인 요청 오류: "+e.message)}
}
function parseAuthHash(){
  const p=new URLSearchParams(location.hash.slice(1));
  if(p.get("access_token")){
    accessToken=p.get("access_token"); localStorage.setItem("wr_access_token",accessToken);
    history.replaceState(null,"",location.pathname);
  }
}
function renderReviewForm(){
 const wrap=$("#reviewFormWrap"); if(!wrap)return;
 if(!currentUser){wrap.innerHTML='<div class="pending">평가를 작성하려면 먼저 이메일로 로그인해주세요.</div>';return}
 const metrics=[["food_score","음식"],["access_score","교통/접근성"],["parking_score","주차"],["facility_score","예식홀/시설"],["bride_waiting_score","신부대기실"],["banquet_score","연회장"],["service_score","서비스"],["value_score","가성비"]];
 wrap.innerHTML=`<form id="reviewForm">
 <label>방문 역할<select name="visit_role" required><option value="">선택</option><option>신랑신부</option><option>혼주</option><option>하객</option></select></label>
 <div class="scoreInputs">${metrics.map(([k,n])=>`<label>${n}<select name="${k}" required><option value="">점수</option>${[5,4,3,2,1].map(v=>`<option value="${v}">${v}점</option>`).join("")}</select></label>`).join("")}</div>
 <label>후기<textarea name="review_text" maxlength="1000" placeholder="예식장을 이용하며 느낀 점을 작성해주세요." required></textarea></label>
 <button type="submit" class="submitReview">평가 등록</button><p class="reviewNotice">8개 항목을 모두 평가해야 등록됩니다. 동일 계정은 같은 예식장에 1개의 평가만 등록할 수 있습니다.</p>
 </form>`;
 $("#reviewForm").onsubmit=submitReview;
}
async function submitReview(e){
 e.preventDefault();
 const m=location.hash.match(/^#hall=(.+)$/); if(!m||!currentUser||!accessToken)return;
 const fd=new FormData(e.target), body={hall_id:m[1],user_id:currentUser.id};
 for(const [k,v] of fd.entries()) body[k]=k.endsWith("_score")?Number(v):v;
 try{
   const r=await fetch(`${getUrl()}/rest/v1/reviews`,{method:"POST",headers:{apikey:getKey(),Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(body)});
   const t=await r.text(); if(!r.ok)throw new Error(r.status===409?"이미 이 예식장을 평가했습니다.":t);
   alert("평가가 등록되었습니다."); await showDetail(m[1]);
 }catch(err){alert("평가 등록 오류: "+err.message)}
}
