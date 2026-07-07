import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const DEFAULT_MISTRAL_KEY = "WYO4L8qPITkvhK3qfpdGvG4HYLbbntEc";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // In-memory master prompt store with a default helpful message
  let masterPrompt = "Tu es un assistant IA intelligent et amical. Tu dois impérativement répondre en français de manière concise.";

  // Middleware for parsing JSON bodies
  app.use(express.json());

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Get active masked API key
  app.get("/api/config", (req, res) => {
    const apiKey = DEFAULT_MISTRAL_KEY || process.env.MISTRAL_API_KEY;
    let maskedKey = "None";
    if (apiKey && apiKey.length > 8) {
      maskedKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    }
    res.json({ maskedKey });
  });

  // API Route: Get current master prompt
  app.get("/api/prompt", (req, res) => {
    res.json({ masterPrompt });
  });

  // API Route: Set master prompt (authorized update)
  app.post("/api/prompt", (req, res) => {
    const { prompt } = req.body;
    if (typeof prompt !== "string") {
      res.status(400).json({ error: "Le prompt doit être une chaîne de caractères valide." });
      return;
    }
    masterPrompt = prompt;
    res.json({ success: true, masterPrompt });
  });

  // API Route: Proxy Mistral Chat completions
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model = "mistral-small-latest", temperature = 0.7, max_tokens = 2048, stream = false } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Champs 'messages' manquant ou invalide dans le corps de la requête." });
        return;
      }

      const apiKey = DEFAULT_MISTRAL_KEY || process.env.MISTRAL_API_KEY;

      if (!apiKey) {
        res.status(500).json({ error: "La clé API Mistral n'est pas configurée." });
        return;
      }

      // Enforce the master prompt by prepending it as a system message
      const systemMessage = { role: "system", content: masterPrompt };
      // Filter out other existing system messages to avoid conflicts
      const cleanMessages = messages.filter((m: any) => m.role !== "system" && m.role !== "developer");
      const finalMessages = [systemMessage, ...cleanMessages];

      // Call Mistral API
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: finalMessages,
          temperature,
          max_tokens,
          stream
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Mistral API error response:", errorText);
        res.status(response.status).json({
          error: "L'API Mistral a renvoyé une erreur.",
          details: errorText
        });
        return;
      }

      if (stream) {
        // Set standard Server-Sent Events headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        if (!response.body) {
          res.write("data: [ERROR]\n\n");
          res.end();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunkText = decoder.decode(value, { stream: true });
            res.write(chunkText);
          }
        } catch (streamErr: any) {
          console.error("Error writing stream to client:", streamErr);
        } finally {
          res.end();
        }
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error: any) {
      console.error("Exception in /api/chat handler:", error);
      res.status(500).json({ error: "Erreur interne du serveur.", details: error.message });
    }
  });

  // Vite middleware for serving frontend assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
