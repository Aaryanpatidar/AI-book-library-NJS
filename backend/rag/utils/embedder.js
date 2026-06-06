console.log("==========================================");
console.log("🔥 CRITICAL TEST: EMBEDDER.JS IS ALIVE! 🔥");
console.log("==========================================");

const googleAIModule = require("@google/generative-ai");

let aiDocsClient = null;

function getGoogleAIClient() {
  if (!aiDocsClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
    }

    let TargetConstructor = googleAIModule.GoogleGenerativeAI || googleAIModule.GoogleGenAI;

    if (!TargetConstructor && typeof googleAIModule === 'function') {
      TargetConstructor = googleAIModule;
    }

    if (!TargetConstructor) {
      throw new Error("Could not find a valid Google AI constructor class.");
    }

    aiDocsClient = new TargetConstructor(process.env.GEMINI_API_KEY);
  }
  return aiDocsClient;
}

function cleanInput(text) {
  if (!text || typeof text !== "string") return "";
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Generates a clean 1D vector representation using the stable endpoint pathway
 */
/**
 * Generates a clean 1D vector representation using the active endpoint pathway
 */
async function embedText(text) {
  const cleanText = cleanInput(text);

  if (!cleanText || cleanText.length < 3) { 
    console.warn("[Embedder Warning] Input string too short, supplying fallback zero array.");
    return new Array(768).fill(0.0);
  }

  try {
    const ai = getGoogleAIClient();

    // 💡 THE FINAL FIX: Use the active model replacement!
    // We can also safely remove the { apiVersion: "v1" } override.
    const modelInstance = ai.getGenerativeModel({ 
      model: "gemini-embedding-001" 
    });

    // Request vector values calculation
    const result = await modelInstance.embedContent(cleanText);
    const vector = result.embedding?.values;

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("The stable API returned an empty or unparsable vector structure.");
    }

    return vector;
  } catch (error) {
    console.error("[Stable API Exception] Google Embedding calculation failed:", error.message);
    throw error;
  }
}

module.exports = {
  embedText,
};