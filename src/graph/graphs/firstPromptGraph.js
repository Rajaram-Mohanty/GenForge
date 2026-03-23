import { StateGraph, END } from "@langchain/langgraph";
import { sharedStateChannels } from "../state/sharedState.js";
import { receivePromptNode } from "../nodes/firstPrompt/receivePromptNode.js";
import { makeCallLLMNode } from "../nodes/firstPrompt/callLLMNode.js";
import { chunkResponseNode } from "../nodes/firstPrompt/chunkResponseNode.js";
import { saveToDBNode } from "../nodes/firstPrompt/saveToDBNode.js";
import { vectorEmbedNode } from "../nodes/firstPrompt/vectorEmbedNode.js";
import { saveToVDBNode } from "../nodes/firstPrompt/saveToVDBNode.js";

/**
 * PATH 1 — First Prompt Graph (Generation & Ingestion)
 *
 * Maps to FLOWCHART.md / Path1:
 *   Agent → First Prompt → user prompt → llm → response
 *     └→ Chunk → DB → vector embed → vDB
 *
 * Graph flow (linear):
 *   START
 *     → receivePrompt   (validate + seed state)
 *     → callLLM         (agent loop with simulated executeCommand)
 *     → chunkResponse   (filter fileOperations with content)
 *     → saveToDB        (create Project + files in MongoDB)
 *     → vectorEmbed     (chunk + embed each file)
 *     → saveToVDB       (insert vectors into Atlas)
 *   END
 *
 * @param {Function} [onProgress] - Optional SSE callback for real-time streaming.
 *   Signature: (payload: { type: 'file'|'message', payload?: object, text?: string }) => void
 * @returns {CompiledStateGraph} A compiled, runnable LangGraph graph.
 */
export function buildFirstPromptGraph(onProgress) {
  const callLLMNode = makeCallLLMNode(onProgress);

  const workflow = new StateGraph({ channels: sharedStateChannels })
    .addNode("receivePrompt", receivePromptNode)
    .addNode("callLLM", callLLMNode)
    .addNode("chunkResponse", chunkResponseNode)
    .addNode("saveToDB", saveToDBNode)
    .addNode("vectorEmbed", vectorEmbedNode)
    .addNode("saveToVDB", saveToVDBNode)
    .addEdge("__start__", "receivePrompt")
    .addEdge("receivePrompt", "callLLM")
    .addEdge("callLLM", "chunkResponse")
    .addEdge("chunkResponse", "saveToDB")
    .addEdge("saveToDB", "vectorEmbed")
    .addEdge("vectorEmbed", "saveToVDB")
    .addEdge("saveToVDB", END);

  return workflow.compile();
}
