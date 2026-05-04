require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function test() {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // ✅ free + fast
      messages: [
        { role: "user", content: "Explain AI in one sentence" }
      ],
    });

    console.log("✅ Groq working:");
    console.log(response.choices[0].message.content);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

test();