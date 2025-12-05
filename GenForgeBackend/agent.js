import { GoogleGenAI } from "@google/genai";
import os from 'os';

const platform = os.platform();

// Function to create AI instance with provided API key
function createAIInstance(apiKey) {
  return new GoogleGenAI({ apiKey: apiKey });
}

const executeCommandDeclaration = {
  name: "executeCommand",
  description: "Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file",
  parameters: {
    type: 'OBJECT',
    properties: {
      command: {
        type: 'STRING',
        description: 'It will be a single terminal command. Ex: "mkdir calculator"'
      },
    },
    required: ['command']
  }
}

async function runAgent(userProblem, apiKey) {
  // Initialize local state for this specific request
  // This ensures no data leaks between different requests/users
  const History = [];
  const fileOperations = [];
  const messages = [];

  // Define executeCommand locally so it can access the local arrays
  async function executeCommand({ command }) {
    try {
      // Parse command to extract file operations (but don't execute actual shell commands)
      if (command.includes('mkdir')) {
        const dirMatch = command.match(/mkdir\s+(.+)/);
        if (dirMatch) {
          const dirName = dirMatch[1];
          fileOperations.push({
            type: 'create_directory',
            name: dirName,
            path: dirName
          });
          messages.push(`📁 Creating directory: ${dirName}`);
        }
        return `Success: Directory ${dirMatch ? dirMatch[1] : 'unknown'} would be created`;
      } else if (command.includes('touch') || command.includes('New-Item')) {
        const fileMatch = command.match(/(?:touch|New-Item.*-Path)\s+(.+)/);
        if (fileMatch) {
          const fileName = fileMatch[1].replace(/['"]/g, '');
          fileOperations.push({
            type: 'create_file',
            name: fileName,
            path: fileName,
            content: ''
          });
          messages.push(`📄 Creating file: ${fileName}`);
        }
        return `Success: File ${fileMatch ? fileMatch[1].replace(/['"]/g, '') : 'unknown'} would be created`;
      } else if (command.includes('cat <<') || command.includes('Set-Content')) {
        // Extract file content from cat or Set-Content commands
        let fileName = '';
        let content = '';

        if (command.includes('cat <<')) {
          const fileMatch = command.match(/cat << 'EOF' > (.+)/);
          if (fileMatch) {
            fileName = fileMatch[1];
            // Extract content between cat command and EOF
            const lines = command.split('\n');
            const startIndex = lines.findIndex(line => line.includes('cat <<'));
            const endIndex = lines.findIndex(line => line.trim() === 'EOF');

            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
              content = lines.slice(startIndex + 1, endIndex).join('\n');
            }
          }
        } else if (command.includes('Set-Content')) {
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
          fileOperations.push({
            type: 'write_file',
            name: fileName,
            path: fileName,
            content: content
          });
          messages.push(`✏️ Writing content to: ${fileName}`);
        }
        return `Success: Content would be written to ${fileName || 'unknown file'}`;
      } else if (command.includes('cat ') && !command.includes('cat <<')) {
        // Handle cat commands for reading files (validation)
        const fileMatch = command.match(/cat\s+(.+)/);
        if (fileMatch) {
          const fileName = fileMatch[1];
          messages.push(`📖 Reading file: ${fileName}`);
        }
        return `Success: File ${fileMatch ? fileMatch[1] : 'unknown'} would be read`;
      } else if (command.includes('ls') || command.includes('dir')) {
        // Handle directory listing commands
        messages.push(`📋 Listing directory contents`);
        return `Success: Directory contents would be listed`;
      }

      // For any other commands, just return success without executing
      return `Success: Command "${command}" would be executed`;

    } catch (error) {
      return `Error: ${error.message || error}`;
    }
  }

  const availableTools = {
    executeCommand
  }

  // Create AI instance with provided API key
  const ai = createAIInstance(apiKey);

  History.push({
    role: 'user',
    parts: [{ text: userProblem }]
  });

  let response;
  while (true) {
    try {
      // Implement Sliding Window: Keep only the last 20 messages to save resources
      // We always keep the system instruction (handled by config)
      let contextWindow = History;
      if (History.length > 20) {
        // Always keep the first message (User prompt) to maintain context
        const firstMessage = History[0];

        // Calculate slice index for the tail
        // We want roughly the last 19 messages
        let sliceIndex = History.length - 19;

        // Ensure we start at an odd index (Model role) to keep pairs intact
        // In this specific loop structure: 0=User, 1=Model, 2=User, 3=Model...
        // Odd indices are Model (Function Call), Even indices are User (Function Response)
        // We must not start with a Function Response (Even index > 0) without its Call
        if (sliceIndex % 2 === 0) {
          sliceIndex--;
        }

        // Ensure we don't go below 1 (since 0 is already handled)
        if (sliceIndex < 1) sliceIndex = 1;

        contextWindow = [firstMessage, ...History.slice(sliceIndex)];
      }

      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contextWindow,
        config: {
          systemInstruction: `You are an expert AI agent specializing in automated frontend web development. Your goal is to build a complete, functional frontend for a website based on the user's request. You operate by executing terminal commands one at a time using the 'executeCommand' tool.

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
`,
          tools: [{
            functionDeclarations: [executeCommandDeclaration]
          }],
        },
      });
    } catch (error) {
      // Handle API errors
      if (error.message && error.message.includes('quota') || error.message.includes('429')) {
        throw new Error('API_QUOTA_EXCEEDED');
      } else if (error.message && error.message.includes('API key')) {
        throw new Error('INVALID_API_KEY');
      } else {
        throw new Error(`API_ERROR: ${error.message}`);
      }
    }

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(response.functionCalls);
      const { name, args } = response.functionCalls[0];

      const funCall = availableTools[name];

      const result = await funCall(args);

      const functionResponsePart = {
        name: name,
        response: {
          result: result,
        },
      };

      // model 
      History.push({
        role: "model",
        parts: [
          {
            functionCall: response.functionCalls[0],
          },
        ],
      });

      // result Ko history daalna
      History.push({
        role: "user",
        parts: [
          {
            functionResponse: functionResponsePart,
          },
        ],
      });
    }
    else {
      // Add final summary message
      const finalText = response.text || "Application generated successfully!";
      messages.push(finalText);

      History.push({
        role: 'model',
        parts: [{ text: finalText }]
      })
      console.log(finalText);
      break;
    }
  }

  // Return structured response
  return {
    messages: messages,
    fileOperations: fileOperations,
    finalMessage: "Application generated successfully!"
  };
}

export default runAgent;

// async function main() {

//   console.log("I am a cursor: let's create a website");
//   const userProblem = readlineSync.question("Ask me anything--> ");
//   await runAgent(userProblem);
//   main();
// }


// main(); 

