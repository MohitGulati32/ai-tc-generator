import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import { generateWithEval } from "./scripts/pipeline.js";
import { logEvalResult } from "./scripts/logger.js";

const app = express();
app.use(cors({ origin: "https://tc-generator-five.vercel.app" }));
app.use(express.json());
app.use((req, res, next) => { res.setTimeout(120000); next(); });

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "tc-generator-api" });
});

app.options("/api/generate", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://tc-generator-five.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

app.post("/api/generate", async (req, res) => {
  const { story } = req.body;
res.setHeader("Access-Control-Allow-Origin", "https://tc-generator-five.vercel.app");
res.setHeader("Access-Control-Allow-Credentials", "true");
  if (!story) {
    return res.status(400).json({ error: "No story provided" });
  }

  console.log("Request received:", story.slice(0, 50));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendStatus = (message) => {
    res.write(`event: status\ndata: ${JSON.stringify({ message })}\n\n`);
  };

  const sendResult = (data) => {
    res.write(`event: result\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const sendError = (message) => {
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    res.end();
  };

  try {
    const { tests, evalResult, revisionsUsed, generationUsage, evalUsage } =
      await generateWithEval(story, 2, sendStatus);

    logEvalResult({
      userStory: story,
      generationUsage,
      evalUsage,
      evalResult,
      revisionsUsed,
    });

    sendResult({ tests, evalResult, revisionsUsed, generationTokens: generationUsage.input_tokens + generationUsage.output_tokens, evalTokens: evalUsage.input_tokens + evalUsage.output_tokens });
    res.end();

  } catch (err) {
    console.error("Pipeline error:", err.message);
    sendError("Pipeline failed");
  }
});

app.get("/api/logs", (req, res) => {
  try {
    if (!fs.existsSync("eval_log.jsonl")) {
      return res.json([]);
    }
    const lines = fs.readFileSync("eval_log.jsonl", "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line));
    res.json(lines);
  } catch (err) {
    console.error("Log read error:", err.message);
    res.status(500).json({ error: "Failed to read logs" });
  }
});

app.get("/debug", (req, res) => {
  res.json({
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    apiKeyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
  });
});


app.get("/test-api", async (req, res) => {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello in one word" }]
    });
    res.json({ success: true, response: response.content[0].text });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});
