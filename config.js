// Supabase Project URL은 이미 확인된 WeddingRank 프로젝트 값입니다.
// 절대로 service_role / secret key를 넣지 마세요.
window.WEDDINGRANK_CONFIG = {
  SUPABASE_URL: "https://mozmxkmaynhxqwzovzhi.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_I4myPqLM3PzjLpYCPwtjrA_jfMD0prR"
};

// Magic Link callback hash는 app.js가 주소창에서 지우기 전에 refresh token을 먼저 보관합니다.
try {
  const authHash = new URLSearchParams(location.hash.slice(1));
  const refreshToken = authHash.get("refresh_token");
  const expiresIn = Number(authHash.get("expires_in") || 0);
  if (refreshToken) localStorage.setItem("wr_refresh_token", refreshToken);
  if (expiresIn) localStorage.setItem("wr_expires_at", String(Date.now() + expiresIn * 1000));
} catch (_) {}

// 기존 app.js/enhancements.js 이후에 최신 기능을 점진적으로 추가합니다.
window.addEventListener("DOMContentLoaded", () => {
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "v59.css?v=5.10";
  document.head.appendChild(css);

  const s58 = document.createElement("script");
  s58.src = "v58.js?v=5.8";
  s58.defer = true;
  document.body.appendChild(s58);

  const s59 = document.createElement("script");
  s59.src = "v59.js?v=5.10";
  s59.defer = true;
  document.body.appendChild(s59);
});
