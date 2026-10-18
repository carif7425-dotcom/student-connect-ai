exports.handler = async (event) => {
const headers = {
"Content-Type": "application/json; charset=utf-8",
"Cache-Control": "no-store"
};

if (event.httpMethod === "OPTIONS") {
return { statusCode: 204, headers, body: "" };
}
if (event.httpMethod !== "POST") {
return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed." }) };
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
return {
statusCode: 500, headers,
body: JSON.stringify({ error: "OPENAI_API_KEY is missing. Add it in Netlify environment variables and redeploy." })
};
}

let input;
try {
input = JSON.parse(event.body || "{}");
} catch {
return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request." }) };
}

const topic = String(input.topic || "").trim().slice(0, 180);
const kind = String(input.kind || "study notes").slice(0, 60);
const language = String(input.language || "simple English with Urdu explanation").slice(0, 100);
const level = String(input.level || "").trim().slice(0, 120);

if (!topic) {
return { statusCode: 400, headers, body: JSON.stringify({ error: "Please enter a topic." }) };
}

const instructions = [
"You are a friendly study assistant for college students in India.",
"Create accurate, well-organized educational content in the requested format.",
"Use clear headings, short paragraphs, numbered points, and examples when helpful.",
"Use student-friendly wording. Do not invent citations or claim certainty when unsure.",
"If the user requests Urdu explanation, explain key points in accessible Urdu script; if Roman Urdu is requested, use Roman Urdu.",
"For hospital administration topics, distinguish general educational information from medical advice."
].join(" ");

const prompt = Prepare ${kind} on the topic: "${topic}".\n +
Requested language: ${language}.\n +
Course/class: ${level || "not specified"}.\n +
Include a suitable title, introduction, definition where relevant, key points/functions/objectives where relevant, an example, and a short conclusion.  +
Match the requested format and avoid unnecessary complexity.;

try {
const apiResponse = await fetch("https://api.openai.com/v1/responses", {
method: "POST",
headers: {
"Authorization": Bearer ${apiKey},
"Content-Type": "application/json"
},
body: JSON.stringify({
model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
instructions,
input: prompt,
max_output_tokens: 1800
})
});

const result = await apiResponse.json().catch(() => ({}));  
if (!apiResponse.ok) {  
  const message = result && result.error && result.error.message  
    ? result.error.message  
    : "The AI service could not complete the request.";  
  return { statusCode: apiResponse.status === 429 ? 429 : 502, headers,  
    body: JSON.stringify({ error: message }) };  
}  

let notes = "";  
if (typeof result.output_text === "string") {  
  notes = result.output_text;  
} else if (Array.isArray(result.output)) {  
  notes = result.output.flatMap(item => Array.isArray(item.content) ? item.content : [])  
    .filter(part => part.type === "output_text" && part.text)  
    .map(part => part.text).join("\n");  
}  

if (!notes) {  
  return { statusCode: 502, headers, body: JSON.stringify({ error: "The AI returned an empty response. Please try again." }) };  
}  
return { statusCode: 200, headers, body: JSON.stringify({ notes }) };

} catch (error) {
return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not connect to the AI service. Please try again." }) };
}
};
