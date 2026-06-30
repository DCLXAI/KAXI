import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { gunzipSync } from "zlib";

const root = process.cwd();
const artifactRoot = join(root, "runtime-artifacts");

const files = [
  {
    artifact: "model-cache/Xenova/multilingual-e5-small/config.json",
    target: "data/model-cache/Xenova/multilingual-e5-small/config.json",
    compressed: false,
  },
  {
    artifact: "model-cache/Xenova/multilingual-e5-small/tokenizer_config.json",
    target: "data/model-cache/Xenova/multilingual-e5-small/tokenizer_config.json",
    compressed: false,
  },
  {
    artifact: "model-cache/Xenova/multilingual-e5-small/tokenizer.json.gz",
    target: "data/model-cache/Xenova/multilingual-e5-small/tokenizer.json",
    compressed: true,
  },
  {
    artifact: "model-cache/Xenova/multilingual-e5-small/onnx/model_quantized.onnx.gz",
    target: "data/model-cache/Xenova/multilingual-e5-small/onnx/model_quantized.onnx",
    compressed: true,
  },
  {
    artifact: "vector-store/embeddings-cache.json",
    target: "data/vector-store/embeddings-cache.json",
    compressed: false,
  },
  {
    artifact: "db/custom.db",
    target: "db/custom.db",
    compressed: false,
  },
] as const;

function restoreFile(entry: (typeof files)[number]) {
  const source = join(artifactRoot, entry.artifact);
  const target = join(root, entry.target);

  if (!existsSync(source) || existsSync(target)) return false;

  mkdirSync(dirname(target), { recursive: true });
  if (entry.compressed) {
    writeFileSync(target, gunzipSync(readFileSync(source)));
  } else {
    copyFileSync(source, target);
  }
  return true;
}

let restored = 0;
for (const file of files) {
  if (restoreFile(file)) restored++;
}

if (restored > 0) {
  console.log(`[restore-runtime-artifacts] restored ${restored} file(s)`);
}
