import { Ollama } from '@langchain/ollama';

const model = new Ollama({
  model: 'codellama',
  temperature: 0.2,
});

function addNumbers(a, b) {
  return a + b;
}

const userPrompt = `
You are an AI that can call functions.
A function named "addNumbers" is available with this signature:
addNumbers(a: number, b: number) → number.

If user asks to add numbers, call the function with correct parameters.

User: Add 12 and 30.
`;

async function run() {
  console.log('🧠 Sending prompt to CodeLlama...\n');
  const response = await model.call(userPrompt);
  console.log('🤖 Model Response:', response);

  const match = response.match(/addNumbers\((\d+),\s*(\d+)\)/);
  if (match) {
    const a = parseInt(match[1]);
    const b = parseInt(match[2]);
    const result = addNumbers(a, b);
    console.log(`✅ Function called: addNumbers(${a}, ${b}) = ${result}`);
  } else {
    console.log('⚠️ Model did not return a function call.');
  }
}

run();
