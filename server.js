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

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "tc-generator-api" });
});

app.post("/api/generate", async (req, res) => {
  const { story } = req.body;

  if (!story) {
    return res.status(400).json({ error: "No story provided" });
  }

  console.log("Request received:", story.slice(0, 50));

  try {
    console.log("Importing pipeline...");
    const { generateWithEval } = await import("./scripts/pipeline.js");
    console.log("Pipeline imported, starting generation...");

    const {
      tests,
      evalResult,
      revisionsUsed,
      generationUsage,
      evalUsage,
    } = await generateWithEval(story);

    console.log("Generation complete, logging...");
    const { logEvalResult } = await import("./scripts/logger.js");
    logEvalResult({
      userStory: story,
      generationUsage,
      evalUsage,
      evalResult,
      revisionsUsed,
    });

    res.json({ tests, evalResult, revisionsUsed });

  } catch (err) {
    console.error("Pipeline error:", err.message);
    console.error(err.stack);
    res.status(500).json({ error: err.message });
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
