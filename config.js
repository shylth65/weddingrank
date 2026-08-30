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

  const css512 = document.createElement("link");
  css512.rel = "stylesheet";
  css512.href = "v512.css?v=5.12";
  document.head.appendChild(css512);

  const css514 = document.createElement("link");
  css514.rel = "stylesheet";
  css514.href = "v514.css?v=5.15";
  document.head.appendChild(css514);

  const s58 = document.createElement("script");
  s58.src = "v58.js?v=5.8";
  s58.defer = true;
  document.body.appendChild(s58);

  const s59 = document.createElement("script");
  s59.src = "v59.js?v=5.10";
  s59.defer = true;
  document.body.appendChild(s59);

  const s511 = document.createElement("script");
  s511.src = "v511.js?v=5.11";
  s511.defer = true;
  document.body.appendChild(s511);

  const s512 = document.createElement("script");
  s512.src = "v512.js?v=5.12";
  s512.defer = true;
  document.body.appendChild(s512);

  const s513 = document.createElement("script");
  s513.src = "v513.js?v=5.13";
  s513.defer = true;
  document.body.appendChild(s513);

  const s514 = document.createElement("script");
  s514.src = "v514.js?v=5.15";
  s514.defer = true;
  document.body.appendChild(s514);
});
