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

// Keep homepage runtime intentionally small on mobile.
window.addEventListener("DOMContentLoaded", () => {
  const s = document.createElement("script");
  s.src = "home-lite-v567.js?v=5.67";
  s.defer = true;
  document.body.appendChild(s);

  if (/\/admin\.html$/.test(location.pathname)) {
    const a = document.createElement("script");
    a.src = "price-audit.js?v=5.67";
    a.defer = true;
    document.body.appendChild(a);
  }
});
