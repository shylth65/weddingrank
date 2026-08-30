// WeddingRank v5.18 - connect homepage region discovery to static SEO hubs
(() => {
  const slug = s => encodeURIComponent(String(s || '').trim()).replace(/%/g, '~');
  const enhance = () => {
    const section = document.querySelector('#regions');
    if (!section || section.dataset.hubEnhanced === '1') return;
    section.dataset.hubEnhanced = '1';
    const p = document.createElement('p');
    p.className = 'regionHubLink';
    p.innerHTML = '<a href="/regions.html">전국 17개 시·도 · 시군구별 예식장 전체보기 →</a>';
    const buttons = section.querySelector('#regionButtons');
    if (buttons) buttons.insertAdjacentElement('afterend', p);
    else section.appendChild(p);

    section.addEventListener('click', e => {
      const btn = e.target.closest('#regionButtons button');
      if (!btn) return;
      const name = (btn.dataset.sido || btn.dataset.region || btn.textContent || '').trim();
      if (!name || /전국/.test(name)) return;
      // Keep existing filter behavior; provide a long-press/new-tab-friendly static hub via title.
      btn.title = `${name} 시·군·구별 예식장 페이지도 이용할 수 있습니다.`;
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance);
  else enhance();
})();