import 'dotenv/config';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGroq } from "@langchain/groq";
import { ChatCohere } from "@langchain/cohere";
import { ChatOllama } from "@langchain/ollama";
import { LLM } from "@langchain/core/language_models/llms";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import readlineSync from 'readline-sync';
import { exec } from "child_process";
import { promisify } from "util";
import os from 'os';
import fs from "fs";
import path from "path";
import { AgentExecutor, createStructuredChatAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

const asyncExecute = promisify(exec);
const platform = os.platform();

class HuggingFaceCustomLLM extends LLM {
    constructor(fields) {
        super(fields);
        this.model = fields.model;
        this.apiKey = fields.apiKey;
        this.baseUrl = fields.baseUrl || "https://api-inference.huggingface.co/models/";
    }

    _llmType() {
        return "huggingface_custom";
    }

    async _call(prompt, options) {
        const response = await fetch(`${this.baseUrl}${this.model}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    return_full_text: false,
                    max_new_tokens: 1024,
                    temperature: 0.01,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        // Handle different response formats (some models return array, some object)
        if (Array.isArray(result)) {
            return result[0].generated_text;
        }
        return result.generated_text;
    }
}

// --- Tool Definition ---

const executeCommand = tool(
    async ({ command }) => {
        try {
            // 👇 Check if it's a PowerShell heredoc write command (Windows specific optimization)
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

                    // Write to a temp file
                    const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.txt`);
                    fs.writeFileSync(tempFilePath, fileContent, "utf8");

                    // PowerShell command to copy from temp to destination
                    const powershellCmd = `powershell -Command "Get-Content '${tempFilePath}' | Set-Content -Path '${destPath}'"`;

                    const { stdout, stderr } = await asyncExecute(powershellCmd);

                    // Clean up temp file
                    try { fs.unlinkSync(tempFilePath); } catch (e) { }

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
            command: z.string().describe('It will be a single terminal command. Ex: "mkdir calculator"'),
        }),
    }
);

const tools = [executeCommand];

// --- Context & Rules ---

const OS_RULES = `
Your user's operating system is: ${platform}

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
`;

// --- Model Initialization ---

function getModel() {
    console.log("\n--- Model Configuration ---");
    console.log("Available Providers:");
    console.log("1. Google (Gemini)");
    console.log("2. OpenAI (GPT)");
    console.log("3. Anthropic (Claude)");
    console.log("4. Mistral AI");
    console.log("5. Groq (Llama, Mixtral)");
    console.log("6. Cohere");
    console.log("7. Ollama (Local)");
    console.log("8. Hugging Face");

    const choices = ['google', 'openai', 'anthropic', 'mistral', 'groq', 'cohere', 'ollama', 'huggingface'];
    const index = readlineSync.keyInSelect(choices, 'Select a provider');

    if (index === -1) {
        console.log("Operation cancelled.");
        process.exit(0);
    }

    const provider = choices[index];
    let apiKey = "";

    // Helper to get API Key
    const getApiKey = (envVarName, providerName) => {
        let key = process.env[envVarName];
        if (!key) {
            key = readlineSync.question(`Enter ${providerName} API Key: `, {
                hideEchoBack: true
            });
        }
        return key;
    };

    // Note: We are NOT binding tools here anymore. The AgentExecutor will handle tool calling via prompting.
    switch (provider) {
        case 'google': {
            apiKey = getApiKey('GOOGLE_API_KEY', 'Google');
            const modelName = readlineSync.question("Enter model name [default: gemini-2.0-flash-exp]: ") || "gemini-2.0-flash-exp";
            return new ChatGoogleGenerativeAI({
                modelName: modelName,
                apiKey: apiKey,
                temperature: 0,
            });
        }
        case 'openai': {
            apiKey = getApiKey('OPENAI_API_KEY', 'OpenAI');
            const modelName = readlineSync.question("Enter model name [default: gpt-4o]: ") || "gpt-4o";
            return new ChatOpenAI({
                modelName: modelName,
                apiKey: apiKey,
                temperature: 0,
            });
        }
        case 'anthropic': {
            apiKey = getApiKey('ANTHROPIC_API_KEY', 'Anthropic');
            const modelName = readlineSync.question("Enter model name [default: claude-3-5-sonnet-20241022]: ") || "claude-3-5-sonnet-20241022";
            return new ChatAnthropic({
                modelName: modelName,
                apiKey: apiKey,
                temperature: 0,
            });
        }
        case 'mistral': {
            apiKey = getApiKey('MISTRAL_API_KEY', 'Mistral');
            const modelName = readlineSync.question("Enter model name [default: mistral-large-latest]: ") || "mistral-large-latest";
            return new ChatMistralAI({
                modelName: modelName,
                apiKey: apiKey,
                temperature: 0,
            });
        }
        case 'groq': {
            apiKey = getApiKey('GROQ_API_KEY', 'Groq');
            const modelName = readlineSync.question("Enter model name [default: llama-3.3-70b-versatile]: ") || "llama-3.3-70b-versatile";
            return new ChatGroq({
                modelName: modelName,
                apiKey: apiKey,
                temperature: 0,
            });
        }
        case 'cohere': {
            apiKey = getApiKey('COHERE_API_KEY', 'Cohere');
            const modelName = readlineSync.question("Enter model name [default: command-r-plus]: ") || "command-r-plus";
            return new ChatCohere({
                model: modelName,
                apiKey: apiKey,
                temperature: 0,
            });
        }
        case 'ollama': {
            const baseUrl = readlineSync.question("Enter Ollama Base URL [default: http://localhost:11434]: ") || "http://localhost:11434";
            const modelName = readlineSync.question("Enter model name [default: llama3]: ") || "llama3";
            return new ChatOllama({
                baseUrl: baseUrl,
                model: modelName,
                temperature: 0,
            });
        }
        case 'huggingface': {
            apiKey = getApiKey('HUGGINGFACEHUB_API_KEY', 'Hugging Face');
            const modelName = readlineSync.question("Enter model name [default: meta-llama/Meta-Llama-3-8B-Instruct]: ") || "meta-llama/Meta-Llama-3-8B-Instruct";
            const llm = new HuggingFaceCustomLLM({
                model: modelName,
                apiKey: apiKey,
            });
            return llm;
        }
        default:
            throw new Error("Invalid provider selected");
    }
}

