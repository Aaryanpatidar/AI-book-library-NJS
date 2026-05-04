const Groq = require("groq-sdk");
const { embedQuery, getPineconeIndex } = require("./embeddingService");

const TOP_K = 8;            
const MIN_SCORE = 0.2;      

let groq = null;

function getGroq() {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
}

async function retrieveRelevantChunks(query, bookId) {
  const queryVector = await embedQuery(query);
  const index = getPineconeIndex().namespace(bookId);

  const results = await index.query({
    vector: queryVector,
    topK: TOP_K,
    includeMetadata: true,
  });

  if (!results.matches?.length) return [];

  const sorted = results.matches.sort((a, b) => b.score - a.score);

  const filtered = sorted
    .filter(m => m.score >= MIN_SCORE)
    .slice(0, TOP_K);

  return filtered.map((m) => ({
    text: m.metadata?.text || "",
    score: m.score,
    page: m.metadata?.page || 1,
  }));
}

async function generateAnswer(question, chunks) {
  if (!chunks.length) {
    return {
      answer: "No relevant information found in the document.",
      sourcesUsed: [],
    };
  }

  const context = chunks
    .map((c, i) => 
      `Source ${i + 1} (Page ${c.page}, Score ${c.score.toFixed(2)}):\n${c.text}`
    )
    .join("\n\n");


  const groq = getGroq();

  let response;

  try {
    response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `
You are a helpful document assistant.

RULES:
- Answer using ONLY the provided context
- You MAY summarize or combine information from multiple sources
- If the answer is partially available, provide the best possible answer
- Only say "Answer not found in the document" if the context is completely irrelevant
- Keep the answer clear, structured, and concise
- Do NOT hallucinate or add outside knowledge

Context:
${context}
          `,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0,
    });
  } catch (err) {
    console.error("❌ Groq error:", err.message);
    return {
      answer: "Error generating answer.",
      sourcesUsed: [],
    };
  }

  return {
    answer: response.choices[0].message.content,
    sourcesUsed: chunks.map((c) => ({
      pageNumber: c.page,
      excerpt: c.text.slice(0, 120),
      score: c.score.toFixed(3),
    })),
  };
}

async function askQuestion(question, bookId) {
  
  const chunks = await retrieveRelevantChunks(question, bookId);

  const result = await generateAnswer(question, chunks);

  return {
    ...result,
    chunksRetrieved: chunks.length,
  };
}

module.exports = {
  askQuestion,
  retrieveRelevantChunks,
};