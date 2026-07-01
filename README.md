# AI Test Generator

A web app that converts user stories into structured test suites using the Claude API. The differentiator is a full evaluation layer built on top of the generator - a second Claude call that grades, scores, and flags issues in the generated output across five quality dimensions. This turns a single prompt wrapper into a two-agent system with observable, measurable output quality.

**Stack:** Claude API, Node.js, Express, React, Vite, Tailwind CSS, Recharts

---

## What It Does

Paste a user story and get back a structured test suite covering:

- Happy path scenarios
- Edge cases
- Negative scenarios
- API tests
- Coverage score and risk areas

Every generation is automatically evaluated by a second Claude call, scored across five dimensions, and logged to a JSONL file on the server. Real-time status updates are streamed to the frontend via Server-Sent Events so users see exactly what the pipeline is doing while they wait. An eval dashboard visualises quality trends over time.

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
       ^
       | Few-shot context (top-5 similar test cases)
       |
+-----------------+
|   RAG RETRIEVER |  LlamaIndex + BAAI/bge-small-en-v1.5
|   (rag/         |  Sentence window retrieval (window=3)
|   retrieve.py)  |  Vector store of past test cases
+-----------------+
       |
       | Structured JSON test suite + retrieved_context
       v
+-----------------+
|   EVALUATOR     |  claude-sonnet-4-6
|   (scripts/     |  max_tokens: 2000
|   evaluator.js) |  5-dimension scoring + RAG triad
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
       | Final approved output + SSE status stream
       v
+-----------------+     +-----------------+
|   EVAL LOGGER   |     |   EXPRESS API   |
|   eval_log.jsonl|     |   server.js     |
|   (JSONL format)|     |   Railway       |
+-----------------+     +-----------------+
                                |
                          SSE stream
                          (real-time status)
                                |
                                v
                    +-----------------+
                    |   REACT UI      |
                    |   Vite, Tailwind|
                    |   Vercel        |
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

## RAG Pipeline

Test case generation is augmented with retrieval from a vector store of past test cases, applying the sentence window retrieval technique from the DeepLearning.AI Advanced RAG course.

**How it works:**

1. User story is embedded using `BAAI/bge-small-en-v1.5` (free, no OpenAI dependency)
2. Top-5 most similar past test cases retrieved from a local vector store
3. Sentence window retrieval (window=3) expands each matched sentence to include 3 surrounding sentences for richer context
4. Retrieved examples injected into the generator prompt as few-shot reference inside `<examples>` tags
5. Generation falls back gracefully to no-context mode if retrieval fails
6. Output quality scored using the RAG triad: Context Relevance, Groundedness, Answer Relevance
7. RAG triad scores logged alongside existing eval scores in `eval_log.jsonl`

**RAG triad scoring:**

| Metric | What It Measures |
|--------|-----------------|
| Context Relevance | Are the retrieved past test cases relevant to the user story? |
| Groundedness | Are the generated test cases grounded in retrieved examples, not hallucinated? |
| Answer Relevance | Do the generated test cases actually address the user story requirements? |

Each metric scores 0.0 to 1.0. Claude claude-sonnet-4-6 is used as the judge model.

**Setup RAG layer (first time only):**

```bash
cd rag
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 build_index.py
```

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
- Hallucination risk scores trend lower on more complex stories - Claude makes more assumptions when the user story is less specific about technical implementation
- API completeness is consistently the highest-scoring dimension (93-96) because the system prompt explicitly requires API test cases

---

## Project Structure

```
tc-generator/
├── rag/
│   ├── data/
│   │   ├── sample_test_cases/    # Knowledge base: past test cases by feature
│   │   └── vector_store/         # Persisted LlamaIndex vector store (gitignored)
│   ├── build_index.py            # One-time script to embed and store test cases
│   ├── retrieve.py               # Retrieves top-k similar test cases for a query
│   ├── evaluate_rag.py           # RAG triad evaluator using Claude as judge
│   └── requirements.txt          # Python dependencies
├── api/
│   ├── generate.js               # Vercel serverless handler (proxies to pipeline)
│   └── logs.js                   # Vercel serverless handler for log reads
├── scripts/
│   ├── generator.js              # Claude generator call, RAG-augmented prompt, returns { result, usage, retrieved_context }
│   ├── evaluator.js              # Claude evaluator call, 5-dimension scoring + RAG triad
│   ├── pipeline.js               # Generator > Evaluator > Revision loop + SSE callbacks
│   └── logger.js                 # Appends entries to eval_log.jsonl
├── src/
│   ├── components/
│   │   ├── StoryInput.jsx        # User story textarea
│   │   ├── TestResults.jsx       # Tabbed results panel
│   │   ├── CoverageMeter.jsx     # Visual coverage percentage
│   │   ├── ExportButton.jsx      # Copy / download output
│   │   └── EvalDashboard.jsx     # Quality trends, dimension scores, run history
│   ├── App.jsx                   # SSE stream reader, status display
│   └── main.jsx
├── server.js                     # Express API with SSE streaming, /api/generate and /api/logs
├── railway.toml                  # Railway deployment config
├── vercel.json                   # Vercel routing config
├── vite.config.js                # Vite + proxy config
├── package.json
└── eval_log.jsonl                # Runtime log, gitignored
```

