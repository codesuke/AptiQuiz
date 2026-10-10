import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const kitRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function collectAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const assets = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      assets.push(...await collectAssets(path));
    } else if (entry.isFile() && entry.name !== "manifest.json") {
      const data = await readFile(path);
      const asset = {
        path: relative(kitRoot, path).replaceAll("\\", "/"),
        bytes: data.length,
        sha256: createHash("sha256").update(data).digest("hex"),
      };
      if (entry.name.endsWith(".png") && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        asset.width = data.readUInt32BE(16);
        asset.height = data.readUInt32BE(20);
      }
      assets.push(asset);
    }
  }
  return assets;
}

const assets = await collectAssets(kitRoot);
await writeFile(join(kitRoot, "manifest.json"), `${JSON.stringify({ name: "AptiQuiz authentication UI kit", schemaVersion: 1, assets }, null, 2)}\n`);
console.log(`Inventoried ${assets.length} AptiQuiz assets.`);
