const Groq = require("groq-sdk");
const { embedQuery, getPineconeIndex } = require("./embeddingService");

const RETRIEVE_TOP_K = 15;
const FINAL_TOP_K = 8;
const MIN_SCORE = 0.3;
const MAX_CHUNK_LENGTH = 1000;

let groq = null;

function getGroq() {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
}

/**
 * Retrieve relevant chunks from Pinecone
 */
async function retrieveRelevantChunks(query, bookId) {
  const queryVector = await embedQuery(query);

  const index = getPineconeIndex().namespace(bookId);

  const results = await index.query({
    vector: queryVector,
    topK: RETRIEVE_TOP_K,
    includeMetadata: true,
  });

  if (!results.matches?.length) {
    return [];
  }

  const chunks = results.matches
    .filter(
      (match) =>
        match.score &&
        match.score >= MIN_SCORE &&
        match.metadata?.text
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, FINAL_TOP_K)
    .map((match) => ({
      text: match.metadata.text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CHUNK_LENGTH),

      score: match.score,
      page: match.metadata.page || "Unknown",
    }));

  return chunks;
}

/**
 * Build clean context for LLM
 */
function buildContext(chunks) {
  return chunks
    .map(
      (chunk, index) => `
=== SOURCE ${index + 1} ===
Page: ${chunk.page}
Relevance Score: ${chunk.score.toFixed(3)}

${chunk.text}
`
    )
    .join("\n");
}

/**
 * Generate answer
 */
async function generateAnswer(question, chunks) {
  if (!chunks.length) {
    return {
      answer: "This information is not available in the document.",
      sourcesUsed: [],
    };
  }

  const context = buildContext(chunks);

  try {
    const groq = getGroq();

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",

      temperature: 0.1,

      messages: [
        {
          role: "system",
          content: `
You are an expert PDF Question Answering Assistant.

Your job is to answer questions ONLY from the provided document context.

STRICT RULES:

1. Use ONLY the supplied context.
2. Never use outside knowledge.
3. Never hallucinate.
4. Read ALL sources before answering.
5. Combine information from multiple sources when necessary.
6. Mention page numbers used.
7. If information is partially available, provide what is available.
8. If the answer cannot be found in the context, reply exactly:

"This information is not available in the document."

Response Format:

Answer:
<answer>

Pages:
<page numbers>
`,
        },
        {
          role: "user",
          content: `
DOCUMENT CONTEXT

${context}

QUESTION

${question}
`,
        },
      ],
    });

    const answer =
      completion?.choices?.[0]?.message?.content ||
      "Unable to generate answer.";

    return {
      answer,

      sourcesUsed: chunks.map((chunk) => ({
        pageNumber: chunk.page,
        score: chunk.score.toFixed(3),
        excerpt: chunk.text.slice(0, 150),
      })),
    };
  } catch (error) {
    console.error("Groq Error:", error);

    return {
      answer: "Error generating answer.",
      sourcesUsed: [],
    };
  }
}

/**
 * Main entry point
 */
async function askQuestion(question, bookId) {
  try {
    const chunks = await retrieveRelevantChunks(
      question,
      bookId
    );

    const result = await generateAnswer(
      question,
      chunks
    );

    return {
      ...result,
      chunksRetrieved: chunks.length,
    };
  } catch (error) {
    console.error("Ask Question Error:", error);

    return {
      answer: "Failed to process question.",
      sourcesUsed: [],
      chunksRetrieved: 0,
    };
  }
}

module.exports = {
  askQuestion,
  retrieveRelevantChunks,
};
