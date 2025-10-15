import ollama from 'ollama';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

const platform = os.platform();

// Store conversation history
const History = [];

// Store file operations and messages
let fileOperations = [];
let messages = [];
let sessionBaseDir = '';

function ensureWithinSessionDir(targetPath) {
  const resolved = path.resolve(targetPath);
  const base = path.resolve(sessionBaseDir);
  if (!resolved.startsWith(base)) {
    throw new Error('SECURITY: Attempt to access path outside session directory');
  }
  return resolved;
}

function resolveInSession(relativeOrAbsolutePath) {
  const cleaned = relativeOrAbsolutePath.replace(/^["']|["']$/g, '');
  const normalized = path.normalize(cleaned);
  const joined = path.isAbsolute(normalized)
    ? normalized
    : path.join(sessionBaseDir, normalized);
  return ensureWithinSessionDir(joined);
}

function extractCommandsFromText(text) {
  const commands = [];
  if (!text || typeof text !== 'string') return commands;

  // 1) PowerShell here-string writes: @'... '@ | Set-Content -Path "..."
  const hereStringRegex = /@'([\s\S]*?)'@\s*\|\s*Set-Content\s+-Path\s+"([^"]+)"/g;
  let hsMatch;
  while ((hsMatch = hereStringRegex.exec(text)) !== null) {
    const full = hsMatch[0];
    commands.push(full);
  }

  // 2) Bash here-doc writes: cat << 'EOF' > path ... EOF
  const hereDocRegex = /cat\s<<\s'EOF'\s*>\s*(.+?)\n([\s\S]*?)\nEOF/g;
  let hdMatch;
  while ((hdMatch = hereDocRegex.exec(text)) !== null) {
    const full = `cat << 'EOF' > ${hdMatch[1]}\n${hdMatch[2]}\nEOF`;
    commands.push(full);
  }

  // 3) Inline backticked commands: `mkdir x`, `touch a`, `New-Item -Path ...`, `dir ...`, `ls ...`, `Get-Content ...`, `cat ...`
  const backtickRegex = /`([^`\n]+)`/g;
  let btMatch;
  while ((btMatch = backtickRegex.exec(text)) !== null) {
    const cmd = btMatch[1].trim();
    if (cmd) commands.push(cmd);
  }

  // 4) Lines that look like commands without backticks (fallback)
  const lineCmdPatterns = [
    /^(mkdir\s+.+)$/i,
    /^(touch\s+.+)$/i,
    /^(New-Item\s+.+)$/i,
    /^(Set-Content\s+.+)$/i,
    /^(dir\s+.*)$/i,
    /^(ls\s+.*)$/i,
    /^(Get-Content\s+.+)$/i,
    /^(cat\s+[^<].*)$/i,
  ];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    for (const pattern of lineCmdPatterns) {
      const m = trimmed.match(pattern);
      if (m) {
        commands.push(m[1]);
        break;
      }
    }
  }

  // Deduplicate while preserving order
  const seen = new Set();
  const unique = [];
  for (const c of commands) {
    if (!seen.has(c)) {
      seen.add(c);
      unique.push(c);
    }
  }
  return unique;
}

async function executeCommand({ command }) {
  try {
    // Parse command to extract file operations (but don't execute actual shell commands)
    if (command.includes('mkdir')) {
      const dirMatch = command.match(/mkdir\s+(.+)/);
      if (dirMatch) {
        const dirName = dirMatch[1].trim();
        const fullPath = resolveInSession(dirName);
        await fs.mkdir(fullPath, { recursive: true });
        fileOperations.push({
          type: 'create_directory',
          name: dirName,
          path: fullPath
        });
        messages.push(`📁 Creating directory: ${path.relative(sessionBaseDir, fullPath)}`);
      }
      return `Success: Directory ${dirMatch ? dirMatch[1] : 'unknown'} would be created`;
    } else if (command.includes('touch') || command.includes('New-Item')) {
      const fileMatch = command.match(/(?:touch|New-Item.*-Path)\s+(.+)/);
      if (fileMatch) {
        const fileName = fileMatch[1].replace(/['"]/g, '').trim();
        const fullPath = resolveInSession(fileName);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, '');
        fileOperations.push({
          type: 'create_file',
          name: fileName,
          path: fullPath,
          content: ''
        });
        messages.push(`📄 Creating file: ${path.relative(sessionBaseDir, fullPath)}`);
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
        const fullPath = resolveInSession(fileName);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
        fileOperations.push({
          type: 'write_file',
          name: fileName,
          path: fullPath,
          content: content
        });
        messages.push(`✏️ Writing content to: ${path.relative(sessionBaseDir, fullPath)}`);
      }
      return `Success: Content would be written to ${fileName || 'unknown file'}`;
    } else if ((command.includes('cat ') && !command.includes('cat <<')) || command.includes('Get-Content')) {
      // Handle cat commands for reading files (validation)
      let target = '';
      const catMatch = command.match(/cat\s+(.+)/);
      const getContentMatch = command.match(/Get-Content\s+"?(.+?)"?$/);
      if (catMatch) {
        target = catMatch[1].trim();
      } else if (getContentMatch) {
        target = getContentMatch[1].trim();
      }
      if (target) {
        const fullPath = resolveInSession(target);
        const data = await fs.readFile(fullPath, 'utf8');
        messages.push(`📖 Reading file: ${path.relative(sessionBaseDir, fullPath)}`);
        return `Success: Read file ${target}\n${data}`;
      }
      return `Error: No file specified`;
    } else if (command.includes('ls') || command.includes('dir')) {
      // Handle directory listing commands
      let dirTarget = '';
      const lsMatch = command.match(/ls(?:\s+-F)?\s*(.*)/);
      const dirMatch2 = command.match(/dir(?:\s+\/B)?\s*(.*)/i);
      if (lsMatch && lsMatch[1]) dirTarget = lsMatch[1].trim();
      if (dirMatch2 && dirMatch2[1]) dirTarget = dirMatch2[1].trim();
      const fullPath = resolveInSession(dirTarget || '.');
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const listing = entries.map(e => (e.isDirectory() ? e.name + '/' : e.name)).join('\n');
      messages.push(`📋 Listing directory contents`);
      return `Success: Directory contents for ${path.relative(sessionBaseDir, fullPath) || '.'}\n${listing}`;
    }

    // For any other commands, just return success without executing
    return `Success: Command "${command}" would be executed`;
    
  } catch (error) {
    return `Error: ${error.message || error}`;
  }
}

// Tool definition for Ollama
const tools = [
  {
    type: 'function',
    function: {
      name: 'executeCommand',
      description: 'Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'It will be a single terminal command. Ex: "mkdir calculator"'
          }
        },
        required: ['command']
      }
    }
  }
];

// Available tools mapping
const availableTools = {
  executeCommand
};

async function runAgent(userProblem, modelName = 'mistral:latest') {
  // Reset file operations and messages for new request
  fileOperations = [];
  messages = [];
  const uniqueId = Math.random().toString(36).slice(2, 10);
  sessionBaseDir = path.join(process.cwd(), 'virtual-projects', `project_${Date.now()}_${uniqueId}`);
  await fs.mkdir(sessionBaseDir, { recursive: true });

  // System prompt
  const systemPrompt = `You are an expert AI agent specializing in automated frontend web development. Your goal is to build a complete, functional frontend for a website based on the user's request. You operate by executing terminal commands one at a time using the 'executeCommand' tool.

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
Once all files are created and validated, your final response MUST be a plain text message to the user, summarizing what you did and where the files are located. Do not call any more tools at this point.`;

  // Initialize conversation with system message and user message
  const conversationMessages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userProblem
    }
  ];

  let continueLoop = true;
  let iterationCount = 0;
  const maxIterations = 50; // Prevent infinite loops

  while (continueLoop && iterationCount < maxIterations) {
    iterationCount++;
    
    try {
      // Call Ollama with streaming enabled for real-time output
      const stream = await ollama.chat({
        model: modelName,
        messages: conversationMessages,
        tools: tools,
        stream: true
      });

      let assistantContent = '';
      let assistantToolCalls = [];
      let printedAny = false;

      // Stream chunks as they arrive
      for await (const part of stream) {
        if (part?.message?.content) {
          const chunk = part.message.content;
          process.stdout.write(chunk);
          assistantContent += chunk;
          printedAny = true;
        }
        if (part?.message?.tool_calls && part.message.tool_calls.length > 0) {
          assistantToolCalls = part.message.tool_calls;
          if (!printedAny) {
            // Make it clear something is happening even if content is empty
            process.stdout.write('\n[Model requested tool calls...]\n');
            printedAny = true;
          }
        }
        if (part?.done) {
          process.stdout.write('\n');
        }
      }

      // Build the assistant message for conversation memory
      const assistantMessage = {
        role: 'assistant',
        content: assistantContent
      };
      if (assistantToolCalls.length > 0) {
        assistantMessage.tool_calls = assistantToolCalls;
      }
      conversationMessages.push(assistantMessage);

      // If tools are requested, execute them and continue loop
      if (assistantToolCalls.length > 0) {
        console.log('Tool calls:', assistantToolCalls);
        for (const toolCall of assistantToolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = toolCall.function.arguments;
          if (availableTools[functionName]) {
            const result = await availableTools[functionName](functionArgs);
            conversationMessages.push({
              role: 'tool',
              content: result
            });
            // Also print tool results for visibility
            console.log(result);
          }
        }
      } else {
        // No tools requested; attempt to parse commands from the assistant's text and execute them
        const parsedCommands = extractCommandsFromText(assistantContent);
        if (parsedCommands.length > 0) {
          console.log('\n[Parsed commands from output]\n');
          for (const cmd of parsedCommands) {
            try {
              const result = await availableTools.executeCommand({ command: cmd });
              console.log(result);
              conversationMessages.push({ role: 'tool', content: result });
            } catch (e) {
              console.log(`Error executing parsed command: ${cmd}\n${e?.message || e}`);
            }
          }
          // After executing parsed commands, allow another loop iteration for validation steps
        } else {
          // No commands to execute; treat as final
          const finalText = assistantContent || "Application generated successfully!";
          messages.push(finalText);
          continueLoop = false;
        }
      }

    } catch (error) {
      console.error('Error during agent execution:', error);
      throw new Error(`OLLAMA_ERROR: ${error.message}`);
    }
  }

  if (iterationCount >= maxIterations) {
    console.log('\n⚠️ Maximum iterations reached. Stopping agent.');
    messages.push('Maximum iterations reached. Please check the generated files.');
  }

  // Return structured response
  return {
    messages: messages,
    fileOperations: fileOperations,
    finalMessage: messages[messages.length - 1] || "Application generated successfully!"
  };
}

// export default runAgent;

// Example usage (uncomment to test):
import readlineSync from 'readline-sync';

async function main() {
  console.log("I am a cursor: let's create a website");
  const userProblem = readlineSync.question("Ask me anything--> ");
  await runAgent(userProblem, 'mistral:latest');
  main();
}

main();