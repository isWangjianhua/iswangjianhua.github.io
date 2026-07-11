import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NotionToMarkdown } from "notion-to-md";
import { createNotionClient, queryPagesByStatus } from "./notion-client.mjs";
import { downloadImages } from "./notion-images.mjs";
import {
  frontmatterFor,
  normalizeMarkdown,
  renderPostFrontmatter,
} from "./notion-utils.mjs";

const POSTS_DIR = "src/content/posts/_notion";
const IMAGES_DIR = "public/images/notion";

async function main() {
  const notion = createNotionClient();
  if (!notion) {
    process.stdout.write(
      "NOTION_API_SECRET is not set; skipping Notion sync.\n"
    );
    return;
  }

  const pages = await queryPagesByStatus(notion, ["待发布", "已发布"]);
  const notionToMarkdown = new NotionToMarkdown({
    notionClient: notion,
    config: { parseChildPages: false },
  });
  notionToMarkdown.setCustomTransformer(
    "table_of_contents",
    async () => '<table_of_contents color="gray"/>'
  );
  await rm(POSTS_DIR, { recursive: true, force: true });
  await rm(IMAGES_DIR, { recursive: true, force: true });

  for (const page of pages) {
    const post = frontmatterFor(page);
    const blocks = await notionToMarkdown.pageToMarkdown(page.id);
    const converted = notionToMarkdown.toMarkdownString(blocks).parent ?? "";

    const markdown = await downloadImages(
      normalizeMarkdown(converted),
      post.slug
    );
    await mkdir(POSTS_DIR, { recursive: true });
    await writeFile(
      path.join(POSTS_DIR, `${post.slug}.md`),
      `${renderPostFrontmatter(post)}\n\n${markdown}\n`
    );
    process.stdout.write(`Synced: ${post.title}\n`);
  }

  process.stdout.write(`Notion sync complete: ${pages.length} post(s).\n`);
}

await main();
