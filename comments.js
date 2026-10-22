/* Lazy, collapsed comments and one level of replies for member content. */
(() => {
 'use strict';
 const cfg=window.WEDDINGRANK_CONFIG||{},base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,''),key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const token=()=>localStorage.getItem('wr_access_token')||'';
 let sessionToken=null,viewer=null,isAdmin=false,sessionPending=null;
 const states=new WeakMap();let serial=0;
 async function request(path,method='GET',body,session=token(),auth=false){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(`${base}/${auth?'auth/v1':'rest/v1'}/${path}`,{method,signal:controller.signal,headers:{apikey:key,Authorization:`Bearer ${session||key}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
   const text=await response.text();
   if(!response.ok)throw new Error([401,403].includes(response.status)?'로그인 상태 또는 작성 권한을 확인해주세요.':'처리하지 못했습니다. 자료가 삭제되었거나 연결이 지연될 수 있습니다. 다시 시도해주세요.');
   return text?JSON.parse(text):[];
  }catch(e){if(controller.signal.aborted)throw new Error('응답이 지연되고 있습니다. 다시 시도해주세요.');throw e}finally{clearTimeout(timer)}
 }
 async function syncSession(){
  const session=token();if(session===sessionToken)return sessionPending;
  sessionToken=session;viewer=null;isAdmin=false;
  if(session){
   const pending=Promise.all([request('user','GET',null,session,true),request('admin_users?select=user_id&limit=1','GET',null,session).catch(()=>[])]).then(([user,admins])=>{if(token()===session&&sessionToken===session){viewer=user;isAdmin=admins.length>0}}).catch(()=>{});
   sessionPending=pending;await pending;if(sessionPending!==pending)return;sessionPending=null;
  }else sessionPending=null;
  document.querySelectorAll('.wrComments').forEach(details=>{const state=states.get(details);if(state?.loaded)render(details,state)});
 }
 const date=v=>new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 function attach(){
  document.querySelectorAll('[data-review-id],[data-post-id]').forEach(card=>{
   if(card.querySelector('.wrComments'))return;
   const kind=card.dataset.reviewId?'review_id':'post_id',id=card.dataset.reviewId||card.dataset.postId;if(!id)return;
   const details=document.createElement('details');details.className='wrComments';
   details.innerHTML='<summary>댓글·답글 보기</summary><div class="wrCommentPanel"><div class="wrCommentList"></div><p class="wrCommentStatus" role="status" aria-live="polite"></p><button type="button" class="wrCommentsMore" hidden>댓글 더 불러오기</button><div class="wrRootComposer"></div></div>';
   const state={kind,id,rows:[],loaded:false,busy:false,more:false,offset:0};states.set(details,state);card.append(details);
   details.addEventListener('toggle',()=>{if(details.open)load(details,state,true)});
   details.querySelector('.wrCommentsMore').onclick=()=>load(details,state,false);
  });
 }
 async function load(details,state,reset){
  if(state.busy)return;state.busy=true;
  const status=details.querySelector('.wrCommentStatus');status.textContent='댓글을 불러오는 중…';
  try{
   await syncSession();
   const offset=reset?0:state.offset;
   const rows=await request(`wedding_comments?select=comment_id,parent_id,author_id,author_name,body,is_deleted,created_at,updated_at&${state.kind}=eq.${encodeURIComponent(state.id)}&order=created_at.asc,comment_id.asc&limit=50&offset=${offset}`);
   if(!details.isConnected)return;
   state.rows=reset?rows:mergeRows(state.rows,rows);state.offset=offset+rows.length;state.loaded=true;state.more=rows.length===50;render(details,state);
   status.textContent='';
  }catch(e){status.textContent=e.message;status.innerHTML=esc(e.message)+' <button type="button" class="wrCommentRetry">다시 불러오기</button>';status.querySelector('button').onclick=()=>load(details,state,reset)}
  finally{state.busy=false}
 }
 function mergeRows(old,rows){return [...new Map([...old,...rows].map(r=>[r.comment_id,r])).values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.comment_id.localeCompare(b.comment_id))}
 function render(details,state){
  const list=details.querySelector('.wrCommentList');list.replaceChildren();
  const roots=state.rows.filter(r=>!r.parent_id);
  if(!roots.length)list.innerHTML='<p class="wrCommentEmpty">아직 댓글이 없습니다. 첫 댓글을 남겨주세요.</p>';
  roots.forEach(root=>{const group=document.createElement('div');group.className='wrCommentThread';group.append(commentNode(root,details,state));
   const replies=document.createElement('div');replies.className='wrCommentReplies';state.rows.filter(r=>r.parent_id===root.comment_id).forEach(r=>replies.append(commentNode(r,details,state)));group.append(replies);list.append(group)});
  details.querySelector('summary').textContent=`댓글·답글 (${state.rows.length}${state.more?'+':''})`;
  details.querySelector('.wrCommentsMore').hidden=!state.more;
  const composer=details.querySelector('.wrRootComposer');composer.replaceChildren();
  if(viewer)composer.append(formNode(details,state,null));else composer.innerHTML='<p>댓글·답글 작성은 로그인 후 이용할 수 있습니다.</p>';
 }
 function commentNode(row,details,state){
  const node=document.createElement('article');node.className='wrComment';node.dataset.commentId=row.comment_id;
  if(row.is_deleted)node.innerHTML='<p class="wrDeletedComment">삭제된 댓글입니다.</p>';
  else{
   node.innerHTML=`<div class="wrCommentMeta"><b>${esc(row.author_name||'회원')}</b><span>${esc(date(row.created_at))}</span></div><p class="wrCommentBody">${esc(row.body)}</p><div class="wrCommentActions"></div><p role="status" aria-live="polite"></p>`;
   const actions=node.querySelector('.wrCommentActions');
   if(viewer&&!row.parent_id){const reply=document.createElement('button');reply.type='button';reply.textContent='답글';reply.onclick=()=>{const old=node.querySelector('form');if(old){old.remove();return}node.append(formNode(details,state,row.comment_id))};actions.append(reply)}
   if(viewer&&(row.author_id===viewer.id||isAdmin)){
    const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.onclick=()=>{node.querySelector('form')?.remove();node.append(formNode(details,state,row.parent_id,row))};actions.append(edit);
    const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';remove.onclick=async()=>{
     if(!confirm('댓글을 삭제할까요? 내용은 복구할 수 없으며 기존 답글은 남습니다.'))return;
     remove.disabled=true;const status=node.querySelector('[role="status"]');status.textContent='삭제 중…';
     try{await ensureViewer();const result=await request(`wedding_comments?comment_id=eq.${encodeURIComponent(row.comment_id)}`,'PATCH',{is_deleted:true});if(!result.length)throw new Error('삭제 권한이 없거나 이미 삭제된 댓글입니다.');state.rows=mergeRows(state.rows,result);render(details,state)}catch(e){status.textContent=e.message}finally{remove.disabled=false}
    };actions.append(remove);
   }
  }
  return node;
 }
 async function ensureViewer(){await syncSession();if(!viewer||token()!==sessionToken)throw new Error('로그인 후 이용해주세요.');}
 function formNode(details,state,parentId,editing){
  const form=document.createElement('form');form.className='wrCommentForm';const inputId=`wr-comment-${++serial}`;
  form.innerHTML=`<label for="${inputId}">${editing?'댓글 수정':parentId?'답글 작성':'댓글 작성'}</label><textarea id="${inputId}" name="body" maxlength="2000" required placeholder="서로 존중하는 댓글을 남겨주세요.">${esc(editing?.body||'')}</textarea><div><button type="submit">${editing?'수정 저장':parentId?'답글 등록':'댓글 등록'}</button>${editing||parentId?'<button type="button" class="wrCommentCancel">취소</button>':''}</div><p role="status" aria-live="polite"></p>`;
  form.querySelector('.wrCommentCancel')?.addEventListener('click',()=>form.remove());
  form.onsubmit=async e=>{
   e.preventDefault();const body=form.elements.body.value.trim(),status=form.querySelector('[role="status"]'),button=form.querySelector('[type="submit"]');
   if(!body||body.length>2000){status.textContent='내용을 1~2,000자 이내로 입력해주세요.';return}if(button.disabled)return;
   button.disabled=true;status.textContent='저장 중…';
   try{await ensureViewer();const path=editing?`wedding_comments?comment_id=eq.${encodeURIComponent(editing.comment_id)}`:'wedding_comments',payload=editing?{body}:{[state.kind]:state.id,parent_id:parentId,body};
    const result=await request(path,editing?'PATCH':'POST',payload);if(!result.length)throw new Error('저장 권한이 없거나 자료가 삭제되었습니다.');state.rows=mergeRows(state.rows,result);render(details,state);details.querySelector('.wrCommentStatus').textContent=editing?'수정했습니다.':'등록했습니다.';
   }catch(e){status.textContent=e.message}finally{button.disabled=false}
  };
  return form;
 }
 const style=document.createElement('style');style.textContent='.wrComments{margin-top:16px;border-top:1px solid #e6dce0;padding-top:12px}.wrComments>summary{cursor:pointer;color:#75465a;font-weight:750;padding:8px 0;list-style-position:inside}.wrCommentPanel{padding:8px 0}.wrComment{padding:12px 0;border-bottom:1px solid #eee4e8;overflow-wrap:anywhere}.wrCommentMeta{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#7b6b72}.wrCommentBody{white-space:pre-wrap;line-height:1.6;margin:9px 0}.wrCommentReplies{margin-left:20px;padding-left:12px;border-left:2px solid #eadbe2}.wrCommentActions{display:flex;gap:7px}.wrComments button{border:1px solid #d5bdc7;border-radius:8px;padding:7px 12px;background:#fff;color:#714457;cursor:pointer}.wrCommentForm{display:grid;gap:8px;padding:14px 0}.wrCommentForm textarea{box-sizing:border-box;display:block;width:100%;min-height:86px;padding:11px;border:1px solid #d8c5ce;border-radius:10px;font:inherit;resize:vertical}.wrCommentForm label{font-weight:750}.wrCommentForm button{margin-right:8px}.wrCommentForm [role=status],.wrCommentStatus,.wrCommentEmpty,.wrDeletedComment{font-size:13px;color:#7c6d74}.wrComments button:disabled{opacity:.55;cursor:wait}.wrComments [hidden]{display:none!important}@media(max-width:600px){.wrCommentReplies{margin-left:10px;padding-left:9px}.wrComments button{min-height:38px}}';document.head.append(style);
 let scheduled=false;new MutationObserver(mutations=>{if(!mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-review-id],[data-post-id],#moderationPanel')||n.querySelector?.('[data-review-id],[data-post-id],#moderationPanel')))))return;if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;attach()},100)}).observe(document.body,{childList:true,subtree:true});
 const authChanged=()=>{syncSession().then(attach)};window.addEventListener('wr-auth-changed',authChanged);window.addEventListener('storage',authChanged);attach();
})();
