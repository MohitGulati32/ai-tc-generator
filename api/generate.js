import { generateWithEval } from "../scripts/pipeline.js";
import { logEvalResult } from "../scripts/logger.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
}
