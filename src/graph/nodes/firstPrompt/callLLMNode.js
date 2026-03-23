import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getLLM } from "../../../core/llm.js";
import os from "os";
import path from "path";

const platform = os.platform();


// ─────────────────────────────────────────────────────────────────────────────
// INNER AGENT GRAPH
// ─────────────────────────────────────────────────────────────────────────────

const systemInstruction = `You are an expert AI agent specializing in automated frontend web development. Your goal is to build a complete, functional frontend for a website based on the user's request. You operate by executing terminal commands one at a time using the 'executeCommand' tool.

Your user's operating system is: ${platform}

<-- Core Mission: The PLAN -> EXECUTE -> VALIDATE -> REPEAT loop -->
You must follow this workflow for every task:
1.  **PLAN**: Decide on the single, next logical command to execute.
2.  **EXECUTE**: Call the 'executeCommand' tool with that single command.
3.  **VALIDATE**: Carefully examine the result from the tool. The result will start with "Success:" or "Error:".
    - If "Success:", check the output (stdout) to confirm the command did what you expected. For example, after creating a file, you should list the directory contents. After writing to a file, you should read it back to confirm the content is correct.
    - If "Error:", analyze the error message and formulate a new command to fix the problem. Do not give up on the first error.
4.  **REPEAT**: Continue this loop until the user's request is fully completed.

<-- CRITICAL RULES for Writing to Files -->
This is the most important section. You MUST follow these platform-specific rules to avoid errors.

**IF the OS is Linux or macOS ('linux' or 'darwin'):**
- To write multi-line code to a file, YOU MUST use the 'cat' command with a 'here-document'.
- YOU MUST use single quotes around 'EOF' to prevent shell expansion of characters like '$'.
- **Correct Example:**
  cat << 'EOF' > my-project/index.html
  <!DOCTYPE html>
  <html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
  </html>
  EOF

**IF the OS is Windows ('win32'):**
- To write multi-line code to a file, YOU MUST use **PowerShell's 'Set-Content' cmdlet with a here-string (@'...'@)**. This is the most reliable method.
- The syntax is: @' ... multiline content here ... '@ | Set-Content -Path "path\\to\\file.js"
- **WHY THIS IS SUPERIOR:** You do **NOT** need to escape special HTML/JS characters like '<', '>', '&', etc., inside the here-string block. This avoids many common errors.
- **Correct Example for writing a JS file:**
  @'
const calculator = {
    displayValue: '0',
    firstOperand: null,
    waitingForSecondOperand: false,
    operator: null,
};
function updateDisplay() {
    const display = document.querySelector('.calculator-screen');
    display.value = calculator.displayValue;
}
updateDisplay();
'@ | Set-Content -Path "my-app\\script.js"

- **Note on Paths:** Use backslashes \`\\\` for paths in Windows commands.

**ABSOLUTE RULE:** Do not use a single \`echo "long string of code..." > file.html\` command for writing complex files. It is unreliable. Always use the specific multi-line methods described above for each OS.

<-- Standard Project Plan -->
Unless the user specifies otherwise, follow this plan:
1.  **Create Project Directory**: Create a single, top-level folder for the project. e.g., \`mkdir calculator-app\`
2.  **Verify Directory**: Confirm the directory was created. (e.g., \`ls -F\` on Linux/macOS, \`dir\` on Windows).
3.  **Create Files**: Create 'index.html', 'style.css', and 'script.js' inside the new directory. Use a separate command for each. (e.g., \`touch my-project/index.html\` or \`New-Item -Path "my-project\\index.html" -ItemType File\` on Windows).
4.  **Populate HTML**: Write the complete HTML code into 'index.html' using the correct multi-line method for the OS.
5.  **Validate HTML**: After writing, read the file's content back (\`cat my-project/index.html\` or \`Get-Content my-project\\index.html\`) to ensure it was written correctly.
6.  **Populate CSS**: Write the CSS into 'style.css'.
7.  **Validate CSS**: Read the CSS file back to verify its content.
8.  **Populate JS**: Write the JavaScript into 'script.js'.
9.  **Validate JS**: Read the JS file back to verify its content.

<-- Final Step -->
Once all files are created and validated, your final response MUST be a plain text message to the user, summarizing what you did and where the files are located. Do not call any more tools at this point.
`;

