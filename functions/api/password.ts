interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  try {
    const body: any = await request.json();
    const newPassword = body.password;

    if (!newPassword || newPassword.length < 4) {
      return new Response("Password too short", { status: 400 });
    }

    // 更新数据库中的密码
    // 使用 ON CONFLICT REPLACE 确保 key 存在时更新，不存在时插入
    await env.DB.prepare(
      "INSERT INTO config (key, value) VALUES ('password', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(newPassword).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};