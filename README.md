🔖 LinkBox - 极简个人起始页

基于 Cloudflare Pages + D1 Database 构建的现代化个人书签管理与起始页工具。无服务器架构，免费、快速、私密。

(建议上传一张截图并替换上面的链接)

✨ 功能特性

极简设计：毛玻璃 UI 风格，每日 Bing 壁纸，支持 3D 翻转动画。

书签管理：支持分组、拖拽排序、自定义图标、自动抓取网页标题和描述。

访问控制：基于数据库的密码验证（默认密码 admin），支持在线修改密码。

数据安全：所有数据存储在您自己的 Cloudflare D1 数据库中。

导入导出：支持标准 HTML 书签文件的导入与导出，无缝迁移浏览器收藏。

完全免费：利用 Cloudflare 免费额度即可完美运行。

🚀 部署指南 (Deploy)

本项目部署在 Cloudflare Pages 上，数据库使用 Cloudflare D1。

准备工作

拥有一个 GitHub 账号。

拥有一个 Cloudflare 账号。

本地安装了 Node.js (用于初始化数据库)。

第一步：Fork 本仓库

点击右上角的 Fork 按钮，将本项目克隆到你自己的 GitHub 账号下。

第二步：创建 Cloudflare Pages

登录 Cloudflare Dashboard。

进入 Compute (Workers & Pages) -> Pages。

点击 Connect to Git，选择你刚刚 Fork 的仓库。

构建设置 (Build settings)：

Framework preset: None (或者选 Nuxt/Vue 也没关系，因为我们是纯静态+Functions)

Build command: npm run build (如果没有 package.json，填 exit 0 也可以)

Build output directory: public

点击 Save and Deploy。

第三步：创建并绑定 D1 数据库

在 Cloudflare 后台，进入 Storage & Databases -> D1。

点击 Create，创建一个新数据库，命名为 linkbox-db（或者其他你喜欢的名字）。

回到刚才创建的 Pages 项目 -> Settings -> Functions。

找到 D1 Database Bindings，点击 Add binding：

Variable name: DB (必须是大写的 DB)

D1 database: 选择刚才创建的 linkbox-db

重新部署：绑定后，你需要去 Deployments 页面，点击 Create deployment -> Retry deployment (或者手动触发一次 Git 推送) 让绑定生效。

第四步：初始化数据库 (关键)

为了让程序能运行，你需要初始化数据库表结构。

方法 A：使用 Wrangler 命令行 (推荐)
在你的电脑终端中，拉取代码并运行：

npm install -g wrangler
wrangler login

# 这里需要将 <DATABASE_ID> 替换为你 D1 数据库的 ID
wrangler d1 execute linkbox-db --remote --file=./db/schema.sql

# 初始化密码配置表 (设置默认密码为 admin)
wrangler d1 execute linkbox-db --remote --command="CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT); INSERT OR IGNORE INTO config (key, value) VALUES ('password', 'admin');"


方法 B：Cloudflare 后台控制台

进入 D1 数据库详情页，点击 Console 标签。

复制 db/schema.sql 文件的内容粘贴并执行。

然后再执行以下 SQL 初始化密码：

CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO config (key, value) VALUES ('password', 'admin');


第五步：开始使用

打开你的 Pages 域名（例如 https://你的项目.pages.dev）。

点击右下角设置或添加按钮。

输入默认密码：admin。

系统会提示你立即修改密码，请设置强密码。

🛠️ 本地开发

# 1. 安装依赖
npm install

# 2. 启动本地预览 (带本地 D1 模拟)
wrangler pages dev

# 3. 初始化本地数据库数据
wrangler d1 execute linkbox-db --local --file=./db/schema.sql


📝 目录结构

public/ - 前端静态资源 (HTML, CSS, JS)

functions/ - 后端 API (Cloudflare Pages Functions)

db/ - 数据库结构 SQL

📄 License

MIT