
const screen = document.querySelector('.screen');
const buttons = Array.from(document.getElementsByClassName('button'));

let currentInput = '0';
let previousValue = null;
let currentOperator = null;

function updateScreen() {
  screen.value = currentInput;
}

function handleDigit(digit) {
  if (currentInput === '0') {
    currentInput = digit;
  } else {
    currentInput += digit;
  }
  updateScreen();
}

function handleDot() {
  if (!currentInput.includes('.')) {
    currentInput += '.';
    updateScreen();
  }
}

function applyOperation() {
  if (previousValue === null || currentOperator === null) return;
  const a = parseFloat(previousValue);
  const b = parseFloat(currentInput);
  let result = a;
  switch (currentOperator) {
    case '+':
      result = a + b;
      break;
    case '-':
      result = a - b;
      break;
    case '*':
      result = a * b;
      break;
    case '/':
      result = b === 0 ? 'Error' : a / b;
      break;
  }
  currentInput = String(result);
  previousValue = null;
  currentOperator = null;
  updateScreen();
}

function handleOperator(op) {
  if (currentOperator !== null) {
    // Chain operations: compute previous first
    applyOperation();
  }
  previousValue = currentInput;
  currentOperator = op;
  currentInput = '0';
}

function handleClear() {
  currentInput = '0';
  previousValue = null;
  currentOperator = null;
  updateScreen();
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const label = button.textContent.trim();
    if (/^\d$/.test(label)) {
      handleDigit(label);
      return;
    }
    if (label === '.') {
      handleDot();
      return;
    }
    if (label === 'C') {
      handleClear();
      return;
    }
    if (label === '=') {
      applyOperation();
      return;
    }
    if (['+', '-', '*', '/'].includes(label)) {
      handleOperator(label);
      return;
    }
  });
});

// Initialize display
updateScreen();
