const Groq = require("groq-sdk");
const { embedQuery, getPineconeIndex } = require("./embeddingService");

const RETRIEVE_TOP_K = 10;
const FINAL_TOP_K = 6;
// Adjusted score safety margin or removed strict truncating to prevent false negatives
const MIN_SCORE = 0.15; 
const MAX_CHUNK_LENGTH = 1200;

let groq = null;

function getGroq() {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY environment variable configuration.");
    }
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
}

/**
 * 🧠 Conversational Query Rewriter
 * Intercepts short follow-up responses, evaluates the historical thread,
 * and compiles a complete, standalone description string for Pinecone vector matching.
 */
async function rewriteQuery(question, chatHistory = []) {
  // If there is no previous conversation history, we don't waste an LLM call
  if (!chatHistory || chatHistory.length === 0) {
    return question;
  }

  try {
    const client = getGroq();

    // Format your application's state arrays to map into standard Groq role message structures
    const formattedMessages = chatHistory.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content || (msg.parts && msg.parts[0]?.text) || ""
    }));

    // Append the latest raw user input statement to the trailing evaluation boundary
    formattedMessages.push({ role: "user", content: question });

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0, // Enforces deterministic, non-creative rewrites
      messages: [
        {
          role: "system",
          content: `You are a query rewriting expert. Based on the provided chat history, rephrase the latest follow-up user question into a complete, standalone question that can be understood entirely on its own without needing the previous history.
          
Do NOT answer the question. Do NOT include greetings or markdown wrappers. Only output the rewritten search query text string and nothing else.`
        },
        ...formattedMessages
      ],
    });

    const rewritten = response?.choices?.[0]?.message?.content?.trim();
    if (rewritten) {
      console.log(`[Rewriter] Transformed: "${question}" ➡️ "${rewritten}"`);
      return rewritten;
    }
    return question;
  } catch (error) {
    console.error("[Rewriter Warning] Resolution failed, reverting to base question:", error.message);
    return question;
  }
}

/**
 * Retrieves context chunks scoped within a specific document namespace
 */
async function retrieveRelevantChunks(question, bookId, chatHistory = []) {
  // 1. Compute context standalone search phrase
  const rewrittenQuery = await rewriteQuery(question, chatHistory);

  // 2. Compute vector representation matching
  const queryVector = await embedQuery(rewrittenQuery);

  // 3. Connect to target isolated document workspace
  const index = getPineconeIndex().namespace(String(bookId));

  const results = await index.query({
    vector: queryVector,
    topK: RETRIEVE_TOP_K,
    includeMetadata: true,
  });

  if (!results.matches?.length) {
    return { chunks: [], targetSearchPhrase: rewrittenQuery };
  }

  const processedChunks = results.matches
    .filter(
      (match) =>
        match.score >= MIN_SCORE &&
        match.metadata?.text
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, FINAL_TOP_K)
    .map((match) => ({
      text: match.metadata.text.replace(/\s+/g, " ").trim().slice(0, MAX_CHUNK_LENGTH),
      page: match.metadata.page || "Unknown",
      score: Number(match.score.toFixed(3)),
    }));

  return {
    chunks: processedChunks,
    targetSearchPhrase: rewrittenQuery
  };
}

/**
 * Builds the structural string block context injected into the System Prompt
 */
function buildContext(chunks) {
  return chunks
    .map(
      (chunk, index) => `--- DOCUMENT SOURCE ${index + 1} (Page Reference: ${chunk.page}) ---\n${chunk.text}`
    )
    .join("\n\n");
}

/**
 * Executes final generation pass
 */
async function generateAnswer(question, chunks, chatHistory = []) {
  if (!chunks || chunks.length === 0) {
    return {
      answer: "I could not find the answer in the provided document.",
      sourcesUsed: [],
    };
  }

  const context = buildContext(chunks);

  try {
    const client = getGroq();

    // Reconstruct long-term history profiles to guide contextual dialog continuity
    const conversationTimeline = chatHistory.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content || (msg.parts && msg.parts[0]?.text) || ""
    }));

    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You have to behave like a Data Structure and Algorithm Expert.
You will be given a context of relevant information extracted from a document along with a user question.
Your task is to answer the user's question based ONLY on the provided context.

Rules:
1. Do NOT draw answers from general or outside training knowledge.
2. If the answer is not contained explicitly within the provided context, you must state exactly: "I could not find the answer in the provided document."
3. Keep your answers clear, concise, and educational.
4. Always cite specific page numbers from the references when providing details.

Context Reference Materials:
${context}`,
        },
        ...conversationTimeline,
        {
          role: "user",
          content: question,
        },
      ],
    });

    const answer = completion?.choices?.[0]?.message?.content || "Unable to generate answer.";

    return {
      answer,
      sourcesUsed: chunks.map((chunk) => ({
        pageNumber: chunk.page,
        score: chunk.score,
        excerpt: chunk.text.slice(0, 150),
      })),
    };
  } catch (error) {
    console.error("[Generation Exception] Groq compilation failure:", error);
    return {
      answer: "An error occurred while generating the response details.",
      sourcesUsed: [],
    };
  }
}

/**
 * Main RAG Module entry interface point exported to Express controller routing hooks
 */
async function askQuestion(question, bookId, chatHistory = []) {
  try {
    // Extract both matching blocks and the resolved contextual standalone statement string
    const { chunks, targetSearchPhrase } = await retrieveRelevantChunks(
      question,
      bookId,
      chatHistory
    );

    // Pass historical session states alongside newly resolved query criteria
    const result = await generateAnswer(targetSearchPhrase, chunks, chatHistory);

    return {
      ...result,
      chunksRetrieved: chunks.length,
      resolvedSearchPhrase: targetSearchPhrase // Retained for state tracing
    };
  } catch (error) {
    console.error("[Main RAG Exception] Critical flow interruption:", error);
    return {
      answer: "Failed to process question due to internal pipeline disruption.",
      sourcesUsed: [],
      chunksRetrieved: 0,
    };
  }
}

module.exports = {
  askQuestion,
  retrieveRelevantChunks,
};