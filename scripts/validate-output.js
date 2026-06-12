require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const systemPrompt = `You are a senior QA engineer with 10+ years of experience.
Given a user story, generate a comprehensive test suite.
Always respond with valid JSON and nothing else. 
Do not wrap the response in markdown code blocks or backticks.
Do not include any text before or after the JSON.
Always respond with valid JSON:
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

const testStory = `As a user, I want to log in with my email and password 
so that I can access my account.`;

async function testStructuredOutput() {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
  max_tokens: 6000,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: testStory }]
    });

    const rawText = response.content[0].text;
console.log('Stop reason:', response.stop_reason);
console.log('Output tokens used:', response.usage.output_tokens);

// Strip markdown code fences if present
const cleaned = rawText
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```\s*$/i, '')
  .trim();

// Attempt to parse as JSON
const parsed = JSON.parse(cleaned);

const fs = require('fs');
fs.writeFileSync('sample-output.json', JSON.stringify(parsed, null, 2));
console.log('Saved to sample-output.json');

    // Check all expected keys exist
    const requiredKeys = ['summary', 'happy_path', 'edge_cases', 
                          'negative_scenarios', 'api_tests', 
                          'coverage_score', 'risk_areas'];

    const missingKeys = requiredKeys.filter(k => !(k in parsed));

    if (missingKeys.length > 0) {
      console.warn('Missing keys in response:', missingKeys);
    } else {
      console.log('JSON structure: VALID');
      console.log('Summary:', parsed.summary);
      console.log('Happy path tests:', parsed.happy_path.length);
      console.log('Edge cases:', parsed.edge_cases.length);
      console.log('Coverage score:', parsed.coverage_score);
      console.log('Tokens used:', response.usage.input_tokens + response.usage.output_tokens);
    }

  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error('JSON parse failed - Claude returned non-JSON output.');
      console.error('Raw response:', err.message);
    } else {
      console.error('API error:', err.message);
    }
  }
}

testStructuredOutput();