import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_IMAGES_DIR = "public/images/notion";

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

export function contentAddressedFilename(content, extension) {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return `${digest}.${extension}`;
}

export async function downloadImages(
  markdown,
  slug,
  { fetchImpl = fetch, imagesDir = DEFAULT_IMAGES_DIR } = {}
) {
  const imageDir = path.join(imagesDir, slug);

  return replaceAsync(
    markdown,
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g,
    async match => {
      const [, alt, url] = match;
      const response = await fetchImpl(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${url}`);
      }

      const contentType = response.headers.get("content-type")?.split(";")[0];
      const extension = MIME_EXTENSIONS.get(contentType) || "bin";
      const content = Buffer.from(await response.arrayBuffer());
      const filename = contentAddressedFilename(content, extension);
      await mkdir(imageDir, { recursive: true });
      await writeFile(path.join(imageDir, filename), content);
      return `![${alt}](/images/notion/${slug}/${filename})`;
    }
  );
}
