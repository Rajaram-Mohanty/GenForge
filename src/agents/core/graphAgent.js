import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, END } from "@langchain/langgraph";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import os from "os";

const platform = os.platform();

// Helper to create AI instance (no longer used for direct GoogleGenAI)
function createAIInstance(apiKey) {
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- State Definition ---
// We use a simple message list state
const graphState = {
  messages: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
};

// --- Tool Definition ---
// We wrap the executeCommand logic into a LangChain tool

async function executeCommandImpl({ command, onProgress }) {
  try {
    let resultMessage = `Success: Command "${command}" would be executed`;
    let fileOp = null;
    let logMsg = null;

    // Parse command to extract file operations (simulation logic from agent.js)
    if (command.includes("mkdir")) {
      const dirMatch = command.match(/mkdir\s+(.+)/);
      if (dirMatch) {
        const dirName = dirMatch[1];
        fileOp = {
          type: "create_directory",
          name: dirName,
          path: dirName,
        };
        logMsg = `📁 Creating directory: ${dirName}`;
        resultMessage = `Success: Directory ${dirMatch ? dirMatch[1] : "unknown"} would be created`;
      }
    } else if (command.includes("touch") || command.includes("New-Item")) {
      const fileMatch = command.match(/(?:touch|New-Item.*-Path)\s+(.+)/);
      if (fileMatch) {
        const fileName = fileMatch[1].replace(/['"]/g, "");
        fileOp = {
          type: "create_file",
          name: fileName,
          path: fileName,
          content: "",
        };
        logMsg = `📄 Creating file: ${fileName}`;
        resultMessage = `Success: File ${fileMatch ? fileMatch[1].replace(/['"]/g, "") : "unknown"} would be created`;
      }
    } else if (command.includes("cat <<") || command.includes("Set-Content")) {
      // Extract file content
      let fileName = "";
      let content = "";

      if (command.includes("cat <<")) {
        const fileMatch = command.match(/cat << 'EOF' > (.+)/);
        if (fileMatch) {
          fileName = fileMatch[1];
          const lines = command.split("\n");
          const startIndex = lines.findIndex((line) => line.includes("cat <<"));
          const endIndex = lines.findIndex((line) => line.trim() === "EOF");
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            content = lines.slice(startIndex + 1, endIndex).join("\n");
          }
        }
      } else if (command.includes("Set-Content")) {
        const fileMatch = command.match(/Set-Content -Path "(.+?)"/);
        if (fileMatch) {
          fileName = fileMatch[1];
          const contentMatch = command.match(/@'([\s\S]*?)'@/);
          if (contentMatch) {
            content = contentMatch[1];
          }
        }
      }

      if (fileName && content) {
        fileOp = {
          type: "write_file",
          name: fileName,
          path: fileName,
          content: content,
        };
        logMsg = `✏️ Writing content to: ${fileName}`;
        resultMessage = `Success: Content would be written to ${fileName || "unknown file"}`;
      }
    } else if (command.includes("cat ") && !command.includes("cat <<")) {
      const fileMatch = command.match(/cat\s+(.+)/);
      if (fileMatch) {
        const fileName = fileMatch[1];
        logMsg = `📖 Reading file: ${fileName}`;
        resultMessage = `Success: File ${fileMatch ? fileMatch[1] : "unknown"} would be read`;
      }
    } else if (command.includes("ls") || command.includes("dir")) {
      logMsg = `📋 Listing directory contents`;
      resultMessage = `Success: Directory contents would be listed`;
    }

    // Send progress updates if callback provided
    if (onProgress) {
      if (fileOp) onProgress({ type: "file", payload: fileOp });
      if (logMsg) onProgress({ type: "message", text: logMsg });
    }

    // Small delay to simulate work/avoid rate limits
    await sleep(500);

    return {
      result: resultMessage,
      fileOp: fileOp,
      logMsg: logMsg,
    };
  } catch (error) {
    return {
      result: `Error: ${error.message || error}`,
      fileOp: null,
      logMsg: null,
    };
  }
}

// We need a slightly different approach for tools in LangGraph if we want to stream side effects
// Since the tool execution happens inside ToolNode, we can't easily pass the onProgress callback directly
// unless we use a global or context, or if the tool itself emits events (which is complex here).
//
// Workaround: We will use a custom tool implementation that we can inject the callback into before running the graph,
// OR we rely on the fact that we can't capture side-effects easily *during* tool execution in standard ToolNode
// without custom setup.
//
// Better approach for this specific "Simulation" agent:
// We can define the tool such that it returns the "fileOp" and "logMsg" as part of its output string (JSON),
// and then the Agent Node (or a listener) parses that and calls onProgress.
// BUT, the easiest way to keep existing logic is to make the tool capable of side-effects if we can close over the scope.
// Since `runAgent` creates the graph, we can define the tool *inside* runAgent so it has access to `onProgress`.

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
- The syntax is: \`@' ... multiline content here ... '@ | Set-Content -Path "path\\to\\file.js"\`
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

export async function runAgent(userProblem, apiKey, onProgress) {
  const ai = createAIInstance(apiKey);

  // Arrays to hold side-effects that we need to return at the end
  const collectedFileOperations = [];
  const collectedMessages = [];

  // Define the tool with access to onProgress and collectors
  const executeCommandTool = tool(
    async ({ command }) => {
      const result = await executeCommandImpl({
        command,
        onProgress: (payload) => {
          // Forward to SSE
          if (onProgress) onProgress(payload);

          // Collect for final return
          if (payload.type === "file")
            collectedFileOperations.push(payload.payload);
          if (payload.type === "message") collectedMessages.push(payload.text);
        },
      });
      return result.result;
    },
    {
      name: "executeCommand",
      description: "Execute a single terminal/shell command.",
      schema: z.object({
        command: z.string().describe("The single terminal command to execute"),
      }),
    },
  );

  const tools = [executeCommandTool];
  const toolNode = new ToolNode(tools);

  // Define the Agent Node
  const callModel = async (state) => {
    const messages = state.messages;

    // Convert LangChain messages to Gemini format if needed, but @google/genai SDK
    // is different from LangChain's ChatGoogleGenerativeAI.
    // Important: methods.generateContent from @google/genai is raw API.
    // But LangGraph expects to work with LangChain models usually.
    //
    // To make this work seamlessly with LangGraph's prebuilt ToolNode, we should use
    // langchain's ChatGoogleGenerativeAI adapter if possible, OR we manually handle tool calls.
    //
    // Given dependencies: "@langchain/google-genai": "^2.0.0" is available.
    // Let's use `ChatGoogleGenerativeAI` from langchain which supports tool binding.

    const { ChatOpenAI } = await import("@langchain/openai");

    const model = new ChatOpenAI({
      modelName: "google/gemini-2.5-flash",
      apiKey: apiKey,
      maxTokens: 4000,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://genforge.com",
          "X-Title": "GenForge Agent",
        }
      },
      temperature: 0,
    }).bindTools(tools);

    const response = await model.invoke([
      ["system", systemInstruction],
      ...messages,
    ]);

    return { messages: [response] };
  };

  // Define checks
  const shouldContinue = (state) => {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    return END;
  };

  // Build Graph
  const workflow = new StateGraph({ channels: graphState })
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  const app = workflow.compile();

  // Run the graph
  // We use streamEvents or simple stream to get "thinking" updates if possible,
  // but for now we just rely on tool outputs for progress.

  const finalState = await app.invoke({
    messages: [new HumanMessage(userProblem)],
  });

  // Extract final message
  const lastMsg = finalState.messages[finalState.messages.length - 1];
  let finalMessageText = "Application generated!";
  if (lastMsg instanceof AIMessage) {
    finalMessageText = lastMsg.content;
  }

  // Return the structure expected by projectController
  return {
    messages: collectedMessages,
    fileOperations: collectedFileOperations,
    finalMessage:
      typeof finalMessageText === "string"
        ? finalMessageText
        : JSON.stringify(finalMessageText),
  };
}
