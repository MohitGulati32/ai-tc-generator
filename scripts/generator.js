const systemPrompt = `You are a senior QA engineer with 10+ years of experience.
Given a user story, generate a comprehensive test suite.
Always respond with valid JSON:
{
  "summary": "brief overview of test approach",
  "happy_path": [...],
  "edge_cases": [...],
  "negative_scenarios": [...],
  "api_tests": [...],
  "coverage_score": 0-100,
  "risk_areas": [...]
}
Each test case: id, title, preconditions, steps[], expected_result, priority (P1/P2/P3)`;


const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 6000,
  system: [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [{ role: 'user', content: userStory }]
});