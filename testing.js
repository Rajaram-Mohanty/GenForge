import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import readlineSync from 'readline-sync';
import { exec } from "child_process";
import { promisify } from "util";
import os from 'os';
import fs from "fs";
import path from "path";

// --- Configuration ---
const platform = os.platform();
const asyncExecute = promisify(exec);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ⚠️ PLACE YOUR OPENROUTER API KEY HERE
const OPENROUTER_API_KEY = "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"; 
// Choose your model (e.g., "google/gemini-2.0-flash-001" or "anthropic/claude-3.5-sonnet")
const MODEL_NAME = "google/gemini-2.5-flash";

if (!OPENROUTER_API_KEY) {
    console.warn("⚠️ Warning: OPENROUTER_API_KEY is empty. Please provide it in testing.js");
}

// --- Tool Definition (From index.js logic) ---

const executeCommandTool = tool(
    async ({ command }) => {
        try {
            console.log(`\n[Executing]: ${command}`);
            
            // 👇 Check if it's a PowerShell heredoc write command (Windows logic from index.js)
            if (
                platform === "win32" &&
                command.includes("Set-Content") &&
                command.includes("@'") &&
                command.includes("'@")
            ) {
                const heredocMatch = command.match(/@'(.*?)'@/s);
                const fileMatch = command.match(/Set-Content\s+-Path\s+"?(.+?)"?$/);

                if (heredocMatch && fileMatch) {
                    const fileContent = heredocMatch[1];
                    const destPath = fileMatch[1].replace(/\\+/g, "\\");

                    const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.txt`);
                    fs.writeFileSync(tempFilePath, fileContent, "utf8");

                    const powershellCmd = `powershell -Command "Get-Content '${tempFilePath}' | Set-Content -Path '${destPath}'"`;

                    const { stdout, stderr } = await asyncExecute(powershellCmd);

                    if (stderr) return `Error: ${stderr}`;
                    return `Success: ${stdout || "Wrote file using temp workaround"} || Task executed completely`;
                }
            }

            // 🔁 Fallback: run the original command
            const { stdout, stderr } = await asyncExecute(command);
            if (stderr) return `Error: ${stderr}`;
            return `Success: ${stdout} || Task executed completely`;
        } catch (error) {
            return `Error: ${error.message || error}`;
        }
    },
    {
        name: "executeCommand",
        description: "Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file",
        schema: z.object({
            command: z.string().describe('The single terminal command to execute. Ex: "mkdir calculator"'),
        }),
    }
);

const tools = [executeCommandTool];
const toolNode = new ToolNode(tools);

// --- LangGraph State Definition ---

const graphState = {
    messages: {
        value: (x, y) => x.concat(y),
        default: () => [],
    },
};

// --- Agent Logic ---

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

const model = new ChatOpenAI({
    modelName: MODEL_NAME,
    apiKey: OPENROUTER_API_KEY,
    maxTokens: 4000,
    configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": "https://genforge.com", // Optional, change as needed
            "X-Title": "GenForge Agent",
        }
    },
    temperature: 0,
}).bindTools(tools);

const callModel = async (state) => {
    const { messages } = state;
    const response = await model.invoke([
        new SystemMessage(systemInstruction),
        ...messages
    ]);
    return { messages: [response] };
};

const shouldContinue = (state) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return "tools";
    }
    return END;
};

// --- Build the Graph ---

const workflow = new StateGraph({ channels: graphState })
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

const checkpointer = new MemorySaver();
const app = workflow.compile({ checkpointer });

// --- CLI Loop ---

async function runAgent(prompt) {
    const config = { configurable: { thread_id: "testing_thread" } };
    
    // We stream the execution to see what's happening
    const stream = await app.stream(
        { messages: [new HumanMessage(prompt)] },
        config
    );

    for await (const chunk of stream) {
        const [nodeName, stateUpdate] = Object.entries(chunk)[0];
        console.log(`--- [Node: ${nodeName}] ---`);
        
        if (stateUpdate.messages) {
            const lastMsg = stateUpdate.messages[stateUpdate.messages.length - 1];
            if (lastMsg.content) {
                console.log(lastMsg.content);
            }
            if (lastMsg.tool_calls) {
                lastMsg.tool_calls.forEach(tc => {
                    console.log(`Tool Call: ${tc.name}(${JSON.stringify(tc.args)})`);
                });
            }
        }
    }
}

async function main() {
    console.log("\n🚀 GenForge Testing Agent (OpenRouter + LangGraph)");
    console.log("--------------------------------------------------");
    
    while (true) {
        const userProblem = readlineSync.question("\nAsk me anything--> ");
        if (userProblem.toLowerCase() === 'exit') break;
        
        try {
            await runAgent(userProblem);
        } catch (error) {
            console.error("❌ Error running agent:", error);
        }
    }
}

main();
