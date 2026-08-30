import fs from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL='https://mozmxkmaynhxqwzovzhi.supabase.co';
const SUPABASE_KEY='sb_publishable_I4myPqLM3PzjLpYCPwtjrA_jfMD0prR';
const SITE='https://weddingrank.kr';
const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`};

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
const won=v=>v==null?'가격정보 확인중':Number(v)===0?'무료':Number(v).toLocaleString('ko-KR')+'원';

async function api(resource,query){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${resource}?${query}`,{headers});
  if(!r.ok) throw new Error(`${resource} ${r.status} ${await r.text()}`);
  return r.json();
}

const halls=await api('wedding_halls','select=hall_id,name,sido,sigungu,road_address,phone,website,venue_type&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc&limit=1000');
const prices=await api('wedding_prices','select=hall_id,effective_date,rental_fee,meal_price_per_person,minimum_guarantee&order=effective_date.desc&limit=5000');
const latest=new Map();
for(const p of prices) if(p.hall_id&&!latest.has(p.hall_id)) latest.set(p.hall_id,p);

await fs.rm('venue',{recursive:true,force:true});
await fs.mkdir('venue',{recursive:true});

const urls=[];
for(const h of halls){
  const id=h.hall_id;
  const p=latest.get(id);
  const region=[h.sido,h.sigungu].filter(Boolean).join(' ');
  const canonical=`${SITE}/venue/${id}/`;
  const title=`${h.name} 예식장 가격·홀 정보 | WeddingRank`;
  const desc=`${region} ${h.name}의 예식장 기본정보${p?'와 확인된 가격 정보':''}를 WeddingRank에서 확인하세요. 대관료·식대·최소보증인원·후기·랭킹 정보를 비교합니다.`;
  const fullDetail=`${SITE}/#hall=${encodeURIComponent(id)}`;
  const structured={
    '@context':'https://schema.org','@type':'LocalBusiness',name:h.name,url:canonical,
    address:{'@type':'PostalAddress',streetAddress:h.road_address||undefined,addressRegion:h.sido||undefined,addressLocality:h.sigungu||undefined},
    telephone:h.phone||undefined
  };
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="WeddingRank 예식장랭킹"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canonical}"><script type="application/ld+json">${json(structured)}</script><style>body{margin:0;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;color:#202126;background:linear-gradient(135deg,#fff5f8,#f7f4ff)}a{color:inherit}.wrap{max-width:820px;margin:auto;padding:28px 20px 70px}.brand{text-decoration:none;font-size:26px;font-weight:900}.brand i{color:#ff3f78;font-style:normal}.hero{padding:48px 0 24px}.eyebrow{color:#d83f6e;font-weight:800;font-size:13px}.hero h1{font-size:40px;line-height:1.15;margin:8px 0 14px;letter-spacing:-1.5px}.hero p{color:#6f6870;line-height:1.7}.box{background:#fff;border:1px solid #eee5e8;border-radius:20px;padding:22px;margin:15px 0;box-shadow:0 10px 28px rgba(60,30,45,.06)}.row{display:grid;grid-template-columns:110px 1fr;gap:14px;padding:12px 0;border-bottom:1px solid #f0ecee}.row:last-child{border-bottom:0}.row span{color:#777}.price{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.price div{background:#fff4f7;border-radius:14px;padding:14px}.price small{display:block;color:#8a737b;margin-bottom:6px}.cta{display:block;text-align:center;margin-top:24px;padding:15px;border-radius:13px;background:#ff3f78;color:#fff;text-decoration:none;font-weight:900}.note{font-size:12px;color:#81777b;line-height:1.6}@media(max-width:600px){.hero h1{font-size:31px}.row{grid-template-columns:82px 1fr}.price{grid-template-columns:1fr}}</style></head><body><main class="wrap"><a class="brand" href="${SITE}/">WeddingRank <i>♥</i></a><section class="hero"><div class="eyebrow">${esc(region||'전국')} 예식장·웨딩홀</div><h1>${esc(h.name)}</h1><p>${esc(desc)}</p></section><section class="box"><div class="row"><b>지역</b><span>${esc(region||'확인중')}</span></div><div class="row"><b>주소</b><span>${esc(h.road_address||'주소 확인중')}</span></div><div class="row"><b>전화</b><span>${esc(h.phone||'전화번호 확인중')}</span></div><div class="row"><b>유형</b><span>${esc(h.venue_type||'예식장')}</span></div>${h.website?`<div class="row"><b>웹사이트</b><span><a href="${esc(h.website)}" rel="nofollow noopener">공식/참고 사이트</a></span></div>`:''}</section><section class="box"><h2>가격 정보</h2>${p?`<div class="price"><div><small>대관료</small><b>${esc(won(p.rental_fee))}</b></div><div><small>1인 식대</small><b>${esc(won(p.meal_price_per_person))}</b></div><div><small>최소보증</small><b>${p.minimum_guarantee?Number(p.minimum_guarantee).toLocaleString('ko-KR')+'명':'확인중'}</b></div></div><p class="note">기준일 ${esc(p.effective_date||'확인중')} · 실제 계약 조건은 날짜·요일·시간·프로모션에 따라 달라질 수 있으므로 최종 계약 전 예식장에 확인하세요.</p>`:`<p>가격정보 확인중입니다. 확인되는 순서대로 업데이트합니다.</p>`}</section><a class="cta" href="${fullDetail}">WeddingRank에서 상세 비교·후기 보기 →</a><p class="note">WeddingRank는 확인되지 않은 가격을 임의 추정하지 않습니다.</p></main></body></html>`;
  const dir=path.join('venue',id);
  await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'index.html'),html,'utf8');
  urls.push(canonical);
}

const sitemap=[`${SITE}/`,`${SITE}/regions.html`,...urls];
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u,i)=>`  <url><loc>${u}</loc><lastmod>${new Date().toISOString().slice(0,10)}</lastmod><changefreq>${i<2?'daily':'weekly'}</changefreq><priority>${i===0?'1.0':i===1?'0.9':'0.8'}</priority></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile('sitemap.xml',xml,'utf8');
console.log(`Generated ${halls.length} venue SEO pages and ${sitemap.length} sitemap URLs.`);
