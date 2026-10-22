/* Administrator content controls. Database RLS remains authoritative. */
(() => {
  'use strict';
  const cfg=window.WEDDINGRANK_CONFIG||{},base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,''),key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const token=()=>localStorage.getItem('wr_access_token')||'';
  const kinds={review:{table:'reviews',id:'review_id',selector:'[data-review-id]',data:'reviewId',body:'.wrReviewText',label:'후기'},post:{table:'wedding_board_posts',id:'id',selector:'[data-post-id]',data:'postId',body:'.body',label:'게시글'}};
  let checkedToken=null,admin=false,checking=null,panelLoaded=false;
  async function request(path,method='GET',body,session=token()){
    const control=new AbortController(),timer=setTimeout(()=>control.abort(),12000);
    try{
      const r=await fetch(`${base}/rest/v1/${path}`,{method,signal:control.signal,headers:{apikey:key,Authorization:`Bearer ${session||key}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
      const text=await r.text();
      if(!r.ok)throw new Error([401,403].includes(r.status)?'관리자 권한을 확인해주세요. 다시 로그인한 뒤 시도해주세요.':'요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return text?JSON.parse(text):[];
    }catch(e){if(control.signal.aborted)throw new Error('응답이 지연되고 있습니다. 다시 시도해주세요.');throw e}
    finally{clearTimeout(timer)}
  }
  function decorate(){
    if(!admin){document.querySelectorAll('.wrModeration').forEach(x=>x.remove());return}
    Object.entries(kinds).forEach(([kind,spec])=>document.querySelectorAll(spec.selector).forEach(card=>{
      if(card.querySelector('.wrModeration'))return;
      const controls=document.createElement('div');controls.className='wrModeration';
      controls.innerHTML='<span>관리자</span><button type="button" data-moderation-action="edit">수정</button><button type="button" data-moderation-action="delete">삭제</button><p role="status" aria-live="polite"></p>';
      controls.dataset.kind=kind;card.append(controls);
    }));
  }
  async function refresh(){
    const session=token();
    if(session!==checkedToken){
      checkedToken=session;admin=false;panelLoaded=false;decorate();
      if(session){
      const pending=request('admin_users?select=user_id&limit=1','GET',null,session).then(rows=>{
        if(token()===session&&checkedToken===session)admin=rows.length>0;
      }).catch(()=>{});
      checking=pending;await pending;if(checking!==pending)return;checking=null;
      }else checking=null;
    }else if(checking)return;
    decorate();
    const panel=document.querySelector('#moderationPanel');
    if(panel&&admin&&!panelLoaded){panelLoaded=true;buildPanel(panel)}
    if(panel&&!admin&&!checking&&panel.textContent!=='관리자 로그인 후 후기·게시글을 관리할 수 있습니다.')panel.textContent='관리자 로그인 후 후기·게시글을 관리할 수 있습니다.';
  }
  function startEdit(card,kind){
    if(card.querySelector('.wrModerationEditor'))return;
    const spec=kinds[kind],form=document.createElement('form');form.className='wrModerationEditor';
    const heading=card.querySelector('h2'),body=card.querySelector(spec.body);
    form.innerHTML=`${kind==='post'?`<label>제목<input name="title" maxlength="120" minlength="2" required value="${esc(heading?.textContent)}"></label>`:'<p>후기 본문을 수정합니다. 별점과 작성자는 유지됩니다.</p>'}<label>내용<textarea name="body" maxlength="${kind==='post'?3000:5000}" required>${esc(body?.textContent)}</textarea></label><div><button type="submit">저장</button><button type="button" data-cancel-edit>취소</button></div><p role="status" aria-live="polite"></p>`;
    card.append(form);form.querySelector('[data-cancel-edit]').onclick=()=>form.remove();
    form.onsubmit=async e=>{
      e.preventDefault();const status=form.querySelector('[role="status"]'),button=form.querySelector('[type="submit"]'),text=form.elements.body.value.trim(),title=form.elements.title?.value.trim();
      if(!text||(kind==='post'&&(!title||title.length<2||text.length<5))){status.textContent='제목은 2자 이상, 내용은 게시글 5자 이상 입력해주세요.';return}
      button.disabled=true;status.textContent='저장 중…';
      try{const rows=await mutate(kind,card.dataset[spec.data],'PATCH',kind==='post'?{title,body:text}:{review_text:text});
        if(!rows.length)throw new Error('수정 권한이 없거나 이미 삭제된 자료입니다.');
        body.textContent=text;if(heading&&kind==='post')heading.textContent=title;form.remove();
        card.querySelector('.wrModeration [role="status"]').textContent='수정했습니다.';
      }catch(err){status.textContent=err.message}finally{button.disabled=false}
    };
    form.querySelector('input,textarea').focus();
  }
  async function mutate(kind,id,method,body){
    if(!admin||token()!==checkedToken)throw new Error('관리자 로그인이 필요합니다.');
    const spec=kinds[kind];return request(`${spec.table}?${spec.id}=eq.${encodeURIComponent(id)}`,method,body);
  }
  document.addEventListener('click',async e=>{
    const button=e.target.closest?.('[data-moderation-action]');if(!button)return;
    const controls=button.closest('.wrModeration'),kind=controls.dataset.kind,spec=kinds[kind],card=controls.closest(spec.selector),status=controls.querySelector('[role="status"]');
    if(!admin||checkedToken!==token()){await refresh();return}
    if(button.dataset.moderationAction==='edit'){startEdit(card,kind);return}
    if(!confirm(`${spec.label}을 삭제할까요? 삭제한 내용과 연결된 댓글·답글·반응·인증 자료는 복구할 수 없습니다.`))return;
    button.disabled=true;status.textContent='삭제 중…';
    try{const rows=await mutate(kind,card.dataset[spec.data],'DELETE');if(!rows.length)throw new Error('삭제 권한이 없거나 이미 삭제된 자료입니다.');
      card.remove();document.dispatchEvent(new CustomEvent('wr-content-changed',{detail:{kind}}));
      const notice=document.querySelector('#moderationNotice');if(notice)notice.textContent='삭제했습니다.';
    }catch(err){status.textContent=err.message}finally{button.disabled=false}
  });
  function buildPanel(panel){
    panel.innerHTML='<p id="moderationNotice" role="status" aria-live="polite"></p><p>후기 본문과 게시글 제목·내용을 관리합니다. 삭제는 복구할 수 없습니다.</p>';
    Object.entries(kinds).forEach(([kind,spec])=>{
      const section=document.createElement('section');section.innerHTML=`<h3>${spec.label} 관리</h3><div class="wrManagedList"></div><button type="button">더 불러오기</button><p role="status"></p>`;panel.append(section);
      let offset=0,busy=false;const list=section.querySelector('.wrManagedList'),more=section.querySelector('button'),status=section.querySelector('[role="status"]');
      async function load(){if(busy)return;busy=true;more.disabled=true;status.textContent='불러오는 중…';try{
        const fields=kind==='review'?'review_id,visit_role,review_text,created_at,wedding_halls(name)':'id,title,body,created_at';
        const rows=await request(`${spec.table}?select=${fields}&order=created_at.desc,${spec.id}.desc&limit=50&offset=${offset}`);
        rows.forEach(row=>{const card=document.createElement('article');card.className=kind==='review'?'reviewItem wrManagedCard':'post wrManagedCard';card.dataset[spec.data]=row[spec.id];card.innerHTML=kind==='review'?`<b>${esc(row.wedding_halls?.name||'예식장 후기')} · ${esc(row.visit_role)}</b><p class="wrReviewText">${esc(row.review_text)}</p>`:`<h2>${esc(row.title)}</h2><div class="body">${esc(row.body)}</div>`;list.append(card)});
        offset+=rows.length;more.hidden=rows.length<50;status.textContent=offset?`${offset}건 조회`:'등록된 자료가 없습니다.';decorate();
      }catch(err){status.textContent=err.message}finally{busy=false;more.disabled=false}}
      more.onclick=load;load();
    });
  }
  const style=document.createElement('style');style.textContent='.wrModeration{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid #eadfdd}.wrModeration span{font-size:12px;color:#78616b}.wrModeration button,.wrModerationEditor button,#moderationPanel>section>button{border:1px solid #c9adb7;border-radius:8px;background:#fff;padding:8px 14px;color:#713a4d;cursor:pointer}.wrModeration [role=status]{width:100%;margin:0;font-size:13px}.wrModerationEditor{display:grid;gap:12px;margin-top:12px;padding:16px;border:1px solid #d8bfc9;border-radius:12px;background:#fff9fb}.wrModerationEditor label{display:grid;gap:6px}.wrModerationEditor input,.wrModerationEditor textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid #d8c5cc;border-radius:8px;font:inherit}.wrModerationEditor textarea{min-height:140px}.wrModerationEditor button{margin-right:8px}.wrManagedCard{padding:16px;margin:12px 0;border:1px solid #e4d8dc;border-radius:12px;background:#fff;overflow-wrap:anywhere}.wrManagedCard p,.wrManagedCard .body{white-space:pre-wrap}.wrManagedCard h2{font-size:18px}';document.head.append(style);
  let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;refresh()})}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('wr-content-changed',()=>{if(admin&&document.querySelector('#moderationPanel')){panelLoaded=false;refresh()}});
  window.addEventListener('storage',refresh);window.addEventListener('wr-auth-changed',refresh);refresh();
})();
