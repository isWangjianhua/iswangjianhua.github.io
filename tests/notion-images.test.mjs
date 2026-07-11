import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  contentAddressedFilename,
  downloadImages,
} from "../scripts/notion-images.mjs";

const images = new Map([
  ["https://example.com/first.svg", "<svg>first</svg>"],
  ["https://example.com/second.svg", "<svg>second</svg>"],
  ["https://example.com/third.svg", "<svg>third</svg>"],
]);

function delayedFetch(delays) {
  return async url => {
    await new Promise(resolve => setTimeout(resolve, delays.get(url) || 0));
    return new Response(images.get(url), {
      headers: { "content-type": "image/svg+xml" },
    });
  };
}

test("downloadImages is stable when downloads finish out of order", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "notion-images-"));
  const markdown = [...images.keys()]
    .map((url, index) => `![image ${index + 1}](${url})`)
    .join("\n");

  try {
    const first = await downloadImages(markdown, "post", {
      fetchImpl: delayedFetch(
        new Map([
          ["https://example.com/first.svg", 30],
          ["https://example.com/second.svg", 20],
          ["https://example.com/third.svg", 10],
        ])
      ),
      imagesDir: path.join(root, "first-run"),
    });
    const second = await downloadImages(markdown, "post", {
      fetchImpl: delayedFetch(
        new Map([
          ["https://example.com/first.svg", 10],
          ["https://example.com/second.svg", 20],
          ["https://example.com/third.svg", 30],
        ])
      ),
      imagesDir: path.join(root, "second-run"),
    });

    assert.equal(first, second);

    const expectedFiles = [...images.values()]
      .map(content => contentAddressedFilename(Buffer.from(content), "svg"))
      .sort();
    assert.deepEqual(
      (await readdir(path.join(root, "first-run", "post"))).sort(),
      expectedFiles
    );
    assert.deepEqual(
      (await readdir(path.join(root, "second-run", "post"))).sort(),
      expectedFiles
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
