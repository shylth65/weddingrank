const targets=[
 {name:'상록아트홀',hallPage:'https://jinzzawedding.com/halls/80'},
 {name:'벨라루체웨딩홀 서울점',hallPage:'https://jinzzawedding.com/halls/153'},
 {name:'그랜드 하얏트 서울 웨딩',hallPage:'https://jinzzawedding.com/halls/68'},
 {name:'PJ호텔 웨딩',hallPage:'https://jinzzawedding.com/halls/118'}
];
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const dec=s=>String(s||'').replace(/<!-- -->/g,'').replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/&quot;/g,'"');
function parseCards(html){
 const chunks=html.split(/<div class="review-card[^"]*" id="review-(\d+)">/);
 const out=[];
 for(let i=1;i<chunks.length;i+=2){
  const id=chunks[i], body=chunks[i+1]||'';
  const rating=Number((body.match(/class="rc-bignum">([0-9.]+)/)||[])[1]);
  const title=dec((body.match(/class="rc-title">([\s\S]*?)<\/div>/)||[])[1]).replace(/<[^>]+>/g,'').trim();
  const verify=clean((body.match(/class="rc-verify">([\s\S]*?)<\/div>/)||[])[1]||'');
  out.push({id,url:'https://jinzzawedding.com/reviews/'+id,rating:Number.isFinite(rating)?rating:null,title,verify});
 }
 return out;
}
async function inspectReview(card){
 const r=await fetch(card.url,{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
 const html=await r.text(), text=clean(html);
 const raw=Number((html.match(/"ratingValue"\s*:\s*([0-9.]+)/i)||[])[1]);
 const best=Number((html.match(/"bestRating"\s*:\s*([0-9.]+)/i)||[])[1]);
 const period=(text.match(/(20\d{2}\.\d{2})\s+(?:상담·방문|상담·투어|투어·방문|투어|방문|하객 방문)/)||[])[1]||null;
 const verification=(text.match(/((?:견적서|예약내역|현장사진|명함·카톡|명함) 인증)(?:\s*[✅❌🤔])?/)||[])[1]||null;
 const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/\s+/g,' ').trim()||null;
 return {...card,status:r.status,raw:Number.isFinite(raw)?raw:null,best:Number.isFinite(best)?best:null,period,verification,pageTitle:title,preview:text.slice(0,700)};
}
async function main(){
 const out=[];
 for(const t of targets){
  const r=await fetch(t.hallPage,{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
  const html=await r.text();
  const cards=parseCards(html);
  const preferred=cards.filter(c=>/(견적서|예약내역|현장사진|명함·카톡|명함)/.test(c.verify)).slice(0,5);
  const inspected=[];
  for(const c of preferred) inspected.push(await inspectReview(c));
  out.push({...t,status:r.status,allCards:cards.length,preferredFound:preferred.length,reviews:inspected});
 }
 console.log('HELD_JINZZA_DISCOVERY_BEGIN');
 console.log(JSON.stringify(out,null,2));
 console.log('HELD_JINZZA_DISCOVERY_END');
}
main().catch(e=>{console.error(e);process.exit(1)});