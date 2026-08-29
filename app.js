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
    const [rooms, prices, reviews] = await Promise.all([
      api(`hall_rooms?select=room_name,floor,capacity_min,capacity_max,ceremony_type,meal_type&hall_id=eq.${encodeURIComponent(id)}`),
      api(`wedding_prices?select=effective_date,rental_fee,decor_fee,meal_price_per_person,minimum_guarantee,source_name,source_url,notes&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc`),
      api(`reviews?select=visit_role,food_score,parking_score,access_score,facility_score,service_score,value_score,overall_score,review_text,created_at&hall_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=100`)
    ]);
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
    ["음식","food_score"],["주차","parking_score"],["교통/접근성","access_score"],
    ["예식홀/시설","facility_score"],["서비스","service_score"],["가성비","value_score"]
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
load();
