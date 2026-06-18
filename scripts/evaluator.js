import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

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
