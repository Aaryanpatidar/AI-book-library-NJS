const { embedText } = require("./utils/embedder");
const { Pinecone } = require("@pinecone-database/pinecone");
const { v4: uuidv4 } = require("uuid");

let _pineconeClient = null;

function getPineconeClient() {
  if (!_pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("Missing PINECONE_API_KEY environment variable.");
    }
    _pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return _pineconeClient;
}

function getPineconeIndex() {
  if (!process.env.PINECONE_INDEX_NAME) {
    throw new Error("Missing PINECONE_INDEX_NAME environment variable.");
  }
  return getPineconeClient().index(process.env.PINECONE_INDEX_NAME);
}

async function embedAndStore(chunks, bookId) {
  if (!chunks?.length) {
    throw new Error("No chunks provided for embedding.");
  }

  const index = getPineconeIndex().namespace(String(bookId));

  // Ensure chunks align with LangChain structures (checking pageContent or text properties)
  const validChunks = chunks.filter(
    (c) => {
      const content = c.pageContent || c.text;
      return content && content.trim().length > 30;
    }
  );

  if (!validChunks.length) {
    throw new Error("No valid text chunks found after filtering.");
  }

  console.log(`[Embedder] Total Processable Chunks: ${validChunks.length}`);

  // Reduced batch size to safely protect free-tier API rate metrics
  const BATCH_SIZE = 15;
  let totalUpserted = 0;
  const totalBatches = Math.ceil(validChunks.length / BATCH_SIZE);

  for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const batch = validChunks.slice(i, i + BATCH_SIZE);

    console.log(`[Processing] Syncing batch ${batchNumber}/${totalBatches}`);
    console.time(`Batch-Performance-${batchNumber}`);

    const records = [];

    // Process strings sequentially to satisfy the 15 RPM Free Tier ceiling safely
    for (let idx = 0; idx < batch.length; idx++) {
      const chunk = batch[idx];
      const textToEmbed = chunk.pageContent || chunk.text;

      try {
        // Compute vector array mapping sequentially
        const vec = await embedText(textToEmbed);

        if (Array.isArray(vec) && vec.length > 0) {
          records.push({
            id: uuidv4(),
            values: vec,
            metadata: {
              bookId: String(bookId), // Appended for cross-document query capabilities
              text: textToEmbed,     // Retains full text slice context for Gemini prompts
              page: chunk.metadata?.page || 1,
              chunkIndex: chunk.metadata?.chunkIndex || (i + idx),
            },
          });
        }
      } catch (apiError) {
        console.error(`\n[API Error] Failed to generate embedding for chunk index ${i + idx}:`, apiError.message);
        // Bubble the exception up to update the frontend polling loop status with an "error" state
        throw new Error(`Embedding calculation failed at item ${i + idx}: ${apiError.message}`);
      }
    }

    if (!records.length) {
      console.timeEnd(`Batch-Performance-${batchNumber}`);
      continue;
    }

    try {
      // Upsert record payloads to Pinecone Index Cluster
      await index.upsert(records);
      totalUpserted += records.length;
    } catch (pineconeError) {
      console.error(`\n[Database Error] Pinecone synchronization failed at Batch ${batchNumber}:`, pineconeError.message);
      throw new Error(`Pinecone Storage Rejected Upload: ${pineconeError.message}`);
    }

    console.timeEnd(`Batch-Performance-${batchNumber}`);
  }

  console.log(`[Success] Storage process finished. Total vectors synced: ${totalUpserted}`);
  return totalUpserted;
}

async function deleteBookVectors(bookId) {
  const index = getPineconeIndex().namespace(String(bookId));
  await index.deleteAll();
}

async function embedQuery(query) {
  const vector = await embedText(query);

  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Invalid query embedding array received from model backend.");
  }

  return vector;
}

module.exports = {
  embedAndStore,
  deleteBookVectors,
  embedQuery,
  getPineconeIndex,
};