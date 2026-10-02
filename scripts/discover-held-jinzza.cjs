async function main(){
 const r=await fetch('https://jinzzawedding.com/halls',{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
 const html=await r.text();
 const known='상록아트홀';
 const i=html.indexOf(known);
 const around=i>=0?html.slice(Math.max(0,i-3000),Math.min(html.length,i+3000)):null;
 const regexes=[
  /\\?"id\\?"\s*:\s*\d+.{0,300}?\\?"name\\?"\s*:\s*\\?"[^"\\]{2,80}/g,
  /\\?"name\\?"\s*:\s*\\?"[^"\\]{2,80}.{0,300}?\\?"id\\?"\s*:\s*\d+/g,
  /halls\\?\\?\/\\?\d+/g,
  /hallId.{0,120}/g
 ];
 const matches={};
 for(const re of regexes)matches[String(re)]=[...html.matchAll(re)].slice(0,50).map(m=>m[0]);
 console.log('JINZZA_DIRECTORY_SCHEMA_BEGIN');
 console.log(JSON.stringify({status:r.status,bytes:html.length,around,matches},null,2));
 console.log('JINZZA_DIRECTORY_SCHEMA_END');
}
main().catch(e=>{console.error(e);process.exit(1)});