const { pipeline } = require("@xenova/transformers");

let extractor = null;
let loadingPromise = null;

async function getExtractor() {
  if (extractor) return extractor;

  if (!loadingPromise) {
    loadingPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }

  extractor = await loadingPromise;
  return extractor;
}

function cleanInput(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();
}

async function embedText(text) {
  const cleanText = cleanInput(text);

  if (!cleanText) {
    throw new Error("Empty text provided for embedding");
  }

  const extractor = await getExtractor();

  const result = await extractor(cleanText, {
    pooling: "mean",
    normalize: true,
  });

  const vector = Array.from(result.data);

  if (!vector || vector.length !== 384) {
    throw new Error("Invalid embedding generated");
  }

  return vector;
}

module.exports = { embedText };