'use strict';
// Daily smoke QA after approved-only aggregation. This does not change evidence or rankings.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  const errors = [];
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('https://weddingrank.kr/',{waitUntil:'networkidle',timeout:60000});
    await page.waitForFunction(() => /\d+\s*곳/.test((document.querySelector('#publicCount')?.textContent||'').trim()),null,{timeout:30000});
    const count = (await page.locator('#publicCount').textContent()).trim();
    await page.goto('https://weddingrank.kr/#find',{waitUntil:'networkidle',timeout:60000});
    await page.locator('#search').fill('케이터틀');
    await page.waitForFunction(() => /검색결과/.test(document.querySelector('#listResultCount')?.textContent||''),null,{timeout:30000});
    const search = (await page.locator('#listResultCount').textContent()).trim();
    if (/검색결과 0곳/.test(search)) throw new Error('Known venue search returned zero');
    await page.goto('https://weddingrank.kr/#hall=b4ff74c0-a956-4c65-83ae-5092354503ce',{waitUntil:'networkidle',timeout:60000});
    await page.waitForFunction(() => (document.querySelector('#detailName')?.textContent||'').includes('케이터틀'),null,{timeout:30000});
    const detail = (await page.locator('#detailName').textContent()).trim();
    await page.goto('https://weddingrank.kr/#rankings',{waitUntil:'networkidle',timeout:60000});
    await page.waitForFunction(() => (document.querySelector('#rankingBody')?.innerText||'').length>30,null,{timeout:30000});
    const asOf = (await page.locator('#rankingDataAsOfFull').textContent()).trim();
    if (errors.length) throw new Error('Browser errors: '+errors.slice(0,3).join(' | '));
    console.log(JSON.stringify({status:'pass',publicCount:count,search,detail,rankingDate:asOf,site:'https://weddingrank.kr/'}));
  } finally { await browser.close(); }
})().catch(e=>{console.error('WEDDINGRANK_LIVE_QA_FAILED',e);process.exit(1)});
