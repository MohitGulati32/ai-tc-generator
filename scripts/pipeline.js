import { generateTestCases } from "./generator.js";
import { evaluateTestSuite } from "./evaluator.js";

export async function generateWithEval(userStory, maxRevisions = 2) {
  console.log("Step 1: Generating test suite...");
  let generation = await generateTestCases(userStory);
  let tests = generation.result;
  let generationUsage = generation.usage;

  console.log("Step 2: Evaluating output...");
  let evaluation = await evaluateTestSuite(userStory, tests);
  let evalResult = evaluation.result;
  let evalUsage = evaluation.usage;

  let revisions = 0;

  while (evalResult.recommendation === "revise" && revisions < maxRevisions) {
    revisions++;
    console.log(`Revision pass ${revisions} of ${maxRevisions}...`);
    console.log("Revision notes:", evalResult.revision_notes);

    const revisedPrompt = `${userStory}

Previous attempt had these issues: ${evalResult.revision_notes}
Missing scenarios: ${evalResult.missing_scenarios.join(", ")}
Please address these specifically in the new output.`;

    generation = await generateTestCases(revisedPrompt);
    tests = generation.result;
    generationUsage = generation.usage;

    evaluation = await evaluateTestSuite(userStory, tests);
    evalResult = evaluation.result;
    evalUsage = evaluation.usage;
  }

  console.log(`Pipeline complete. Revisions used: ${revisions}`);
  console.log(`Final recommendation: ${evalResult.recommendation}`);
  console.log(`Overall quality score: ${evalResult.overall_quality_score}`);

  return {
    tests,
    evalResult,
    revisionsUsed: revisions,
    generationUsage,
    evalUsage,
  };
}
