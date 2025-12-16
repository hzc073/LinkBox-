interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 【核心修复】：如果请求的路径不是以 /api/ 开头（比如是 /, /index.html, /favicon.ico），直接放行
  // 这样前端页面才能加载出来，加载出来后前端 JS 会处理登录弹窗
  if (!url.pathname.startsWith("/api/")) {
    return next();
  }

  // 1. 允许 OPTIONS 请求通过（CORS 预检）
  if (request.method === "OPTIONS") {
    return next();
  }

  // 2. 从数据库获取当前密码
  let currentPassword = 'admin'; // 默认 fallback
  try {
    const record = await env.DB.prepare("SELECT value FROM config WHERE key = 'password'").first();
    if (record && record.value) {
      currentPassword = record.value as string;
    }
  } catch (e) {
    // 数据库还没初始化时，允许 admin 登录
    console.error("DB Auth Error", e);
  }

  // 3. 检查自定义 Header 中的密码
  const authHeader = request.headers.get("x-auth-password");
  
  if (authHeader === currentPassword) {
    return next();
  }

  // 4. 验证失败
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
};