/**
 * PATH 1 — Node 2: callLLMNode
 *
 * Runs the agent loop using the SAME StateGraph approach as the original graphAgent.js:
 *   - agent node calls LLM (returns delta: [newAIMessage])
 *   - tools node runs executeCommand (returns delta: [newToolMessage])
 *   - LangGraph's message reducer (x.concat(y)) appends automatically
 *   - shouldContinue routes back to agent or to END
 *
 * This is the correct approach — LangGraph manages state accumulation,
 * no manual message juggling needed.
 *
 * @param {Function} [onProgress] - Optional SSE callback, closed over at compile time.
 */
export function makeCallLLMNode(onProgress) {
  return async function callLLMNode(state) {
    const { prompt, projectId, userId, apiKey } = state;

    console.log(`[callLLMNode] Starting AI Generation loop... (projectId: ${projectId || "new"}, userId: ${userId})`);



    // Side-effect collectors and virtual disk
    const collectedFileOps = [];
    const collectedMessages = [];
    const virtualFiles = {}; 

    // ── Helper: Enhanced Simulation Logic ──────────────────────────────
    const executeCommandInLoop = async (command) => {
      let resultMessage = `Error: Command "${command}" not recognized. Please use standard mkdir, touch, Set-Content (with here-string), or Get-Content/cat.`;
      let fileOp = null;
      let logMsg = null;

      // 1. mkdir
      const mkdirMatch = command.match(/mkdir\s+(?:-p\s+)?(?:["']([^"']+)["']|([^\s;]+))/i);
      if (mkdirMatch) {
        const dirPath = (mkdirMatch[1] || mkdirMatch[2]).replace(/\\+/g, "/");
        fileOp = { type: "create_directory", name: path.basename(dirPath), path: dirPath };
        logMsg = `📁 Creating directory: ${dirPath}`;
        resultMessage = `Success: Directory ${dirPath} was created.`;
      } 
      
      // 2. touch / New-Item
      else if (command.match(/(?:touch|New-Item.*-Path)\s+/i)) {
        const touchMatch = command.match(/(?:touch|New-Item.*-Path)\s+(?:["']([^"']+)["']|([^\s;]+))/i);
        if (touchMatch) {
          const filePath = (touchMatch[1] || touchMatch[2]).replace(/\\+/g, "/");
          fileOp = { type: "create_file", name: path.basename(filePath), path: filePath, content: "" };
          if (!virtualFiles[filePath]) virtualFiles[filePath] = "";
          logMsg = `📄 Creating file: ${filePath}`;
          resultMessage = `Success: File ${filePath} was created.`;
        }
      } 
      
      // 3. Set-Content / cat << EOF
      else if (command.includes("Set-Content") || command.includes("cat <<")) {
        let filePath = "";
        let content = "";
        if (command.includes("cat <<")) {
          const m = command.match(/cat <<\s*['"]?EOF['"]?\s*>\s*(?:["']([^"']+)["']|([^\s;]+))/i);
          if (m) {
            filePath = (m[1] || m[2]).replace(/\\+/g, "/");
            const lines = command.split("\n");
            const start = lines.findIndex((l) => l.includes("cat <<"));
            const end = lines.findIndex((l) => l.trim() === "EOF");
            if (start !== -1 && end !== -1 && end > start) content = lines.slice(start + 1, end).join("\n");
          }
        } else {
          const pathMatch = command.match(/Set-Content\s+-Path\s+(?:["']([^"']+)["']|([^\s;]+))/i);
          const contentMatch = command.match(/@'([\s\S]*?)'@/);
          if (pathMatch && contentMatch) {
            filePath = (pathMatch[1] || pathMatch[2]).replace(/\\+/g, "/");
            content = contentMatch[1];
          }
        }
        if (filePath) {
          fileOp = { type: "write_file", name: path.basename(filePath), path: filePath, content };
          virtualFiles[filePath] = content;
          logMsg = `✏️ Writing to: ${filePath}`;
          resultMessage = `Success: ${filePath} updated (${content.length} bytes).`;
        }
      } 

      // 4. cat / Get-Content / Reading
      else if (command.toLowerCase().includes("cat") || command.toLowerCase().includes("get-content")) {
        // Robust match for reading
        const catMatch = command.match(/(?:cat|Get-Content)\s+(?:["']([^"']+)["']|([^\s;]+))/i);
        if (catMatch) {
          const fullPath = (catMatch[1] || catMatch[2]).replace(/\\+/g, "/");
          logMsg = `📖 Reading file: ${fullPath}`;
          const content = virtualFiles[fullPath];
          resultMessage = content !== undefined 
            ? `Output of ${fullPath}:\n---\n${content}\n---\nTask executed completely.`
            : `Error: File ${fullPath} not found. Ensure it was created with touch or Set-Content first.`;
        }
      }

      // 5. ls / dir
      else if (command.match(/^\s*(ls|dir)\b/i)) {
        logMsg = `📋 Listing directory contents`;
        const files = Object.keys(virtualFiles).join("\n");
        resultMessage = `Existing files in simulation:\n${files || "(no files yet)"}`;
      }

      // Final: emit side effects
      if (onProgress) {
        if (fileOp) onProgress({ type: "file", payload: fileOp });
        if (logMsg) onProgress({ type: "message", text: logMsg });
      }
      if (fileOp) collectedFileOps.push(fileOp);
      if (logMsg) collectedMessages.push(logMsg);

      return resultMessage;
    };

    // ── Tool Definition ────────────────────────────────────────────────────
    const executeCommandTool = tool(
      async ({ command }) => {
        const result = await executeCommandInLoop(command);
        console.log(`✅ [Tool]: ${command.substring(0, 40)}${command.length > 40 ? "..." : ""} => ${result.substring(0, 60)}...`);
        return result;
      },
      {
        name: "executeCommand",
        description: "Execute a single terminal/shell command.",
        schema: z.object({
          command: z.string().describe("The terminal command to execute"),
        }),
      }
    );

    const tools = [executeCommandTool];
    const toolNode = new ToolNode(tools);

    // ── Inner StateGraph (same pattern as original graphAgent.js) ──────────
    // Each node returns ONLY its delta (new messages).
    // LangGraph's reducer (x.concat(y)) merges them into full state automatically.
    const innerState = {
      messages: {
        value: (x, y) => x.concat(y),
        default: () => [],
      },
    };

    const callModel = async (innerStateObj) => {
      const model = getLLM(apiKey, { title: "GenForge Generation Agent" }).bindTools(tools);
      
      console.log("\n--- [Agent: Thinking...] ---");
      const response = await model.invoke([
        ["system", systemInstruction],
        ...innerStateObj.messages,
      ]);

      if (response.content) {
        console.log(`\n--- [Agent: Response] ---\n${response.content}\n`);
        if (onProgress) onProgress({ type: "message", text: response.content });
        collectedMessages.push(response.content);
      }
      if (response.tool_calls && response.tool_calls.length > 0) {
        response.tool_calls.forEach(tc => {
          console.log(`🔧 [Tool Call]: ${tc.name}(${JSON.stringify(tc.args)})`);
        });
      }

      // Return ONLY the new AI message — LangGraph reducer appends it
      return { messages: [response] };
    };

    const shouldContinue = (innerStateObj) => {
      const lastMsg = innerStateObj.messages[innerStateObj.messages.length - 1];
      return lastMsg.tool_calls?.length ? "tools" : END;
    };

    const agentGraph = new StateGraph({ channels: innerState })
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent");

    const compiledGraph = agentGraph.compile();

    // ── Run the graph ──────────────────────────────────────────────────────
    console.log(`[callLLMNode] Starting inner agent loop with recursionLimit: 150`);
    const finalInnerState = await compiledGraph.invoke(
      { messages: [new HumanMessage(prompt)] },
      { recursionLimit: 150 }
    );

    // Extract the final text message
    const lastMsg = finalInnerState.messages[finalInnerState.messages.length - 1];
    const finalMessage =
      lastMsg instanceof AIMessage && typeof lastMsg.content === "string"
        ? lastMsg.content
        : JSON.stringify(lastMsg?.content ?? "Application generated!");

    console.log(
      `[callLLMNode] Done. FileOps: ${collectedFileOps.length}, AgentMessages: ${collectedMessages.length}`
    );

    return {
      fileOperations: collectedFileOps,
      agentMessages: collectedMessages,
      finalMessage,
      messages: finalInnerState.messages,
      status: "llm_done",
    };
  };
}
