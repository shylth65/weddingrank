import fs from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://weddingrank.kr';
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const entries = await fs.readdir('area', { withFileTypes: true });
const regions = [];
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const file = path.join('area', entry.name, 'index.html');
  try {
    const html = await fs.readFile(file, 'utf8');
    const match = html.match(/<h1>(.*?) 예식장 ([0-9,]+)곳<\/h1>/);
    if (!match) continue;
    regions.push({ slug: entry.name, name: match[1], count: Number(match[2].replace(/,/g, '')) });
  } catch (_) {}
}
regions.sort((a,b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
const total = regions.reduce((sum, r) => sum + r.count, 0);
const cards = regions.map(r => `<a class="card" href="/area/${r.slug}/"><b>${esc(r.name)}</b><span>${r.count.toLocaleString('ko-KR')}곳</span><em>지역별 보기 →</em></a>`).join('');
const structured = JSON.stringify({
  '@context':'https://schema.org',
  '@type':'CollectionPage',
  name:'전국 지역별 예식장·웨딩홀 찾기',
  url:`${SITE}/regions.html`,
  description:`WeddingRank 공개 운영 예식장 ${total.toLocaleString('ko-KR')}곳을 전국 지역별로 찾아보세요.`,
  isPartOf:{'@type':'WebSite',name:'WeddingRank',url:`${SITE}/`},
  mainEntity:{'@type':'ItemList',numberOfItems:regions.length,itemListElement:regions.map((r,i)=>({'@type':'ListItem',position:i+1,name:r.name,url:`${SITE}/area/${r.slug}/`}))}
}).replace(/</g, '\\u003c');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>전국 지역별 예식장·웨딩홀 찾기 | WeddingRank</title><meta name="description" content="WeddingRank 공개 운영 예식장 ${total.toLocaleString('ko-KR')}곳을 전국 지역별로 찾아보세요."><meta name="robots" content="index,follow"><link rel="canonical" href="${SITE}/regions.html"><meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="WeddingRank"><meta property="og:title" content="전국 지역별 예식장·웨딩홀 찾기 | WeddingRank"><meta property="og:description" content="WeddingRank 공개 운영 예식장 ${total.toLocaleString('ko-KR')}곳을 전국 지역별로 찾아보세요."><meta property="og:url" content="${SITE}/regions.html"><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;color:#202124;background:#fff}.wrap{max-width:980px;margin:auto;padding:28px 20px 60px}a{color:#e83e72;text-decoration:none}.brand{font-size:28px;font-weight:800}.hero{padding:55px 0 35px}.hero h1{font-size:40px;margin:8px 0}.hero p{font-size:18px;color:#666;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.card{display:block;color:#202124;border:1px solid #eee;border-radius:18px;padding:20px;background:linear-gradient(145deg,#fff7fa,#faf8ff);transition:.18s}.card:hover{transform:translateY(-2px);border-color:#ffc6d7;box-shadow:0 10px 25px rgba(80,35,55,.08)}.card b{font-size:20px}.card span{display:block;margin-top:8px;color:#666}.card em{display:block;margin-top:12px;color:#e83e72;font-style:normal;font-size:12px;font-weight:800}.cta{display:inline-block;margin-top:28px;background:#ff3f78;color:#fff;padding:14px 20px;border-radius:12px;font-weight:700}.note{margin-top:24px;color:#777;font-size:13px}@media(max-width:600px){.hero h1{font-size:32px}}</style><script type="application/ld+json">${structured}</script></head><body><main class="wrap"><a class="brand" href="/">WeddingRank ♥</a><section class="hero"><p>대한민국 예식장 비교 플랫폼</p><h1>전국 지역별 예식장·웨딩홀 찾기</h1><p>현재 공개·운영중으로 확인된 예식장 ${total.toLocaleString('ko-KR')}곳을 시·도별로 정리했습니다. 지역을 선택하면 시·군·구별 예식장 목록을 볼 수 있습니다.</p></section><section class="grid">${cards}</section><p class="note">지역별 건수는 WeddingRank 공개 데이터와 함께 자동 갱신됩니다.</p><a class="cta" href="/#find">전국 예식장 ${total.toLocaleString('ko-KR')}곳 비교하기 →</a></main></body></html>`;
await fs.writeFile('regions.html', html);
console.log(`Generated regions.html with ${regions.length} regions and ${total} venues.`);
