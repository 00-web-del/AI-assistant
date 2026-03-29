import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.post("/api/detect", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
      // 1. Call GPTZero if API key is available
      let aiRate = "评估中...";
      if (process.env.GPTZERO_API_KEY) {
        try {
          const gptZeroResponse = await fetch("https://api.gptzero.me/v2/predict/text", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.GPTZERO_API_KEY
            },
            body: JSON.stringify({ document: text.substring(0, 5000) })
          });
          
          if (gptZeroResponse.ok) {
            const gptZeroData = await gptZeroResponse.json();
            if (gptZeroData && gptZeroData.documents && gptZeroData.documents[0]) {
              const prob = gptZeroData.documents[0].completely_generated_prob;
              aiRate = `${(prob * 100).toFixed(1)}% (GPTZero)`;
            }
          }
        } catch (e) {
          console.error("GPTZero API Error:", e);
        }
      }

      // 2. Turnitin Placeholder
      let duplicateRate = "评估中...";
      if (process.env.TURNITIN_API_KEY) {
        duplicateRate = "正在通过 Turnitin 验证...";
      }

      res.json({ aiRate, duplicateRate });
    } catch (error) {
      console.error("Detection Error:", error);
      res.status(500).json({ error: "Failed to run detection" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
