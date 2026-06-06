const { embedText } = require("./utils/embedder");
const { Pinecone } = require("@pinecone-database/pinecone");
const { v4: uuidv4 } = require("uuid");

let _pineconeClient = null;

function getPineconeClient() {
  if (!_pineconeClient) {
    _pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return _pineconeClient;
}

function getPineconeIndex() {
  return getPineconeClient().index(process.env.PINECONE_INDEX_NAME);
}

async function embedAndStore(chunks, bookId) {
  if (!chunks?.length) {
    throw new Error("No chunks provided for embedding.");
  }

  const index = getPineconeIndex().namespace(bookId);

  const validChunks = chunks.filter(
    (c) => c.pageContent && c.pageContent.trim().length > 30
  );

  if (!validChunks.length) {
    throw new Error("No valid text chunks found.");
  }

  const BATCH_SIZE = 10; 
  let totalUpserted = 0;

  for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
    const batch = validChunks.slice(i, i + BATCH_SIZE);

    let vectors;
    try {
      vectors = await Promise.all(
        batch.map((c) => embedText(c.pageContent))
      );
    } catch (err) {
      throw err;
    }

    const records = vectors
      .map((vec, idx) => {
        if (!Array.isArray(vec) || vec.length !== 384) {
          return null;
        }

        return {
          id: uuidv4(),
          values: vec,
          metadata: {
            text: batch[idx].pageContent.slice(0, 1000),
            page: batch[idx].metadata?.estimatedPage || 1,
          },
        };
      })
      .filter(Boolean);

    if (!records.length) {
      continue;
    }
    console.time("upsert");
    await index.upsert(records);
    console.timeEnd("upsert");
    totalUpserted += records.length;

  }

  return totalUpserted;
}

async function deleteBookVectors(bookId) {
  const index = getPineconeIndex().namespace(bookId);
  await index.deleteAll();
}

async function embedQuery(query) {
  console.time("embedding");
  const vector = await embedText(query);
  console.timeEnd("embedding");

  if (!Array.isArray(vector) || vector.length !== 384) {
    throw new Error("Invalid query embedding");
  }

  return vector;
}

module.exports = {
  embedAndStore,
  deleteBookVectors,
  embedQuery,
  getPineconeIndex,
};