// --- Agent Loop ---

async function runAgent(model, userProblem) {

    // Define the Structured Chat Agent Prompt
    // This prompt teaches the model how to use tools via JSON blobs, making it independent of native tool calling.
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `
You are an expert AI agent specializing in automated frontend web development.
${OS_RULES}

Respond to the human as helpfully and accurately as possible. You have access to the following tools:

{tools}

Use a json blob to specify a tool by providing an action key (tool name) and an action_input key (tool input).

Valid "action" values: "Final Answer" or {tool_names}

Provide only ONE action per $JSON_BLOB, as shown:

\`\`\`
{{
  "action": $TOOL_NAME,
  "action_input": $INPUT
}}
\`\`\`

Follow this format:

Question: input question to answer
Thought: consider previous and subsequent steps
Action:
\`\`\`
$JSON_BLOB
\`\`\`
Observation: action result
... (repeat Thought/Action/Observation N times)
Thought: I know what to respond
Action:
\`\`\`
{{
  "action": "Final Answer",
  "action_input": "Final response to human"
}}
\`\`\`

Begin! Reminder to ALWAYS use the correct file writing method for ${platform}.
        `],
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = await createStructuredChatAgent({
        llm: model,
        tools,
        prompt,
    });

    const executor = new AgentExecutor({
        agent,
        tools,
        verbose: true, // This will log the Thought/Action/Observation loop
        handleParsingErrors: true, // Helps if the model outputs malformed JSON
    });

    console.log("\n--- Agent Started (Structured Chat Mode) ---\n");

    try {
        const result = await executor.invoke({ input: userProblem });
        console.log("\n🤖 Agent Response:\n" + result.output);
    } catch (error) {
        console.error("Agent Error:", error);
    }
}

async function main() {
    console.log("Welcome to the Universal LangChain Agent!");

    let model;
    try {
        model = getModel();
    } catch (e) {
        console.error("Error initializing model:", e.message);
        return;
    }

    while (true) {
        const userProblem = readlineSync.question("\nAsk me anything (or 'exit' to quit) --> ");
        if (userProblem.toLowerCase() === 'exit') break;

        try {
            await runAgent(model, userProblem);
        } catch (error) {
            console.error("An error occurred during execution:", error);
        }
    }
}

main();
