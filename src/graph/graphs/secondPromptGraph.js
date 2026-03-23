import { StateGraph, END } from "@langchain/langgraph";
import { sharedStateChannels } from "../state/sharedState.js";
import { receivePromptNode } from "../nodes/secondPrompt/receivePromptNode.js";
import { embedPromptNode } from "../nodes/secondPrompt/embedPromptNode.js";
import { searchVDBNode } from "../nodes/secondPrompt/searchVDBNode.js";
import { augmentPromptNode } from "../nodes/secondPrompt/augmentPromptNode.js";
import { callLLMNode } from "../nodes/secondPrompt/callLLMNode.js";
import { chunkResponseNode } from "../nodes/secondPrompt/chunkResponseNode.js";
import { updateDBNode } from "../nodes/secondPrompt/updateDBNode.js";
import { embedResultNode } from "../nodes/secondPrompt/embedResultNode.js";
import { updateVDBNode } from "../nodes/secondPrompt/updateVDBNode.js";

/**
 * PATH 2 — Second Prompt Graph (RAG Update)
 *
 * Maps to FLOWCHART.md / Path2:
 *   Agent → Second Prompt → user Prompt → user prompt embed
 *     → Search in VDB and fetch the block of code from normal DB
 *     → Augment the user prompt with the block of code
 *     → LLM → Response
 *       └→ Update the block of DB which got updated → Show in the frontend
 *       └→ Embed the result → Update the block of the VDB which was fetched
 *
 * Graph flow:
 *   START
 *     → receivePrompt    (validate inputs)
 *     → embedPrompt      (embed the user prompt)
 *     → searchVDB        (Atlas $vectorSearch)
 *     → [conditional] → if no chunks found → END (short-circuit)
 *     → augmentPrompt    (build context-enriched prompt)
 *     → callLLM          (generate patch)
 *     → chunkResponse    (clean markdown fences)
 *     → updateDB         (apply patch + save to MongoDB)
 *     → embedResult      (chunk + embed updated file)
 *     → updateVDB        (replace vectors in Atlas)
 *   END
 *
 * @returns {CompiledStateGraph}
 */
export function buildSecondPromptGraph() {
  /**
   * Conditional routing after searchVDB:
   * If no relevant chunks were found, skip straight to END.
   *
   * @param {object} state
   */
  const routeAfterSearch = (state) => {
    if (!state.relevantChunks || state.relevantChunks.length === 0) {
      console.log("[secondPromptGraph] No relevant chunks found — short-circuiting.");
      return END;
    }
    return "augmentPrompt";
  };

  const workflow = new StateGraph({ channels: sharedStateChannels })
    .addNode("receivePrompt", receivePromptNode)
    .addNode("embedPrompt", embedPromptNode)
    .addNode("searchVDB", searchVDBNode)
    .addNode("augmentPrompt", augmentPromptNode)
    .addNode("callLLM", callLLMNode)
    .addNode("chunkResponse", chunkResponseNode)
    .addNode("updateDB", updateDBNode)
    .addNode("embedResult", embedResultNode)
    .addNode("updateVDB", updateVDBNode)
    .addEdge("__start__", "receivePrompt")
    .addEdge("receivePrompt", "embedPrompt")
    .addEdge("embedPrompt", "searchVDB")
    .addConditionalEdges("searchVDB", routeAfterSearch, {
      augmentPrompt: "augmentPrompt",
      [END]: END,
    })
    .addEdge("augmentPrompt", "callLLM")
    .addEdge("callLLM", "chunkResponse")
    .addEdge("chunkResponse", "updateDB")
    .addEdge("updateDB", "embedResult")
    .addEdge("embedResult", "updateVDB")
    .addEdge("updateVDB", END);

  return workflow.compile();
}
