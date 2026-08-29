const cfg=window.WEDDINGRANK_CONFIG;
let halls=[];
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

async function load(){
  if(!cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("여기에_")){
    $("#status").textContent="config.js에 Supabase anon key를 입력하세요";
    return;
  }
  $("#status").textContent="예식장 정보를 불러오는 중…";
  const cols="legacy_code,name,branch_name,sido,sigungu,road_address,phone,website,venue_type,public_grade";
  const url=`${cfg.SUPABASE_URL}/rest/v1/wedding_halls?select=${cols}&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc`;
  const r=await fetch(url,{headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`}});
  if(!r.ok){$("#status").textContent=`연결 오류 (${r.status})`;return}
  halls=await r.json();
  $("#publicCount").textContent=halls.length+"곳";
  $("#status").textContent=`공개 예식장 ${halls.length}곳`;
  setupRegions(); render();
}
function setupRegions(){
  const regions=[...new Set(halls.map(x=>x.sido).filter(Boolean))].sort();
  $("#sido").innerHTML='<option value="">전국</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join("");
  $("#regionButtons").innerHTML=regions.map(x=>`<button data-region="${esc(x)}">${esc(x)}</button>`).join("");
  $("#regionButtons").onclick=e=>{if(e.target.dataset.region){$("#sido").value=e.target.dataset.region;render();location.hash="rankings"}}
}
function render(){
  const q=$("#search").value.trim().toLowerCase(), sido=$("#sido").value;
  const filtered=halls.filter(h=>(!sido||h.sido===sido)&&(!q||[h.name,h.branch_name,h.sido,h.sigungu,h.road_address].join(" ").toLowerCase().includes(q)));
  $("#cards").innerHTML=filtered.map(h=>`<article class="card">
    <div class="area">${esc(h.sido||"")} ${esc(h.sigungu||"")}</div>
    <h3>${esc(h.name)}${h.branch_name?` <small>${esc(h.branch_name)}</small>`:""}</h3>
    <p>${esc(h.road_address||"주소 확인중")}</p>
    <div class="badges"><span class="badge">${esc(h.public_grade||"공개")}</span><span class="badge">${esc(h.venue_type||"예식장")}</span><span class="badge price">가격정보 확인중</span></div>
  </article>`).join("");
  $("#empty").hidden=filtered.length!==0;
}
$("#search").addEventListener("input",render);
$("#sido").addEventListener("change",render);
load();
