
document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoList = document.getElementById('todo-list');

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    function addTodo() {
        const todoText = todoInput.value.trim();
        if (todoText === '') {
            alert('Please enter a todo item.');
            return;
        }

        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span>${todoText}</span>
            <button>Delete</button>
        `;

        // Toggle completion on click
        listItem.querySelector('span').addEventListener('click', () => {
            listItem.classList.toggle('completed');
        });

        // Delete todo item
        listItem.querySelector('button').addEventListener('click', () => {
            todoList.removeChild(listItem);
        });

        todoList.appendChild(listItem);
        todoInput.value = ''; // Clear input
    }
});
