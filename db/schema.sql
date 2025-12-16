DROP TABLE IF EXISTS bookmarks;

CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  category TEXT DEFAULT '默认',
  is_read INTEGER DEFAULT 0,    -- 0: 未读, 1: 已读
  is_pinned INTEGER DEFAULT 0,  -- 0: 普通, 1: 首页常用(置顶)
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_category ON bookmarks(category);
CREATE INDEX idx_pinned ON bookmarks(is_pinned);

-- 插入一些测试数据
INSERT INTO bookmarks (url, title, category, is_pinned) VALUES 
('https://www.google.com', 'Google', '搜索', 1),
('https://github.com', 'GitHub', '开发', 1),
('https://www.bilibili.com', 'Bilibili', '娱乐', 0);