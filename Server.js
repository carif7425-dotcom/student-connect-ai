

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (
    req.method === "POST" &&
    (req.url === "/api/generate-notes" ||
     req.url === "/.netlify/functions/generate-notes")
  ) {
    try {
      let body = "";
      for await (const chunk of req) body += chunk;

      const { topic, language } = JSON.parse(body || "{}");
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing in server settings.");
      }

      if (!topic || !topic.trim()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Please enter a topic." }));
      }

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Create clear student-friendly study notes about ${topic}. Write in ${language || "simple English"}. Use a heading, short points, and a simple conclusion.`
              }]
            }]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        res.writeHead(response.status, {
          "Content-Type": "application/json"
        });
        return res.end(JSON.stringify({
          error: data.error?.message || "AI could not generate notes."
        }));
      }

      const notes = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "").join("\n") || "No notes returned.";

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ notes }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: error.message }));
    }
  }

  const requestedPath = req.url.split("?")[0] === "/"
    ? "/index.html"
    : decodeURIComponent(req.url.split("?")[0]);

  const filePath = path.join(__dirname, requestedPath);

  if (!filePath.startsWith(__dirname + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      return res.end("File not found");
    }

    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml"
    };

    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream"
    });
    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Student Connect running on port ${PORT}`);
});
