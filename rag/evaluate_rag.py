import sys
import os
import json
import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def evaluate_rag_triad(user_story: str, retrieved_context: str, generated_output: str) -> dict:
    prompt = f"""You are a RAG evaluation expert. Score the following on a scale of 0.0 to 1.0.

USER STORY:
{user_story}

RETRIEVED CONTEXT (past test cases used as reference):
{retrieved_context}

GENERATED OUTPUT (new test cases produced):
{generated_output}

Return ONLY a valid JSON object, no markdown, no explanation:
{{
  "context_relevance": {{"score": 0.0, "reason": "one line"}},
  "groundedness": {{"score": 0.0, "reason": "one line"}},
  "answer_relevance": {{"score": 0.0, "reason": "one line"}}
}}

Definitions:
- context_relevance: are the retrieved past test cases relevant to this user story?
- groundedness: are the generated test cases grounded in the retrieved examples, not hallucinated?
- answer_relevance: do the generated test cases actually address the user story requirements?"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(response.content[0].text)

if __name__ == "__main__":
    data = json.loads(sys.argv[1])
    result = evaluate_rag_triad(
        data["user_story"],
        data["retrieved_context"],
        data["generated_output"]
    )
    print(json.dumps(result))