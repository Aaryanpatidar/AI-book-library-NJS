const fs = require("fs");
const path = require("path");
const axios = require("axios");
const pdfParse = require("pdf-parse");

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 120;

// ─── DOWNLOAD PDF IF URL ────────────────────────────────
async function getFileBuffer(filePath) {
  // If Cloudinary URL
  if (filePath.startsWith("http")) {
    const response = await axios({
      url: filePath,
      method: "GET",
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data);
  }

  // Local file
  return fs.readFileSync(filePath);
}

// ─── EXTRACT TEXT ───────────────────────────────────────
async function extractTextFromPDF(filePath) {
  const buffer = await getFileBuffer(filePath);

  const data = await pdfParse(buffer);

  const text = cleanText(data.text);
  const pageCount = data.numpages;

  return { text, pageCount };
}

// ─── CLEAN TEXT ─────────────────────────────────────────
function cleanText(rawText) {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/Page\s*\d+/gi, "")
    .replace(/^\d+$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── SPLIT INTO CHUNKS ──────────────────────────────────
function splitIntoChunks(text, bookId, pageCount) {
  const words = text.split(" ").filter(Boolean);
  const chunks = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    const chunkWords = words.slice(start, end);
    const chunkText = chunkWords.join(" ");

    if (chunkText.length < 80) {
      start += CHUNK_SIZE - CHUNK_OVERLAP;
      continue;
    }

    const progress = start / words.length;
    const estimatedPage = Math.max(
      1,
      Math.min(pageCount, Math.round(progress * pageCount))
    );

    chunks.push({
      pageContent: chunkText,
      metadata: {
        bookId,
        chunkIndex,
        page: estimatedPage,
        wordCount: chunkWords.length,
      },
    });

    chunkIndex++;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

// ─── MAIN PROCESS ───────────────────────────────────────
async function processPDF(filePath, bookId) {
  const { text, pageCount } = await extractTextFromPDF(filePath);

  if (!text || text.length < 30) {
    throw new Error(
      "❌ Could not extract readable text. PDF may be scanned/image-based."
    );
  }

  const chunks = splitIntoChunks(text, bookId, pageCount);

  return { chunks, pageCount };
}

module.exports = { processPDF };