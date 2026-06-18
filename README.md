# AI Test Generator

A web app that converts user stories into structured test suites using the Claude API. The differentiator is a full evaluation layer built on top of the generator - a second Claude call that grades, scores, and flags issues in the generated output across five quality dimensions. This turns a single prompt wrapper into a two-agent system with observable, measurable output quality.

**Live:** your-app.vercel.app | **Stack:** Claude API, Node.js, Express, React, Vite, Tailwind CSS, Recharts

---

## What It Does

Paste a user story and get back a structured test suite covering:

- Happy path scenarios
- Edge cases
- Negative scenarios
- API tests
- Coverage score and risk areas

Every generation is automatically evaluated by a second Claude call, scored across five dimensions, and logged to a local JSONL file. An eval dashboard visualises quality trends over time.

---

## Architecture

```
User Story Input
       |
       v
+-----------------+
|   GENERATOR     |  claude-sonnet-4-6
|   (scripts/     |  max_tokens: 8000
|   generator.js) |  Prompt cached via cache_control
+-----------------+
       |
       | Structured JSON test suite
       v
+-----------------+
|   EVALUATOR     |  claude-sonnet-4-6
|   (scripts/     |  max_tokens: 2000
|   evaluator.js) |  5-dimension scoring
+-----------------+
       |
       | recommendation: approve / revise / reject
       v
+---------------------------+
|   REVISION LOOP           |
|   (scripts/pipeline.js)   |
|                           |
|   if recommendation ==    |
|   "revise" AND            |
|   revisions < 2:          |
|     inject revision notes |
|     re-run generator      |
|     re-run evaluator      |
+---------------------------+
       |
       | Final approved output
       v
+-----------------+     +-----------------+
|   EVAL LOGGER   |     |   EXPRESS API   |
|   eval_log.jsonl|     |   server.js     |
|   (JSONL format)|     |   port 3001     |
+-----------------+     +-----------------+
                                |
                                v
                    +-----------------+
                    |   REACT UI      |
                    |   Vite, Tailwind|
                    |   port 5173     |
                    +-----------------+
                    |                 |
              Test Results      Eval Dashboard
              Tabbed panel      Quality trends
              Coverage meter    Dimension scores
              Export button     Run history
```

---

## Evaluation Dimensions

Each generated test suite is scored across five dimensions (0-100):

| Dimension | What It Measures |
|-----------|-----------------|
| Coverage | Percentage of story requirements tested |
| Specificity | Whether steps are concrete or vague |
| API Completeness | Whether API tests are meaningful |
| Edge Case Depth | Quality of boundary and negative scenarios |
| Hallucination Risk | 100 = clean output, 0 = likely hallucinated details |

---

## Sample Eval Log

Real scores from the first four runs:

```jsonl
{"timestamp":"2026-06-18T21:45:14.817Z","userStory":"As a user I want to log in with email and password...","totalTokens":11071,"dimensionScores":{"coverage":95,"specificity":88,"api_completeness":96,"edge_case_depth":91,"hallucination_risk":82},"overallScore":90,"recommendation":"approve","revisionsUsed":0}
{"timestamp":"2026-06-18T22:26:47.697Z","userStory":"As a user I want to reset my password via email...","totalTokens":11932,"dimensionScores":{"coverage":95,"specificity":90,"api_completeness":93,"edge_case_depth":92,"hallucination_risk":78},"overallScore":90,"recommendation":"approve","revisionsUsed":0}
{"timestamp":"2026-06-18T22:36:08.563Z","userStory":"As an admin I want to deactivate a user account...","totalTokens":16793,"dimensionScores":{"coverage":94,"specificity":91,"api_completeness":95,"edge_case_depth":93,"hallucination_risk":72},"overallScore":89,"recommendation":"revise","revisionsUsed":2}
{"timestamp":"2026-06-18T22:44:51.834Z","userStory":"As a user I want to search for products by keyword...","totalTokens":15077,"dimensionScores":{"coverage":92,"specificity":88,"api_completeness":95,"edge_case_depth":91,"hallucination_risk":72},"overallScore":88,"recommendation":"revise","revisionsUsed":2}
```

