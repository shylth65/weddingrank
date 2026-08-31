// WeddingRank Supabase public browser configuration.
// Use only the public publishable key in the browser. Never expose service_role / secret keys.
window.WEDDINGRANK_CONFIG = {
  SUPABASE_URL: "https://mozmxkmaynhxqwzovzhi.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_I4myPqLM3PzjLpYCPwtjrA_jfMD0prR"
};
try {
  const authHash = new URLSearchParams(location.hash.slice(1));
  const refreshToken = authHash.get("refresh_token");
  const expiresIn = Number(authHash.get("expires_in") || 0);
  if (refreshToken) localStorage.setItem("wr_refresh_token", refreshToken);
  if (expiresIn) localStorage.setItem("wr_expires_at", String(Date.now() + expiresIn * 1000));
} catch (_) {}

window.addEventListener("DOMContentLoaded", () => {
  // Keep only the current, non-overlapping enhancement stack.
  [
    "home-ranking-v538.css?v=5.65"
  ].forEach(u => {
    const e = document.createElement("link");
    e.rel = "stylesheet";
    e.href = u;
    document.head.appendChild(e);
  });

  [
    "ranking-limit-v534.js?v=5.65",
    "navigation-hotfix-v545.js?v=5.65",
    "render-rescue-v560.js?v=5.65",
    "list-five-v562.js?v=5.65"
  ].forEach(u => {
    const s = document.createElement("script");
    s.src = u;
    s.defer = true;
    document.body.appendChild(s);
  });

  if (/\/admin\.html$/.test(location.pathname)) {
    const s = document.createElement("script");
    s.src = "price-audit.js?v=5.65";
    s.defer = true;
    document.body.appendChild(s);
  }
});
