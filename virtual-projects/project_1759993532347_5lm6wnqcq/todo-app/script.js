
document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoList = document.getElementById('todoList');

    // Load todos from local storage
    let todos = JSON.parse(localStorage.getItem('todos')) || [];

    const saveTodos = () => {
        localStorage.setItem('todos', JSON.stringify(todos));
    };

    const renderTodos = () => {
        todoList.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = todo.completed ? 'completed' : '';
            li.innerHTML = `
                <span>${todo.text}</span>
                <button data-index="${index}">Delete</button>
            `;
            todoList.appendChild(li);
        });
    };

    const addTodo = () => {
        const todoText = todoInput.value.trim();
        if (todoText !== '') {
            todos.push({ text: todoText, completed: false });
            todoInput.value = '';
            saveTodos();
            renderTodos();
        }
    };

    const deleteTodo = (index) => {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    };

    const toggleComplete = (index) => {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
    };

    addTodoBtn.addEventListener('click', addTodo);

    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    todoList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index);
            deleteTodo(index);
        } else if (e.target.tagName === 'SPAN') {
            const li = e.target.closest('li');
            const index = Array.from(todoList.children).indexOf(li);
            toggleComplete(index);
        }
    });

    renderTodos();
});
