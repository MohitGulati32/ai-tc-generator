import dotenv from "dotenv";
dotenv.config();

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import path from "path";

function retrieveSimilarTestCases(userStory) {
  try {
    const ragDir = path.join(process.cwd(), "rag");
    const result = execSync(
  `./.venv/bin/python3 retrieve.py "${userStory.replace(/"/g, '\\"')}"`,
  { cwd: ragDir, encoding: "utf8" }
);
    const lastLine = result.trim().split("\n").pop();
const examples = JSON.parse(lastLine);
    return examples.join("\n\n---\n\n");
  } catch (err) {
    console.warn("RAG retrieval failed, proceeding without context:", err.message);
    return "";
  }
}

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
  // Step 1: Retrieve similar past test cases from vector store
  const retrievedContext = retrieveSimilarTestCases(userStory);

  // Step 2: Build prompt - inject retrieved examples as few-shot context if available
  const userMessage = retrievedContext
    ? `Here are similar test cases from our knowledge base for reference. Use them as a quality and format guide only - do not copy them directly.

<examples>
${retrievedContext}
</examples>

Now generate test cases for the following user story:

<user_story>
${userStory}
</user_story>`
    : userStory;

  // Step 3: Call Claude with RAG-augmented prompt
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
    messages: [{ role: "user", content: userMessage }]
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

  // Step 4: Return result along with retrieved context so pipeline can pass it to evaluator
  return {
    result: parsed,
    usage: response.usage,
    stop_reason: response.stop_reason,
    retrieved_context: retrievedContext || null
  };
}