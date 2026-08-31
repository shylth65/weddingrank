// Supabase Project URL은 이미 확인된 WeddingRank 프로젝트 값입니다.
// 브라우저 REST 호환성을 위해 legacy anon JWT를 사용합니다. service_role / secret key 금지.
window.WEDDINGRANK_CONFIG = {
  SUPABASE_URL: "https://mozmxkmaynhxqwzovzhi.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vem14a21heW5oeHF3em92emhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDE3NzksImV4cCI6MjEwMzU3Nzc3OX0.JGM3NersbuC45dJsknLFxCvlxHpj0Z0-dHXe_WwBf6I"
};
try {
  const authHash = new URLSearchParams(location.hash.slice(1));
  const refreshToken = authHash.get("refresh_token");
  const expiresIn = Number(authHash.get("expires_in") || 0);
  if (refreshToken) localStorage.setItem("wr_refresh_token", refreshToken);
  if (expiresIn) localStorage.setItem("wr_expires_at", String(Date.now() + expiresIn * 1000));
} catch (_) {}
window.addEventListener("DOMContentLoaded", () => {
  [["link","v59.css?v=5.10"],["link","v512.css?v=5.12"],["link","v514.css?v=5.17"],["link","v523.css?v=5.23"],["link","home-ranking-v538.css?v=5.38"]].forEach(([t,u])=>{const e=document.createElement(t);e.rel="stylesheet";e.href=u;document.head.appendChild(e)});
  ["v58.js?v=5.8","v59.js?v=5.10","v511.js?v=5.11","v512.js?v=5.12","v513.js?v=5.13","v514.js?v=5.15","v516.js?v=5.16","v518.js?v=5.18","v519.js?v=5.19","v520.js?v=5.20","v521.js?v=5.21","v522.js?v=5.22","v523.js?v=5.23","ranking-limit-v534.js?v=5.47","home-top10-v535.js?v=5.46","editorial-methodology-v544.js?v=5.46","navigation-hotfix-v545.js?v=5.46"].forEach(u=>{const s=document.createElement("script");s.src=u;s.defer=true;document.body.appendChild(s)});
  if (/\/admin\.html$/.test(location.pathname)) {
    const s=document.createElement("script");
    s.src="price-audit.js?v=5.42";
    s.defer=true;
    document.body.appendChild(s);
  }
});
