import { createNotionClient, queryPagesByStatus } from "./notion-client.mjs";

const notion = createNotionClient();
if (!notion) {
  process.stdout.write("NOTION_API_SECRET is not set; skipping status update.\n");
} else {
  const pages = await queryPagesByStatus(notion, ["待发布"]);
  for (const page of pages) {
    await notion.pages.update({
      page_id: page.id,
      properties: { 发布状态: { select: { name: "已发布" } } },
    });
    process.stdout.write(`Marked as published: ${page.id}\n`);
  }
}
