import { Client } from "@notionhq/client";

export const DATA_SOURCE_ID =
  process.env.NOTION_DATA_SOURCE_ID || "2fc313b1-9d45-81d1-94aa-000b0163459a";

export function createNotionClient() {
  const token = process.env.NOTION_API_SECRET;
  return token ? new Client({ auth: token }) : null;
}

export async function queryPagesByStatus(notion, statuses) {
  const pages = [];
  let cursor;

  do {
    const response = await notion.dataSources.query({
      data_source_id: DATA_SOURCE_ID,
      filter: {
        or: statuses.map(status => ({
          property: "发布状态",
          select: { equals: status },
        })),
      },
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      start_cursor: cursor,
      page_size: 100,
      result_type: "page",
    });
    pages.push(
      ...response.results.filter(
        result => result.object === "page" && "properties" in result
      )
    );
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return pages;
}
