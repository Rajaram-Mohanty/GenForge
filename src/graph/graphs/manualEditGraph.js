import { StateGraph, END } from "@langchain/langgraph";
import { sharedStateChannels } from "../state/sharedState.js";
import { receiveEditNode } from "../nodes/manualEdit/receiveEditNode.js";
import { updateDBNode } from "../nodes/manualEdit/updateDBNode.js";
import { reIndexNode } from "../nodes/manualEdit/reIndexNode.js";
import { updateVDBNode } from "../nodes/manualEdit/updateVDBNode.js";
import { syncUINode } from "../nodes/manualEdit/syncUINode.js";

/**
 * PATH 3 — Manual Edit Graph (Monaco Editor Save)
 *
 * Maps to FLOWCHART.md / Path3:
 *   User Edit in Monaco → Save Request
 *     → Update File in MongoDB
 *     → Re-index File (Chunk + Embed)
 *     → Update Vector DB
 *     → Sync UI Content
 *
 * Graph flow (strictly linear):
 *   START
 *     → receiveEdit    (validate inputs)
 *     → updateDB       (save content to MongoDB)
 *     → reIndex        (chunk + embed new content)
 *     → updateVDB      (replace vectors in Atlas)
 *     → syncUI         (build final response object)
 *   END
 *
 * @returns {CompiledStateGraph}
 */
export function buildManualEditGraph() {
  const workflow = new StateGraph({ channels: sharedStateChannels })
    .addNode("receiveEdit", receiveEditNode)
    .addNode("updateDB", updateDBNode)
    .addNode("reIndex", reIndexNode)
    .addNode("updateVDB", updateVDBNode)
    .addNode("syncUI", syncUINode)
    .addEdge("__start__", "receiveEdit")
    .addEdge("receiveEdit", "updateDB")
    .addEdge("updateDB", "reIndex")
    .addEdge("reIndex", "updateVDB")
    .addEdge("updateVDB", "syncUI")
    .addEdge("syncUI", END);

  return workflow.compile();
}
