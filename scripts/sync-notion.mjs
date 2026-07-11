import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NotionToMarkdown } from "notion-to-md";
import { createNotionClient, queryPagesByStatus } from "./notion-client.mjs";
import {
  frontmatterFor,
  normalizeMarkdown,
  renderPostFrontmatter,
} from "./notion-utils.mjs";

const POSTS_DIR = "src/content/posts/_notion";
const IMAGES_DIR = "public/images/notion";

const MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

async function replaceAsync(source, pattern, replacer) {
  const matches = [...source.matchAll(pattern)];
  const replacements = await Promise.all(matches.map(match => replacer(match)));
  let index = 0;
  return source.replace(pattern, () => replacements[index++]);
}

async function downloadImages(markdown, slug) {
  let imageIndex = 0;
  const imageDir = path.join(IMAGES_DIR, slug);

  return replaceAsync(
    markdown,
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g,
    async match => {
      const [, alt, url] = match;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${url}`);
      }

      const contentType = response.headers.get("content-type")?.split(";")[0];
      const extension = MIME_EXTENSIONS.get(contentType) || "bin";
      const filename = `${String(++imageIndex).padStart(2, "0")}.${extension}`;
      await mkdir(imageDir, { recursive: true });
      await writeFile(
        path.join(imageDir, filename),
        Buffer.from(await response.arrayBuffer())
      );
      return `![${alt}](/images/notion/${slug}/${filename})`;
    }
  );
}

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
