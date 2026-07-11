# Wang Jianhua Blog

个人技术博客，使用 AstroPaper 构建并部署到 GitHub Pages。文章在 Notion 中写作，通过发布状态控制同步。

## 发布流程

```text
Notion posts -> sync script -> AstroPaper -> GitHub Pages
```

Notion 数据库使用以下字段：

| 字段        | 用途                   |
| ----------- | ---------------------- |
| 名称        | 文章标题               |
| Description | 文章摘要               |
| Tags        | 文章标签               |
| Slug        | 稳定的英文 URL，可留空 |
| 发布日期    | 公开发布日期，可留空   |
| 发布状态    | 草稿、待发布、已发布   |

同步规则：

- 空值和草稿不会发布。
- 待发布会在下次工作流运行时上线。
- 部署成功后，待发布自动更新为已发布。
- 已发布文章会在每次构建中保持在线。
- 将已发布文章改回草稿会在下次构建时下线。

## 本地运行

```bash
npm install
cp .env.example .env
npm run sync:notion
npm run dev
```

## GitHub 配置

在仓库的 `Settings > Secrets and variables > Actions` 中添加：

- `NOTION_API_SECRET`：Notion Integration Token

Integration 需要获得 `posts` 数据库的读取权限，以及更新“发布状态”的权限。GitHub Pages 的 Source 应设置为 `GitHub Actions`。
