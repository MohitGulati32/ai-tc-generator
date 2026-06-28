import dotenv from "dotenv";
dotenv.config();

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import path from "path";

const client = new Anthropic();

export async function evaluateTestSuite(userStory, generatedTests) {
  const evalPrompt = `You are a QA lead and LLM output evaluator.
Review this generated test suite against the original user story.
Return valid JSON only. No markdown, no backticks, no extra text.
{
  "dimension_scores": {
    "coverage": 0,
    "specificity": 0,
    "api_completeness": 0,
    "edge_case_depth": 0,
    "hallucination_risk": 0
  },
  "overall_quality_score": 0,
  "missing_scenarios": [],
  "duplicate_tests": [],
  "vague_steps": [],
  "hallucination_flags": [],
  "recommendation": "approve",
  "revision_notes": ""
}
Replace all 0 values and empty arrays with your actual evaluation.
dimension scores and overall_quality_score are integers from 0 to 100.
hallucination_risk: 100 means clean output, 0 means likely hallucinated.
recommendation must be exactly one of: approve, revise, reject.`;

  const evalResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `User story: ${userStory}\n\nGenerated tests: ${JSON.stringify(
          generatedTests
        )}\n\n${evalPrompt}`,
      },
    ],
  });

  if (evalResponse.stop_reason === "max_tokens") {
    console.warn("WARNING: Evaluator hit max_tokens - response may be truncated");
  }

  const rawText = evalResponse.content[0].text;
  const clean = rawText.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error("Evaluator JSON parse failed. Raw output:");
    console.error(rawText);
    throw new Error("Evaluator returned invalid JSON");
  }

  return {
    result: parsed,
    usage: evalResponse.usage,
    stop_reason: evalResponse.stop_reason,
  };
}

// RAG triad evaluation - scores the quality of the RAG pipeline output
// Called from pipeline.js after generation, uses retrieved_context from generator
export function evaluateRagTriad(userStory, retrievedContext, generatedOutput) {
  if (!retrievedContext) {
    console.warn("RAG triad skipped: no retrieved context available");
    return null;
  }

  try {
    const ragDir = path.join(process.cwd(), "rag");
    const payload = JSON.stringify({
      user_story: userStory,
      retrieved_context: retrievedContext,
      generated_output: generatedOutput
    });

    const escaped = payload.replace(/'/g, "'\\''");

    const env = {
      ...process.env,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
    };

    console.log("RAG eval - API key present:", !!env.ANTHROPIC_API_KEY);

    const result = execSync(
  `./.venv/bin/python3 evaluate_rag.py '${escaped}'`,
  { cwd: ragDir, encoding: "utf8", env }
);

    return JSON.parse(result);
  } catch (err) {
    console.warn("RAG triad evaluation failed:", err.message);
    console.warn("Full error:", err.stderr);
    return null;
  }
}