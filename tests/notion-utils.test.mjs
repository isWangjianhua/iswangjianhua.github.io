import assert from "node:assert/strict";
import test from "node:test";
import { NotionToMarkdown } from "notion-to-md";
import {
  frontmatterFor,
  makeSlug,
  normalizeMarkdown,
  renderPostFrontmatter,
} from "../scripts/notion-utils.mjs";

test("makeSlug uses configured slugs and stable page ID fallbacks", () => {
  assert.equal(
    makeSlug("任意标题", "Reliable Agents", "page-id"),
    "reliable-agents"
  );
  assert.equal(makeSlug("纯中文标题", "", "12345678-abcd"), "12345678abcd");
});

test("normalizeMarkdown removes Notion-only placeholder blocks", () => {
  const markdown = [
    '<table_of_contents color="gray"/>',
    "",
    '## 标题 {color="blue"}',
    "",
    "<empty-block/>",
  ].join("\n");
  assert.equal(normalizeMarkdown(markdown), "## 标题");
});

test("normalizeMarkdown removes empty quotes", () => {
  assert.equal(normalizeMarkdown(">\n\n# 标题"), "# 标题");
});

test("normalizeMarkdown moves a leading link-only quote to references", () => {
  const markdown = [
    "> [Learn Claude Code](https://learn.shareai.run/zh/)<br>[CoreCoder](https://github.com/he-yufeng/CoreCoder)",
    "",
    "---",
    "",
    "# AgentLoop",
  ].join("\n");

  assert.equal(
    normalizeMarkdown(markdown),
    [
      "---",
      "",
      "# AgentLoop",
      "",
      "## 参考资料",
      "",
      "- [Learn Claude Code](https://learn.shareai.run/zh/)",
      "- [CoreCoder](https://github.com/he-yufeng/CoreCoder)",
    ].join("\n")
  );

  const multilineQuote = [
    "> [Learn Claude Code](https://learn.shareai.run/zh/)",
    "> [CoreCoder](https://github.com/he-yufeng/CoreCoder)",
    "",
    "# AgentLoop",
  ].join("\n");
  assert.match(normalizeMarkdown(multilineQuote), /## 参考资料/);
});

test("normalizeMarkdown preserves regular AstroPaper quotes", () => {
  const markdown = [
    "> 关键结论",
    "> - [相关资料](https://example.com)",
    "",
    "# 正文",
  ].join("\n");

  assert.equal(normalizeMarkdown(markdown), markdown);
});

test("notion-to-md keeps quote children as quoted Markdown lists", () => {
  const converter = new NotionToMarkdown({ notionClient: {} });
  const output = converter.toMarkdownString([
    {
      blockId: "quote",
      type: "quote",
      parent: ">",
      children: [
        {
          blockId: "bullet",
          type: "bulleted_list_item",
          parent: "- **版本控制**：精通 Git",
          children: [],
        },
      ],
    },
  ]).parent;

  assert.match(output, /> - \*\*版本控制\*\*：精通 Git/);
  assert.doesNotMatch(output, /^ {4}-/m);
});

test("frontmatterFor maps the posts database properties", () => {
  const page = {
    id: "39a313b1-9d45-803c-87f5-f66112e6b065",
    created_time: "2026-07-11T01:00:00.000Z",
    last_edited_time: "2026-07-11T02:00:00.000Z",
    properties: {
      名称: {
        type: "title",
        title: [{ plain_text: "Agent 工程笔记" }],
      },
      Description: {
        type: "rich_text",
        rich_text: [{ plain_text: "从实验到可靠系统。" }],
      },
      Slug: {
        type: "rich_text",
        rich_text: [{ plain_text: "agent-engineering" }],
      },
      发布日期: { type: "date", date: { start: "2026-07-11" } },
      Tags: {
        type: "multi_select",
        multi_select: [{ name: "Agent" }, { name: "软件工程" }],
      },
      Author: { type: "people", people: [{ name: "Wang Jianhua" }] },
    },
  };

  assert.deepEqual(frontmatterFor(page), {
    title: "Agent 工程笔记",
    description: "从实验到可靠系统。",
    author: "Wang Jianhua",
    pubDatetime: "2026-07-11T00:00:00+08:00",
    modDatetime: "2026-07-11T02:00:00.000Z",
    tags: ["Agent", "软件工程"],
    slug: "agent-engineering",
  });
});

test("renderPostFrontmatter produces AstroPaper-compatible fields", () => {
  const output = renderPostFrontmatter({
    title: "Agent 工程笔记",
    description: "摘要",
    author: "Wang Jianhua",
    pubDatetime: "2026-07-11T00:00:00+08:00",
    modDatetime: "2026-07-11T02:00:00.000Z",
    tags: ["Agent"],
  });

  assert.match(output, /draft: false/);
  assert.match(output, /tags: \["Agent"\]/);
  assert.match(output, /title: "Agent 工程笔记"/);
});
