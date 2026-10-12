'use strict';
const {createClient}=require('@supabase/supabase-js');
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank secrets missing/wrong');
const db=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
async function all(t,s){const a=[];for(let n=0;;n+=500){const {data,error}=await db.from(t).select(s).range(n,n+499);if(error)throw error;a.push(...data);if(data.length<500)return a;}}
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
(async()=>{
 const halls=await all('wedding_halls','hall_id,name,sido,sigungu,road_address,phone,website,is_public,operation_status');
 const rooms=await all('hall_rooms','hall_id,room_name');
 const publicRows=halls.filter(h=>h.is_public===true);
 const candidates=halls.filter(h=>h.is_public!==true);
 const keywords=['더컨벤션','웨딩스퀘어','메리빌리아','웨딩시티','호텔','노블발렌티','아펠가모','더채플','시그니처','그랜드','컨벤션','빌라드','규수당'];
 const roomCounts=new Map();for(const r of rooms)roomCounts.set(r.hall_id,(roomCounts.get(r.hall_id)||0)+1);
 const rows=candidates.filter(h=>keywords.some(k=>String(h.name).includes(k))).map(h=>{
   const dn=publicRows.filter(p=>normalize(p.name)===normalize(h.name)||Boolean(h.road_address&&p.road_address&&normalize(h.road_address)===normalize(p.road_address)));
   const confirmed=h.operation_status==='운영',complete=Boolean(h.road_address&&h.phone&&h.website&&!/weddingrank|pickrank/.test(h.website));
   return {...h,room_count:roomCounts.get(h.hall_id)||0,exact_public_duplicates:dn.map(d=>({name:d.name,hall_id:d.hall_id})),complete,confirmed}
 }).sort((a,b)=>(Number(b.confirmed&&b.complete&&!b.exact_public_duplicates.length)-Number(a.confirmed&&a.complete&&!a.exact_public_duplicates.length))||Number(b.complete)-Number(a.complete));
 const preferred=rows.filter(h=>/더컨벤션|메리빌리아|노블발렌티|아펠가모|더채플|규수당|빌라드|웨딩스퀘어/.test(h.name)).slice(0,110);
 const focusIds=['8cf5df70-1b80-4784-8861-32aeb6f67cf6','24c6978c-dd17-42f3-8e30-d053958b8b9b',
 'c515fc40-67d5-4d09-96b7-3760a25a4091','2f6fe903-8849-45af-aff3-3db3f0b6a055',
 '433fea2d-85a6-4acc-b864-710c122de704','ac48c777-f2b2-48f5-a390-80d82ec67fbc',
 '317652f7-72c6-4464-8bda-27e2836918ee','443d99a5-9788-4e8b-93df-bfe421eade0a'];
 const prices=await all('wedding_prices','*');
 const allRoomData=await all('hall_rooms','*');
 const ratings=await all('external_wedding_ratings','hall_id,is_public,updated_at');
 const focus=focusIds.map(id=>{
  const h=halls.find(x=>x.hall_id===id);
  if(!h)return {id,error:'not_found'};
  const matches=halls.filter(x=>x.hall_id!==id &&
     ((x.road_address&&h.road_address&&normalize(x.road_address)===normalize(h.road_address))
      ||(normalize(x.name)===normalize(h.name))));
  return {venue:h,room_rows:allRoomData.filter(x=>x.hall_id===id),
   price_rows:prices.filter(x=>x.hall_id===id),external_rating:ratings.find(x=>x.hall_id===id)||null,
   possible_exact_duplicates:matches.map(x=>({hall_id:x.hall_id,name:x.name,is_public:x.is_public,road_address:x.road_address}))};
 });
 console.log('WEDDINGRANK_FOCUS_PREFLIGHT='+JSON.stringify({mode:'read_only',focus}));

 console.log('WEDDINGRANK_DIRECTORY_CANDIDATES='+JSON.stringify({mode:'read_only',pickrank_sync:false,all_venues:halls.length,public_operating:publicRows.filter(h=>h.operation_status==='운영').length,
 total_nonpublic:candidates.length,filtered:rows.length,top_ready:rows.filter(h=>h.complete&&h.confirmed&&!h.exact_public_duplicates.length).slice(0,65),preferred}));
})().catch(e=>{console.error(e);process.exit(1)});
