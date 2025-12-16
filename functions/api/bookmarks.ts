interface Env {
  DB: D1Database;
}

// 辅助函数：将 ArrayBuffer 转为字符串，支持自动检测编码 (GBK/UTF-8)
function decodeHtml(buffer: ArrayBuffer, contentType: string | null): string {
  let decoder = new TextDecoder("utf-8"); // 默认 UTF-8
  let text = decoder.decode(buffer, { stream: false });

  // 1. 尝试从 Content-Type Header 获取 charset
  let charset = "";
  if (contentType && contentType.includes("charset=")) {
    charset = contentType.split("charset=")[1].trim().toLowerCase();
  }

  // 2. 如果 Header 没写，尝试从 HTML meta 标签里找
  if (!charset) {
    const metaMatch = text.match(/<meta[^>]*charset=["']?([^"'>]+)["']?/i);
    if (metaMatch) {
      charset = metaMatch[1].toLowerCase();
    }
  }

  // 3. 如果发现是 GBK, GB2312 或 GB18030，重新解码
  // GB18030 是最新的中文编码标准，向下兼容 GBK 和 GB2312
  if (charset.includes("gbk") || charset.includes("gb2312") || charset.includes("gb18030")) {
    decoder = new TextDecoder("gb18030");
    text = decoder.decode(buffer);
  } else if (charset.includes("big5")) {
    decoder = new TextDecoder("big5");
    text = decoder.decode(buffer);
  }

  return text;
}

function extractMeta(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || 
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  
  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim() : null
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const { results } = await env.DB.prepare(
    "SELECT * FROM bookmarks ORDER BY is_pinned DESC, sort_order DESC, created_at DESC"
  ).all();
  
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  try {
    const body: any = await request.json();
    const urlStr = body.url;
    let category = body.category || '默认';
    const isPinned = body.is_pinned ? 1 : 0; 
    const iconUrl = body.icon_url || null;
    const openNewTab = body.open_new_tab !== undefined ? (body.open_new_tab ? 1 : 0) : 1;
    let userDescription = body.description || ""; // 用户手动输入的备注

    if (!urlStr) return new Response("Missing URL", { status: 400 });

    let title = body.title || urlStr; 
    // 如果没有用户备注，也没有标题，说明可能是自动抓取，我们暂存抓取的描述
    let fetchedDescription = "";

    // 只有当没有提供标题时才去抓取
    if (!body.title) {
        try {
          const fetchRes = await fetch(urlStr, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkBox-Bot/1.0;)' },
            cf: { cacheTtl: 3600, cacheEverything: true }
          });
          
          if (fetchRes.ok) {
            // 关键修改：读取二进制流而不是直接 .text()
            const buffer = await fetchRes.arrayBuffer();
            const contentType = fetchRes.headers.get("content-type");
            const html = decodeHtml(buffer, contentType);
            
            const meta = extractMeta(html);
            if (meta.title) title = meta.title;
            if (meta.description) fetchedDescription = meta.description;
          }
        } catch (e) {
          console.error("Metadata fetch failed", e);
        }
    }

    // 优先使用用户输入的备注，如果没有，则使用抓取的描述
    const finalDescription = userDescription || fetchedDescription;

    await env.DB.prepare(
      "INSERT INTO bookmarks (url, title, description, category, is_pinned, icon_url, open_new_tab) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(urlStr, title, finalDescription.substring(0, 200), category, isPinned, iconUrl, openNewTab).run();

    return new Response(JSON.stringify({ success: true, meta: { title, description: finalDescription } }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("Missing ID", { status: 400 });
  await env.DB.prepare("DELETE FROM bookmarks WHERE id = ?").bind(id).run();
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" }});
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const body: any = await request.json();
    if (!body.id) return new Response("Missing ID", { status: 400 });

    const updates = [];
    const values = [];
    const allowedFields = ['is_read', 'is_pinned', 'url', 'title', 'description', 'category', 'icon_url', 'sort_order', 'open_new_tab'];

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updates.push(`${field} = ?`);
            if (['is_read', 'is_pinned', 'open_new_tab'].includes(field)) {
                values.push(body[field] ? 1 : 0);
            } else {
                values.push(body[field]);
            }
        }
    }

    if (updates.length === 0) return new Response("No fields to update", { status: 400 });
    values.push(body.id);
    await env.DB.prepare(`UPDATE bookmarks SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" }});
};