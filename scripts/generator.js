import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic();

const systemPrompt = `You are a senior QA engineer with 10+ years of experience.
Given a user story, generate a comprehensive test suite.
Always respond with valid JSON only. No markdown, no backticks, no extra text.
{
  "summary": "brief overview of test approach",
  "happy_path": [],
  "edge_cases": [],
  "negative_scenarios": [],
  "api_tests": [],
  "coverage_score": 0,
  "risk_areas": []
}
Each test case must have: id, title, preconditions, steps[], expected_result, priority (P1/P2/P3).
Limit your response to a maximum of 20 test cases total across all categories. Prioritise P1 test cases first.`;

export async function generateTestCases(userStory) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [{ role: "user", content: userStory }]
  });

  if (response.stop_reason === "max_tokens") {
    console.warn("WARNING: Generator hit max_tokens - response may be truncated");
  }

  const rawText = response.content[0].text;
  const clean = rawText.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error("Generator JSON parse failed. Raw output:");
    console.error(rawText);
    throw new Error("Generator returned invalid JSON");
  }

  return {
    result: parsed,
    usage: response.usage,
    stop_reason: response.stop_reason
  };
}
