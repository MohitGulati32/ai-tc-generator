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

app.post("/api/generate", async (req, res) => {
  const { story } = req.body;

  if (!story) {
    return res.status(400).json({ error: "No story provided" });
  }

  try {
    const {
      tests,
      evalResult,
      revisionsUsed,
      generationUsage,
      evalUsage,
    } = await generateWithEval(story);

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
    res.status(500).json({ error: "Pipeline failed" });
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

app.listen(3001, () => {
  console.log("API server running on http://localhost:3001");
});
