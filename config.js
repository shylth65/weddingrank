// Supabase Project URL은 이미 확인된 WeddingRank 프로젝트 값입니다.
// 절대로 service_role / secret key를 넣지 마세요.
window.WEDDINGRANK_CONFIG = {
  SUPABASE_URL: "https://mozmxkmaynhxqwzovzhi.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_I4myPqLM3PzjLpYCPwtjrA_jfMD0prR"
};
try {
  const authHash = new URLSearchParams(location.hash.slice(1));
  const refreshToken = authHash.get("refresh_token");
  const expiresIn = Number(authHash.get("expires_in") || 0);
  if (refreshToken) localStorage.setItem("wr_refresh_token", refreshToken);
  if (expiresIn) localStorage.setItem("wr_expires_at", String(Date.now() + expiresIn * 1000));
} catch (_) {}
window.addEventListener("DOMContentLoaded", () => {
  [["link","v59.css?v=5.10"],["link","v512.css?v=5.12"],["link","v514.css?v=5.17"]].forEach(([t,u])=>{const e=document.createElement(t);e.rel="stylesheet";e.href=u;document.head.appendChild(e)});
  ["v58.js?v=5.8","v59.js?v=5.10","v511.js?v=5.11","v512.js?v=5.12","v513.js?v=5.13","v514.js?v=5.15","v516.js?v=5.16","v518.js?v=5.18"].forEach(u=>{const s=document.createElement("script");s.src=u;s.defer=true;document.body.appendChild(s)});
});
