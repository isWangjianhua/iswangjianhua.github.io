const DEFAULT_AUTHOR = "Wang Jianhua";

export function richTextValue(property) {
  const items =
    property?.type === "title" ? property.title : property?.rich_text;
  return Array.isArray(items)
    ? items.map(item => item.plain_text ?? "").join("")
    : "";
}

export function selectValue(property) {
  return property?.type === "select" ? (property.select?.name ?? "") : "";
}

export function dateValue(property, fallback) {
  const value = property?.type === "date" ? property.date?.start : null;
  if (!value) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value;
}

export function tagsValue(property) {
  return property?.type === "multi_select"
    ? property.multi_select.map(option => option.name)
    : [];
}

export function authorValue(property) {
  if (property?.type !== "people" || property.people.length === 0) {
    return DEFAULT_AUTHOR;
  }
  return property.people[0].name || DEFAULT_AUTHOR;
}

export function makeSlug(title, configuredSlug, pageId) {
  const candidate = configuredSlug || title;
  const normalized = candidate
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || pageId.replaceAll("-", "").slice(0, 12);
}

export function renderNotionCodeBlock(block) {
  const code = block?.code;
  const content = Array.isArray(code?.rich_text)
    ? code.rich_text.map(item => item.plain_text ?? "").join("")
    : "";
  const longestBacktickRun = Math.max(
    0,
    ...(content.match(/`+/g) ?? []).map(run => run.length)
  );
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  const language = code?.language ?? "";

  return `${fence}${language}\n${content}\n${fence}`;
}

export function normalizeMarkdown(markdown) {
  const cleaned = markdown
    .replace(
      /^---[ \t]*\n(?:[ \t]*\n)*<table_of_contents[^>]*\/>[ \t]*\n(?:[ \t]*\n)*---[ \t]*$/gm,
      "## Table of contents"
    )
    .replace(
      /^<table_of_contents[^>]*\/>[ \t]*$/gm,
      "## Table of contents"
    )
    .replace(/^<empty-block\/>\s*$/gm, "")
    .replace(/^(#{1,6}\s+.+?)\s+\{color="[^"]+"\}\s*$/gm, "$1");
  const lines = cleaned.split("\n");
  const output = [];
  const references = [];
  let beforeFirstHeading = true;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{1,6}\s/.test(line)) beforeFirstHeading = false;

    if (!/^>/.test(line)) {
      output.push(line);
      continue;
    }

    const quoteLines = [];
    while (index < lines.length && /^>/.test(lines[index])) {
      quoteLines.push(lines[index]);
      index += 1;
    }
    index -= 1;

    const quoteParts = quoteLines
      .map(quoteLine => quoteLine.replace(/^>\s?/, ""))
      .join("\n")
      .split(/<br\s*\/?>|\n/i)
      .map(part => part.trim())
      .filter(Boolean);

    if (quoteParts.length === 0) continue;

    const links = quoteParts.map(part =>
      part.match(/^(?:[-*+]\s+)?(\[[^\]]+\]\(.+\))$/)?.[1]
    );
    if (beforeFirstHeading && links.every(Boolean)) {
      references.push(...links);
      continue;
    }

    output.push(...quoteLines);
  }

  const body = output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (references.length === 0) return body;
  const referenceList = references.map(link => `- ${link}`).join("\n");
  return `${body}\n\n## 参考资料\n\n${referenceList}`;
}

export function frontmatterFor(page) {
  const properties = page.properties;
  const title = richTextValue(properties["名称"]) || "未命名文章";
  const description = richTextValue(properties.Description) || title;
  const publishedAt = dateValue(properties["发布日期"], page.created_time);
  const tags = tagsValue(properties.Tags);

  return {
    title,
    description,
    author: authorValue(properties.Author),
    pubDatetime: publishedAt,
    modDatetime: page.last_edited_time,
    tags: tags.length > 0 ? tags : ["其他"],
    slug: makeSlug(title, richTextValue(properties.Slug), page.id),
  };
}

export function renderPostFrontmatter(post) {
  return [
    "---",
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.description)}`,
    `author: ${JSON.stringify(post.author)}`,
    `pubDatetime: ${post.pubDatetime}`,
    `modDatetime: ${post.modDatetime}`,
    "featured: false",
    "draft: false",
    `tags: ${JSON.stringify(post.tags)}`,
    "---",
  ].join("\n");
}
