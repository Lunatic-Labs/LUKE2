import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";

/**
 * Test Your Knowledge
 *
 * The Engagement model belongs in this feature: prompt plus four responses where the first is correct, shuffled at construction. See data/triviaQuestions.txt for the source format.
 */
export function TriviaScene() {
  return (
    <SceneFrame>
      <ScenePlaceholder
        title="Test Your Knowledge"
        description="Multiple-choice trivia about Lipscomb, with shuffled answers and an end screen."
        source="TriviaScene.pde, TriviaGameManager.pde, TriviaEngagement.pde"
      />
    </SceneFrame>
  );
}
