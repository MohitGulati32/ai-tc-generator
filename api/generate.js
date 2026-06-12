require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const systemPrompt = `You are a senior QA engineer with 10+ years of experience.
Given a user story, generate a comprehensive test suite.
Always respond with valid JSON and nothing else.
Do not wrap the response in markdown code blocks or backticks.
Do not include any text before or after the JSON.
{
  "summary": "brief overview of test approach",
  "happy_path": [],
  "edge_cases": [],
  "negative_scenarios": [],
  "api_tests": [],
  "coverage_score": 0,
  "risk_areas": []
}
Each test case: id, title, preconditions, steps[], expected_result, priority (P1/P2/P3)`;

module.exports = async (req, res) => {
  const { story } = req.body;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: story }]
    });

    const rawText = response.content[0].text;
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    res.json(parsed);

  } catch (err) {
    console.error('Generation error:', err.message);
    res.status(500).json({ error: 'Generation failed' });
  }
};