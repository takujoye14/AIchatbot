import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

let supabase: any;

async function startServer() {
  dotenv.config();

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  supabase = createClient(supabaseUrl, supabaseKey);

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // configuration de base
  app.get("/api/health", (req, res) => {
    app.get("/favicon.ico", (req, res) => res.status(204).end());
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    const apiKey = process.env.VITE_MISTRAL_API_KEY;
    let maskedKey = "None";
    if (apiKey && apiKey.length > 8) {
      maskedKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    }
    res.json({ maskedKey });
  });

  // Authentification
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
      return;
    }
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({ username, password_hash: passwordHash })
        .select()
        .single();

      if (userError) throw userError;

      await supabase.from("master_prompts").insert({
        user_id: user.id,
        content: "Tu es un assistant IA intelligent et amical. Tu dois impérativement répondre en français de manière concise.",
        is_active: true
      });

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (err: any) {
      res.status(500).json({ error: "Erreur inscription", details: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !user) {
        res.status(400).json({ error: "Identifiants incorrects." });
        return;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        res.status(400).json({ error: "Identifiants incorrects." });
        return;
      }

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (err) {
      res.status(500).json({ error: "Erreur authentification" });
    }
  });

  // Conversations
  app.get("/api/conversations", async (req, res) => {
    const userId = req.query.userId as string;
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: "Impossible de charger les discussions" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    const { userId, title } = req.body;
    const conversationTitle = title || "Nouvelle discussion";
    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: conversationTitle })
        .select();

      if (error) throw error;

      const responseData = data && data.length > 0 ? data[0] : { 
        id: crypto.randomUUID(), 
        user_id: userId, 
        title: conversationTitle,
        created_at: new Date().toISOString()
      };
      res.json(responseData);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur création discussion", details: err.message });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: "Erreur messages" });
    }
  });

  // Prompt global / utilisateur
  app.get("/api/prompt", async (req, res) => {
    const userId = req.query.userId as string;
    try {
      const { data, error } = await supabase
        .from("master_prompts")
        .select("content")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      res.json({ masterPrompt: data?.content || "Tu es un assistant IA." });
    } catch (err) {
      res.json({ masterPrompt: "Tu es un assistant IA." });
    }
  });

  app.post("/api/prompt", async (req, res) => {
    const { userId, prompt } = req.body;
    try {
      await supabase.from("master_prompts").update({ is_active: false }).eq("user_id", userId);
      await supabase.from("master_prompts").insert({ user_id: userId, content: prompt, is_active: true });
      res.json({ success: true, masterPrompt: prompt });
    } catch (err) {
      res.status(500).json({ error: "Erreur prompt" });
    }
  });

  // Proxy Chat Completions
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, conversationId, userId, model = "mistral-small-latest", temperature = 0.7, max_tokens = 2048, stream = false } = req.body;

      if (!messages || !conversationId || !userId) {
        res.status(400).json({ error: "Champs requis manquants" });
        return;
      }

      const apiKey = process.env.VITE_MISTRAL_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Clé manquante" });
        return;
      }

      const { data: promptData } = await supabase
        .from("master_prompts")
        .select("content")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      const systemPrompt = promptData?.content || "Tu es un assistant IA.";
      const cleanMessages = messages.filter((m: any) => m.role !== "system" && m.role !== "developer");
      const finalMessages = [{ role: "system", content: systemPrompt }, ...cleanMessages];

      const lastUserMsg = cleanMessages[cleanMessages.length - 1];
      if (lastUserMsg && lastUserMsg.role === "user") {
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: lastUserMsg.content });
      }

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: finalMessages, temperature, max_tokens, stream })
      });

      if (!response.ok) {
        const txt = await response.text();
        res.status(response.status).json({ error: "Erreur Mistral", details: txt });
        return;
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        if (!response.body) { res.end(); return; }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
            fullReply += chunk;
          }

          if (fullReply) {
            const lines = fullReply.split("\n");
            let cleanText = "";
            for (const line of lines) {
              if (line.trim().startsWith("data: ") && !line.includes("[DONE]")) {
                try {
                  const p = JSON.parse(line.trim().substring(6));
                  cleanText += p.choices?.[0]?.delta?.content || "";
                } catch (e) {}
              }
            }
            if (cleanText) {
              await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: cleanText });
            }
          }
        } catch (e) {
        } finally {
          res.end();
        }
      } else {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: reply });
        }
        res.json(data);
      }
    } catch (err: any) {
      res.status(500).json({ error: "Erreur interne", details: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();