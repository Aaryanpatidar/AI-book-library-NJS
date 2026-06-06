const fs = require("fs");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
// 1. Import your newly updated embedding service
const { embedAndStore } = require("./embeddingService");

async function getFileBuffer(filePath) {
  if (filePath.startsWith("http")) {
    const response = await axios({
      url: filePath,
      method: "GET",
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data);
  }

  return fs.readFileSync(filePath);
}

async function extractTextFromPDF(filePath) {
  const buffer = await getFileBuffer(filePath);

  const data = await pdfParse(buffer);

  const text = cleanText(data.text);

  return {
    text,
    pageCount: data.numpages || 1,
  };
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .trim();
}

async function splitIntoChunks(text, bookId, pageCount) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: [
      "\n\n",
      "\n",
      ". ",
      "! ",
      "? ",
      " ",
      "",
    ],
  });

  const docs = await splitter.createDocuments([text]);

  return docs.map((doc, index) => ({
    pageContent: doc.pageContent,
    metadata: {
      bookId,
      chunkIndex: index,
      page: Math.max(
        1,
        Math.round((index / Math.max(docs.length, 1)) * pageCount)
      ),
      totalChunks: docs.length,
    },
  }));
}

/**
 * Main RAG ingestion entry point.
 * Extracts, chunks, and uploads vectors directly to Pinecone.
 */
async function processPDF(filePath, bookId) {
  // 2. Extract raw text details
  const { text, pageCount } = await extractTextFromPDF(filePath);

  if (!text || text.length < 30) {
    throw new Error(
      "Could not extract readable text. PDF may be scanned/image-based."
    );
  }

  console.time("Chunking Process");
  const chunks = await splitIntoChunks(text, bookId, pageCount);
  console.timeEnd("Chunking Process");

  console.log(`[Processor] Pages parsed: ${pageCount}`);
  console.log(`[Processor] Semantic chunks created: ${chunks.length}`);

  console.log(`\n[Pipeline] Initializing database synchronization for Book ID: ${bookId}...`);
  
  // 3. Hand off the chunks array directly to your database service
  // This executes your sequential free-tier safe loop and upserts to Pinecone
  const totalVectorsStored = await embedAndStore(chunks, bookId);

  return {
    success: true,
    pageCount,
    totalChunks: chunks.length,
    totalVectorsStored,
  };
}

module.exports = {
  processPDF,
};