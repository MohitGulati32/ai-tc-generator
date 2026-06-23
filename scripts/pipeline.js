import { generateTestCases } from "./generator.js";
import { evaluateTestSuite } from "./evaluator.js";

export async function generateWithEval(userStory, maxRevisions = 2, onStatus = () => {}) {
  onStatus("Generating test suite...");
  let generation = await generateTestCases(userStory);
  let tests = generation.result;
  let generationUsage = generation.usage;

  onStatus("Evaluating output...");
  let evaluation = await evaluateTestSuite(userStory, tests);
  let evalResult = evaluation.result;
  let evalUsage = evaluation.usage;

  let revisions = 0;

  while (evalResult.recommendation === "revise" && revisions < maxRevisions) {
    revisions++;
    onStatus(`Revision pass ${revisions} of ${maxRevisions} - improving test suite...`);

    const revisedPrompt = `${userStory}

Previous attempt had these issues: ${evalResult.revision_notes}
Missing scenarios: ${evalResult.missing_scenarios.join(", ")}
Please address these specifically in the new output.`;

    generation = await generateTestCases(revisedPrompt);
    tests = generation.result;
    generationUsage = generation.usage;

    onStatus("Re-evaluating revised output...");
    evaluation = await evaluateTestSuite(userStory, tests);
    evalResult = evaluation.result;
    evalUsage = evaluation.usage;
  }

  onStatus(`Pipeline complete. Score: ${evalResult.overall_quality_score}/100 - ${evalResult.recommendation.toUpperCase()}`);

  return {
    tests,
    evalResult,
    revisionsUsed: revisions,
    generationUsage,
    evalUsage,
  };
}