**Observations from real runs:**
- Average overall quality score: 89/100
- Revision rate: 50% (2 of 4 runs triggered a revision pass)
- Hallucination risk scores trend lower on more complex stories (admin flows, search) - Claude makes more assumptions when the user story is less specific about technical implementation
- API completeness is consistently the highest-scoring dimension (93-96) because the system prompt explicitly requires API test cases

---

## Project Structure

```
tc-generator/
├── api/
│   └── generate.js          # Legacy handler (retired in Phase 3)
├── scripts/
│   ├── generator.js          # Claude generator call, returns { result, usage }
│   ├── evaluator.js          # Claude evaluator call, 5-dimension scoring
│   ├── pipeline.js           # Generator > Evaluator > Revision loop
│   └── logger.js             # Appends entries to eval_log.jsonl
├── src/
│   ├── components/
│   │   ├── StoryInput.jsx    # User story textarea
│   │   ├── TestResults.jsx   # Tabbed results panel
│   │   ├── CoverageMeter.jsx # Visual coverage percentage
│   │   ├── ExportButton.jsx  # Copy / download output
│   │   └── EvalDashboard.jsx # Quality trends, dimension scores, run history
│   ├── App.jsx
│   └── main.jsx
├── server.js                 # Express API, /api/generate and /api/logs routes
├── vite.config.js            # Vite + proxy config
├── package.json
└── eval_log.jsonl            # Runtime log, gitignored
```

---

## Setup

**Prerequisites:** Node.js v20+, Anthropic API key

```bash
git clone https://github.com/your-username/tc-generator.git
cd tc-generator
npm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_key_here
```

Start the backend (terminal 1):

```bash
node server.js
```

Start the frontend (terminal 2):

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Key Engineering Decisions

**Prompt caching** - The generator system prompt is cached via `cache_control: { type: "ephemeral" }`. This reduces cost and latency when multiple stories are generated in a session.

**Two-agent design** - A single Claude call is a feature. Two calls with a grading step and a revision loop is a system. The evaluator acts as a QA lead reviewing the generator's output independently.

**Revision loop cap** - The pipeline caps revision cycles at 2 to control API cost. The evaluator's `revision_notes` are injected back into the generator prompt so the second pass targets specific gaps.

**stop_reason checking** - Both the generator and evaluator check `stop_reason === "max_tokens"` after every API call. Truncated JSON causes a parse failure; this surfaces the warning immediately rather than silently returning broken output.

**JSONL logging** - Each run appends one JSON line to `eval_log.jsonl`. This format allows unbounded append without reading the full file and is standard for production log pipelines.

**ES modules** - The project uses `"type": "module"` in `package.json`. Config files that use CommonJS syntax (`postcss.config.js`, `tailwind.config.js`) are renamed to `.cjs` to avoid conflicts.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/generate | Runs the full pipeline for a user story |
| GET | /api/logs | Returns all entries from eval_log.jsonl |

**POST /api/generate request body:**
```json
{ "story": "As a user I want to..." }
```

**POST /api/generate response:**
```json
{
  "tests": { "summary": "...", "happy_path": [], "edge_cases": [], ... },
  "evalResult": { "overall_quality_score": 90, "dimension_scores": {}, "recommendation": "approve", ... },
  "revisionsUsed": 0
}
```

---

## Pre-deployment Checklist

- Switch model from `claude-sonnet-4-6` to `claude-opus-4-6` in both `generator.js` and `evaluator.js`
- Review `eval_log.jsonl` token usage and adjust `max_tokens` if needed (generator: 8000, evaluator: 2000)
- Confirm `eval_log.jsonl` is in `.gitignore` before pushing
- Add architecture diagram and sample eval log excerpt to README

---

## Roadmap

- [x] Phase 1 - Core API, prompt engineering, structured JSON output, prompt caching
- [x] Phase 2 - React UI, tabbed results, coverage meter, export button
- [x] Phase 3 - Evaluation layer, 5-dimension scoring, revision loop, eval logger
- [x] Phase 4 - Eval dashboard, quality trends, dimension bar chart, run history
- [ ] Phase 5 - Example stories, token cost display, mobile layout polish
- [ ] Deploy - Vercel deployment, public URL