---

## Deployment

The app is split across two services:

**Frontend - Vercel**
- Serves the built React app as a static site
- Environment variable required: `VITE_API_URL=https://tc-generator-api-production.up.railway.app`

**Backend - Railway**
- Runs the Express server with the full pipeline
- Environment variable required: `ANTHROPIC_API_KEY=your_key_here`
- No timeout limits - handles the full 2-3 minute pipeline including revision loops

---

## Local Setup

**Prerequisites:** Node.js v20+, Python 3.9+, Anthropic API key

```bash
git clone https://github.com/MohitGulati32/ai-tc-generator.git
cd ai-tc-generator
npm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_key_here
```

Set up the RAG layer (first time only):

```bash
cd rag
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 build_index.py
cd ..
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

**RAG-augmented generation** - Before calling Claude, the pipeline retrieves the top-5 most similar past test cases from a vector store using sentence window retrieval (window=3). These are injected as few-shot examples into the generator prompt, improving format consistency and coverage quality. Retrieval is handled by a Python layer using LlamaIndex and a free HuggingFace embedding model, keeping the pipeline independent of OpenAI.

**RAG triad evaluation** - A separate evaluation pass scores the RAG pipeline output across three dimensions: Context Relevance (were the right examples retrieved?), Groundedness (is the output based on retrieved context?), and Answer Relevance (does the output address the user story?). Claude acts as the judge model, returning scores 0.0 to 1.0 per dimension.

**Prompt caching** - The generator system prompt is cached via `cache_control: { type: "ephemeral" }`. This reduces cost and latency when multiple stories are generated in a session.

**Two-agent design** - A single Claude call is a feature. Two calls with a grading step and a revision loop is a system. The evaluator acts as a QA lead reviewing the generator's output independently.

**SSE streaming** - The pipeline streams real-time status updates to the frontend via Server-Sent Events. Users see "Generating test suite... Evaluating output... Revision pass 1 of 2..." instead of a silent wait. This required explicit CORS headers on the SSE endpoint since the frontend and backend are on different domains.

**Revision loop cap** - The pipeline caps revision cycles at 2 to control API cost. The evaluator's `revision_notes` are injected back into the generator prompt so the second pass targets specific gaps.

**stop_reason checking** - Both the generator and evaluator check `stop_reason === "max_tokens"` after every API call. Truncated JSON causes a parse failure; this surfaces the warning immediately rather than silently returning broken output.

**JSONL logging** - Each run appends one JSON line to `eval_log.jsonl`. This format allows unbounded append without reading the full file and is standard for production log pipelines.

**ES modules** - The project uses `"type": "module"` in `package.json`. Config files that use CommonJS syntax are renamed to `.cjs` to avoid conflicts.

**Railway over Vercel for backend** - Vercel serverless functions time out at 60 seconds on the free plan. The full pipeline (two Claude API calls plus a potential revision loop) takes 2-3 minutes. Railway provides a persistent Express server with no timeout limits.

---

## Known Limitations

**Eval log resets on redeploy** - `eval_log.jsonl` lives on Railway's ephemeral filesystem and is wiped on every redeploy. The production fix is to move logs to a persistent store like PostgreSQL or a Railway volume. This is a known tradeoff for the current portfolio version.

**RAG vector store is local only** - The vector store lives on disk in `rag/data/vector_store/` and is gitignored. On Railway the store needs to be rebuilt on each deploy by running `build_index.py` as part of the start script, or moved to a persistent volume.

**Railway free tier cold starts** - Railway spins down the container after a period of inactivity. The first request after idle takes 30-60 seconds longer than usual while the container starts up. Subsequent requests run at normal speed.

**20 test case cap** - The generator system prompt limits output to 20 test cases to prevent token overflow on very detailed or specific stories. This keeps response times predictable.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/generate | Runs the full pipeline, streams SSE status updates |
| GET | /api/logs | Returns all entries from eval_log.jsonl |
| GET | / | Health check |

**POST /api/generate request body:**
```json
{ "story": "As a user I want to..." }
```

**SSE event stream response:**
```
event: status
data: {"message": "Generating test suite..."}

event: status
data: {"message": "Evaluating output..."}

event: status
data: {"message": "Revision pass 1 of 2 - improving test suite..."}

event: result
data: {"tests": {...}, "evalResult": {...}, "revisionsUsed": 1}
```

---

## Roadmap

- [x] Phase 1 - Core API, prompt engineering, structured JSON output, prompt caching
- [x] Phase 2 - React UI, tabbed results, coverage meter, export button
- [x] Phase 3 - Evaluation layer, 5-dimension scoring, revision loop, eval logger
- [x] Phase 4 - Eval dashboard, quality trends, dimension bar chart, run history
- [x] Deploy - Vercel (frontend) + Railway (backend)
- [x] Phase 5 - RAG retrieval layer, sentence window retrieval, RAG triad evaluation, vector store of past test cases
- [ ] Phase 6 - Example stories, token cost display, mobile layout polish
