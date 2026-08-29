const cfg=window.WEDDINGRANK_CONFIG;
let halls=[];
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const headers=()=>({apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`});

async function api(path){
  const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/${path}`,{headers:headers()});
  if(!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
async function load(){
  try{
    if(!cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("여기에_")) throw new Error("KEY");
    const cols="hall_id,legacy_code,name,branch_name,sido,sigungu,road_address,phone,website,venue_type";
    halls=await api(`wedding_halls?select=${cols}&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc`);
    $("#publicCount").textContent=halls.length+"곳";
    $("#status").textContent=`공개 예식장 ${halls.length}곳`;
    setupRegions(); render(); route();
  }catch(e){$("#status").textContent="Supabase 연결을 확인해주세요";}
}
function setupRegions(){
 const regions=[...new Set(halls.map(x=>x.sido).filter(Boolean))].sort();
 $("#sido").innerHTML='<option value="">전국</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join("");
 $("#regionButtons").innerHTML=regions.map(x=>`<button data-region="${esc(x)}">${esc(x)}</button>`).join("");
 $("#regionButtons").onclick=e=>{if(e.target.dataset.region){$("#sido").value=e.target.dataset.region;showList();render();location.hash="rankings"}}
}
function showList(){ $("#listView").hidden=false; $("#detailView").hidden=true; }
function render(){
 const q=$("#search").value.trim().toLowerCase(), sido=$("#sido").value;
 const filtered=halls.filter(h=>(!sido||h.sido===sido)&&(!q||[h.name,h.branch_name,h.sido,h.sigungu,h.road_address].join(" ").toLowerCase().includes(q)));
 $("#cards").innerHTML=filtered.map(h=>`<article class="card clickable" data-id="${h.hall_id}">
   <div class="area">${esc(h.sido||"")} ${esc(h.sigungu||"")}</div>
   <h3>${esc(h.name)}${h.branch_name?` <small>${esc(h.branch_name)}</small>`:""}</h3>
   <p>${esc(h.road_address||"주소 확인중")}</p>
   <div class="badges"><span class="badge">${esc(h.venue_type||"예식장")}</span><span class="badge price">가격정보 확인중</span></div>
   <div class="more">상세정보 보기 →</div>
 </article>`).join("");
 $("#empty").hidden=filtered.length!==0;
 document.querySelectorAll(".card[data-id]").forEach(c=>c.onclick=()=>location.hash=`hall=${c.dataset.id}`);
}
async function showDetail(id){
 const h=halls.find(x=>x.hall_id===id); if(!h)return;
 $("#listView").hidden=true; $("#detailView").hidden=false; window.scrollTo(0,0);
 $("#detailName").textContent=h.name; $("#detailArea").textContent=[h.sido,h.sigungu].filter(Boolean).join(" ");
 $("#detailAddress").textContent=h.road_address||"주소 확인중";
 $("#detailPhone").textContent=h.phone||"전화번호 확인중";
 $("#detailWebsite").innerHTML=h.website?`<a href="${esc(h.website)}" target="_blank" rel="noopener">공식/참고 사이트 열기 ↗</a>`:"홈페이지 확인중";
 $("#rooms").innerHTML='<p class="loading">홀 정보를 불러오는 중…</p>';
 $("#prices").innerHTML='<p class="loading">가격 정보를 불러오는 중…</p>';
 try{
   const [rooms,prices]=await Promise.all([
     api(`hall_rooms?select=room_name,floor,capacity_min,capacity_max,ceremony_type,meal_type&hall_id=eq.${id}`),
     api(`wedding_prices?select=effective_date,rental_fee,decor_fee,meal_price_per_person,minimum_guarantee,source_name,source_url,notes&hall_id=eq.${id}&order=effective_date.desc`)
   ]);
   $("#rooms").innerHTML=rooms.length?rooms.map(r=>`<div class="info-row"><b>${esc(r.room_name)}</b><span>${esc(r.floor||"")} ${r.capacity_min?`· 최소 ${r.capacity_min}명`:""} ${r.capacity_max?`· 최대 ${r.capacity_max}명`:""}</span></div>`).join(""):'<div class="pending">홀 정보 확인중</div>';
   $("#prices").innerHTML=prices.length?prices.map(p=>`<div class="pricebox">
      <div><small>기준일</small><b>${esc(p.effective_date||"-")}</b></div>
      <div><small>대관료</small><b>${money(p.rental_fee)}</b></div>
      <div><small>1인 식대</small><b>${money(p.meal_price_per_person)}</b></div>
      <div><small>최소보증</small><b>${p.minimum_guarantee?`${p.minimum_guarantee}명`:"확인중"}</b></div>
      <p>${esc(p.notes||"가격은 계약 전 재확인이 필요합니다.")}</p>
   </div>`).join(""):'<div class="pending big">가격정보 확인중<br><small>확인되는 순서대로 업데이트합니다.</small></div>';
 }catch(e){ $("#rooms").innerHTML='<div class="pending">정보 조회 오류</div>'; $("#prices").innerHTML='<div class="pending">정보 조회 오류</div>'; }
}
function money(v){return v===null||v===undefined?"확인중":Number(v).toLocaleString("ko-KR")+"원"}
function route(){const m=location.hash.match(/^#hall=(.+)$/); if(m)showDetail(m[1]); else showList()}
$("#search").addEventListener("input",render); $("#sido").addEventListener("change",render); window.addEventListener("hashchange",route);
load();
