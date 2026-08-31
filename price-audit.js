/* WeddingRank admin price audit history v5.42 */
(()=>{
  if(!/\/admin\.html$/.test(location.pathname)) return;
  const C=window.WEDDINGRANK_CONFIG||{};
  const base=String(C.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=C.SUPABASE_ANON_KEY||C.SUPABASE_PUBLISHABLE_KEY||C.SUPABASE_KEY||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>v==null?'확인중':Number(v).toLocaleString('ko-KR')+'원';
  const people=v=>v==null?'확인중':Number(v).toLocaleString('ko-KR')+'명';

  async function token(){
    let access=localStorage.getItem('wr_access_token')||'';
    const refresh=localStorage.getItem('wr_refresh_token')||'';
    const exp=Number(localStorage.getItem('wr_expires_at')||0);
    if(access && (!exp || exp-Date.now()>300000)) return access;
    if(!refresh) return access;
    try{
      const r=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})});
      const d=await r.json();
      if(!r.ok||!d.access_token) return access;
      access=d.access_token;
      localStorage.setItem('wr_access_token',access);
      if(d.refresh_token)localStorage.setItem('wr_refresh_token',d.refresh_token);
      if(d.expires_in)localStorage.setItem('wr_expires_at',String(Date.now()+Number(d.expires_in)*1000));
    }catch(_){ }
    return access;
  }

  async function req(path){
    const t=await token();
    if(!t) throw new Error('관리자 로그인이 필요합니다.');
    const r=await fetch(base+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+t}});
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  }

  function priceLine(d){
    if(!d)return '-';
    return `기준일 ${esc(d.effective_date||'-')} · 대관 ${money(d.rental_fee)} · 식대 ${money(d.meal_price_per_person)} · 최소보증 ${people(d.minimum_guarantee)}`;
  }
  function sourceLine(d){
    if(!d)return '';
    const s=d.source_name?`출처 ${esc(d.source_name)}`:'출처 없음';
    const v=d.verified_at?` · 확인일 ${esc(d.verified_at)}`:'';
    return s+v;
  }
  function diffLine(oldD,newD){
    if(!oldD||!newD)return '';
    const fields=[['effective_date','기준일'],['rental_fee','대관료'],['meal_price_per_person','식대'],['minimum_guarantee','최소보증'],['source_name','출처'],['verified_at','확인일']];
    return fields.filter(([k])=>String(oldD[k]??'')!==String(newD[k]??'')).map(([k,label])=>`${label}: ${esc(oldD[k]??'없음')} → ${esc(newD[k]??'없음')}`).join('<br>');
  }

  function ensureCard(){
    if(document.getElementById('priceAuditCard'))return;
    const cards=document.querySelectorAll('.adminCard');
    const anchor=cards[1]||cards[0];
    if(!anchor)return;
    const card=document.createElement('div');
    card.className='adminCard';
    card.id='priceAuditCard';
    card.innerHTML=`<h2>가격 변경이력</h2><p class="muted">관리자 가격 등록·수정·삭제 내역을 자동 보존합니다.</p><div class="adminTools"><select id="auditAction"><option value="">전체 변경</option><option value="UPDATE">수정</option><option value="INSERT">신규등록</option><option value="DELETE">삭제</option></select><button id="auditRefresh" type="button">이력 새로고침</button><span id="auditLoaded" class="muted"></span></div><div id="auditList"><p class="muted">관리자 인증 후 변경이력을 표시합니다.</p></div>`;
    anchor.parentNode.insertBefore(card,anchor.nextSibling);
    const st=document.createElement('style');
    st.textContent='.auditChange{font-size:12px;line-height:1.55}.auditBefore{color:#8a5a5a}.auditAfter{color:#355d45}.auditDiff{margin-top:5px;padding:7px;border-radius:8px;background:#f7f7f5}.auditAction{display:inline-block;padding:3px 7px;border-radius:999px;background:#f3efed;font-size:11px;font-weight:800}.auditUser{font-size:11px;color:#888;word-break:break-all}';
    document.head.appendChild(st);
    document.getElementById('auditRefresh').onclick=load;
    document.getElementById('auditAction').onchange=render;
  }

  let logs=[],names=new Map();
  function render(){
    const box=document.getElementById('auditList'); if(!box)return;
    const f=document.getElementById('auditAction')?.value||'';
    const rows=f?logs.filter(x=>x.action===f):logs;
    if(!rows.length){box.innerHTML='<p>표시할 가격 변경이력이 없습니다.</p>';return;}
    const actionName={INSERT:'신규등록',UPDATE:'수정',DELETE:'삭제'};
    box.innerHTML='<table class="adminTable"><thead><tr><th>변경시각</th><th>예식장</th><th>구분</th><th>변경 전</th><th>변경 후</th><th>주요 변경</th></tr></thead><tbody>'+rows.map(x=>`<tr><td>${esc(String(x.changed_at||'').replace('T',' ').slice(0,19))}<div class="auditUser">관리자 기록</div></td><td>${esc(names.get(x.hall_id)||x.hall_id||'-')}</td><td><span class="auditAction">${actionName[x.action]||esc(x.action)}</span></td><td class="auditChange auditBefore">${priceLine(x.old_data)}<br>${sourceLine(x.old_data)}</td><td class="auditChange auditAfter">${priceLine(x.new_data)}<br>${sourceLine(x.new_data)}</td><td class="auditChange">${diffLine(x.old_data,x.new_data)||'-'}</td></tr>`).join('')+'</tbody></table>';
  }

  async function load(){
    ensureCard();
    const box=document.getElementById('auditList');
    const stamp=document.getElementById('auditLoaded');
    if(box)box.innerHTML='<p class="muted">변경이력을 불러오는 중…</p>';
    try{
      logs=await req('wedding_price_audit_logs?select=audit_id,price_id,hall_id,action,old_data,new_data,changed_by,changed_at&order=changed_at.desc&limit=200');
      const ids=[...new Set(logs.map(x=>x.hall_id).filter(Boolean))];
      names=new Map();
      if(ids.length){
        const halls=await req('wedding_halls?select=hall_id,name&hall_id=in.('+ids.map(encodeURIComponent).join(',')+')');
        halls.forEach(h=>names.set(h.hall_id,h.name));
      }
      if(stamp)stamp.textContent='최근 '+logs.length+'건 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
      render();
    }catch(e){
      if(box)box.innerHTML='<p class="muted">관리자 로그인 후 가격 변경이력을 확인할 수 있습니다.</p>';
    }
  }

  function boot(){ensureCard();setTimeout(load,900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
