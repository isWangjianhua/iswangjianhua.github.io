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

export function normalizeMarkdown(markdown) {
  return markdown
    .replace(/^<table_of_contents[^>]*\/>\s*$/gm, "")
    .replace(/^<empty-block\/>\s*$/gm, "")
    .replace(/^(#{1,6}\s+.+?)\s+\{color="[^"]+"\}\s*$/gm, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
