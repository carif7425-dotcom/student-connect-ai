

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { topic, language } = JSON.parse(event.body || "{}");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "GEMINI_API_KEY is missing in Netlify settings." })
      };
    }

    if (!topic || !topic.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please enter a topic." })
      };
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create clear, student-friendly study notes about: ${topic}. Write in ${language || "simple English"}. Use a heading, short points, and a simple conclusion.`
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: data.error?.message || "Gemini could not generate notes."
        })
      };
    }

    const notes =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n") || "Notes could not be generated.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Server error" })
    };
  }
};


