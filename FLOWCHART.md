# GenForge Project Flowcharts

This document describes the core logic of the GenForge application, focusing on the LangGraph-based node architecture for project generation, RAG-based updates, and manual saves.

## 1. High-Level Flowchart (LangGraph Architecture)

```mermaid
flowchart TD
    %% ─────────────────────────────────────────────────────────────────────────────
    %% PATH 1: FIRST PROMPT (GENERATION)
    %% ─────────────────────────────────────────────────────────────────────────────
    subgraph Path1 [First Prompt Generation & Ingestion]
        P1Start([User Prompt]) --> P1Rec[receivePromptNode]
        P1Rec --> P1Graph[[Inner StateGraph Loop]]
        
        subgraph P1Loop [callLLMNode: Agent Logic]
            P1Agent[agentNode] <--> P1Tools[toolsNode: executeCommand]
        end
        
        P1Graph --> P1Chunk[chunkResponseNode]
        P1Chunk --> P1DB[(saveToDBNode: MongoDB)]
        P1DB --> P1Embed[vectorEmbedNode: OpenRouter Embeddings]
        P1Embed --> P1VDB[(saveToVDBNode: Atlas Vector Search)]
        P1VDB --> P1Done([Project Created])
    end

    %% ─────────────────────────────────────────────────────────────────────────────
    %% PATH 2: SECOND PROMPT (RAG UPDATE)
    %% ─────────────────────────────────────────────────────────────────────────────
    subgraph Path2 [Second Prompt RAG Update]
        P2Start([User Request]) --> P2Rec[receivePromptNode]
        P2Rec --> P2PromptEmbed[embedPromptNode: OpenRouter Embeddings]
        P2PromptEmbed --> P2Search[searchVDBNode: Atlas Vector Search]
        P2Search -- No Chunks found --> P2End([Short Circuit End])
        P2Search -- Chunks found --> P2Aug[augmentPromptNode]
        
        P2Aug --> P2LLM[callLLMNode: OpenRouter LLM]
        P2LLM --> P2Clean[chunkResponseNode: Strip Markdown]
        P2Clean --> P2UpdateDB[(updateDBNode: Save to MongoDB)]
        P2UpdateDB --> P2ResEmbed[embedResultNode: OpenRouter Embeddings]
        P2ResEmbed --> P2UpdateVDB[(updateVDBNode: Replace Vectors)]
        P2UpdateVDB --> P2UpdateDone([Project Updated])
    end

    %% ─────────────────────────────────────────────────────────────────────────────
    %% PATH 3: MANUAL EDITOR SAVE
    %% ─────────────────────────────────────────────────────────────────────────────
    subgraph Path3 [Manual Editor Save]
        P3Start([User Save in Monaco]) --> P3Rec[receiveEditNode]
        P3Rec --> P3UpdateDB[(updateDBNode: Save to MongoDB)]
        P3UpdateDB --> P3ReIndex[reIndexNode: Chunks & OpenRouter Embeddings]
        P3ReIndex --> P3UpdateVDB[(updateVDBNode: Replace Vectors)]
        P3UpdateVDB --> P3Sync[syncUINode]
        P3Sync --> P3SaveDone([File Saved])
    end

    %% Vertical alignment using invisible links
    Path1 ~~~ Path2
    Path2 ~~~ Path3

    %% Style Classes
    classDef startEnd fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d;
    classDef process fill:#e0f2fe,stroke:#0369a1,stroke-width:2px,color:#0c4a6e;
    classDef db fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px,color:#581c87;
    classDef agent fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f;

    %% Class Assignments
    class P1Start,P1Done,P2Start,P2End,P2UpdateDone,P3Start,P3SaveDone startEnd;
    class P1Rec,P1Chunk,P1Embed,P2Rec,P2PromptEmbed,P2Aug,P2Clean,P2ResEmbed,P3Rec,P3ReIndex,P3Sync process;
    class P1DB,P1VDB,P2Search,P2UpdateDB,P2UpdateVDB,P3UpdateDB,P3UpdateVDB db;
    class P1Graph,P1Agent,P1Tools,P2LLM agent;

    %% Subgraph Styling
    style Path1 fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#0f172a
    style Path2 fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#78350f
    style Path3 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
    style P1Loop fill:#faf5ff,stroke:#8b5cf6,stroke-width:1px,color:#5b21b6
```

## 2. Path 1 Detailed: Generation & Ingestion Logic

The Generation Path uses a **planning-execution agent loop**. It decomposes the user's high-level request into specific terminal commands (`mkdir`, `New-Item`, `Set-Content`). Once the generation is complete, the resulting files are persisted to MongoDB and indexed into Atlas Vector Search for future RAG operations.

- **State Management**: Uses shared state channels via `sharedState.js`.
- **Streaming**: Progress updates (folder creation, file writes) are streamed to the frontend via SSE.
- **Tools**: The agent uses an `executeCommand` tool which simulates terminal output.

## 3. Path 2 Detailed: RAG-based Code Update

The RAG Path enables users to update existing projects using natural language. It leverages vector search to find relevant file chunks, provides those chunks to the LLM as context, and applies the resulting patches.

- **Context Retrieval**: Uses `$vectorSearch` with Atlas to find the most relevant code blocks.
- **Context Augmentation**: Builds a prompt combining the user's request with the retrieved code.
- **Incremental Indexing**: Only nodes for the modified files are re-embedded and updated in the VDB.

## 4. Path 3 Detailed: Manual Monaco Save

When a user manually edits a file in the Monaco editor and hits save, this path ensures the vector database stays in sync with the database record.

- **Direct Update**: Skips LLM involvement and updates MongoDB immediately.
- **Automatic Re-indexing**: Re-chunks and re-embeds the updated content for accurate future RAG search.
