/**
 * Shared LangGraph state channels used across all three graph paths.
 *
 * LangGraph merges state on each node return. Each channel defines:
 *   - value: the reducer function (how new values merge with old)
 *   - default: the initial value factory
 *
 * Nodes only need to return the keys they modify — the rest stays unchanged.
 */
export const sharedStateChannels = {
  // ── Identity ──────────────────────────────────────────────────────────────
  /** MongoDB project _id (string) */
  projectId: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  /** MongoDB user _id (string) */
  userId: {
    value: (x, y) => y ?? x,
    default: () => null,
  },

  // ── Prompt / Content ───────────────────────────────────────────────────────
  /** The raw user prompt text for this turn */
  prompt: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  /** File path being operated on (Path 2 & 3) */
  filePath: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  /** Raw file content (Path 3 manual edit, or fetched from DB for Path 2) */
  content: {
    value: (x, y) => y ?? x,
    default: () => null,
  },

  // ── LLM Communication ─────────────────────────────────────────────────────
  /** Conversation history as LangChain BaseMessage[] (Path 1: agent loop) */
  messages: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  /** Augmented prompt string built from retrieved code + user prompt (Path 2) */
  augmentedPrompt: {
    value: (x, y) => y ?? x,
    default: () => null,
  },

  // ── File Operations (Path 1) ──────────────────────────────────────────────
  /** Array of { type, name, path, content } collected during LLM tool calls */
  fileOperations: {
    value: (x, y) => (Array.isArray(y) ? y : x),
    default: () => [],
  },
  /** Log messages emitted by the agent during generation */
  agentMessages: {
    value: (x, y) => x.concat(Array.isArray(y) ? y : [y].filter(Boolean)),
    default: () => [],
  },
  /** The LLM's final human-readable summary after generation */
  finalMessage: {
    value: (x, y) => y ?? x,
    default: () => null,
  },

  // ── RAG (Path 2) ─────────────────────────────────────────────────────────
  /** Embedding vector for the user prompt */
  promptEmbedding: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  /** Top-k matching chunks from Atlas vector search */
  relevantChunks: {
    value: (x, y) => (Array.isArray(y) ? y : x),
    default: () => [],
  },
  /** The best matching chunk selected for patching */
  bestChunk: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  /** The patched/generated code block returned by the LLM */
  patchedCode: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  /** Human-readable summary of what was updated */
  updateSummary: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  /** Files that were modified during this turn */
  modifiedFiles: {
    value: (x, y) => (Array.isArray(y) ? y : x),
    default: () => [],
  },

  // ── API Keys ──────────────────────────────────────────────────────────────
  /** OpenRouter API key — used for BOTH LLM calls AND embeddings */
  apiKey: {
    value: (x, y) => y ?? x,
    default: () => null,
  },

  // ── Vectors (Path 1 & 2 Output) ──────────────────────────────────────────
  /** Pre-calculated vector documents ready for insertion into Atlas VDB */
  vectorDocs: {
    value: (x, y) => (Array.isArray(y) ? y : x),
    default: () => [],
  },

  // ── Status / Control ──────────────────────────────────────────────────────
  /** Terminal status flag — set to "done" or an error message by the last node */
  status: {
    value: (x, y) => y ?? x,
    default: () => "pending",
  },
};
