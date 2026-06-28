import fs from "fs";

const LOG_FILE = "eval_log.jsonl";

export function logEvalResult({
  userStory,
  generationUsage,
  evalUsage,
  evalResult,
  revisionsUsed,
  ragScores,
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userStory: userStory.slice(0, 100),
    generationTokens:
      generationUsage.input_tokens + generationUsage.output_tokens,
    evalTokens: evalUsage.input_tokens + evalUsage.output_tokens,
    totalTokens:
      generationUsage.input_tokens +
      generationUsage.output_tokens +
      evalUsage.input_tokens +
      evalUsage.output_tokens,
    dimensionScores: evalResult.dimension_scores,
    overallScore: evalResult.overall_quality_score,
    recommendation: evalResult.recommendation,
    revisionsUsed,
    hallucinationFlags: evalResult.hallucination_flags,
    ragScores: ragScores ? {
      context_relevance: ragScores.context_relevance.score,
      groundedness: ragScores.groundedness.score,
      answer_relevance: ragScores.answer_relevance.score,
      average: (
        (ragScores.context_relevance.score +
         ragScores.groundedness.score +
         ragScores.answer_relevance.score) / 3
      ).toFixed(3)
    } : null,
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
  console.log(`Logged to ${LOG_FILE} at ${logEntry.timestamp}`);
}