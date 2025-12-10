(() => {
  // DOM elements
  const form = document.getElementById('todo-form');
  const taskInput = document.getElementById('task-input');
  const dateInput = document.getElementById('date-input');
  const taskList = document.getElementById('task-list');
  const formError = document.getElementById('form-error');
  const filterBtn = document.getElementById('filter-btn');
  const deleteAllBtn = document.getElementById('delete-all-btn');
  const emptyState = document.getElementById('empty-state');

  
  let tasks = []; // { id, text, dueDate (ISO), completed: bool }
  let filterMode = 'all'; // 'all' | 'pending' | 'completed'

  
  const STORAGE_KEY = 'soft-teal-todo-v1';

  
  function init() {
    loadFromStorage();
    render();
    attachListeners();
    // Set date input min to today
    dateInput.setAttribute('min', (new Date()).toISOString().split('T')[0]);
  }

  
  function attachListeners() {
    form.addEventListener('submit', onSubmit);
    filterBtn.addEventListener('click', onFilterClick);
    deleteAllBtn.addEventListener('click', onDeleteAll);
    taskList.addEventListener('click', onTaskListClick);
  }

  
  function onSubmit(e) {
    e.preventDefault();
    clearError();

    const text = taskInput.value.trim();
    const due = dateInput.value;

    const validation = validateInputs(text, due);
    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    addTask(text, due);
    form.reset();
    dateInput.setAttribute('min', (new Date()).toISOString().split('T')[0]);
    taskInput.focus();
  }

  
  function validateInputs(text, due) {
    if (!text) {
      return { valid:false, message: 'Task name cannot be empty.' };
    }
    if (!due) {
      return { valid:false, message: 'Please choose a valid due date.' };
    }
    const dueDate = new Date(due + 'T00:00:00');
    
    const today = new Date();
    today.setHours(0,0,0,0);
    if (isNaN(dueDate.getTime())) {
      return { valid:false, message: 'Invalid date format.' };
    }
    if (dueDate < today) {
      return { valid:false, message: 'Due date cannot be in the past.' };
    }
    return { valid:true };
  }

  
  function showError(msg) {
    formError.textContent = msg;
  }
  function clearError() {
    formError.textContent = '';
  }

  
  function addTask(text, due) {
    const newTask = {
      id: cryptoId(),
      text,
      dueDate: due, // ISO yyyy-mm-dd
      completed: false
    };
    tasks.unshift(newTask); // newest top
    saveToStorage();
    render();
  }

  
  function cryptoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + Math.floor(Math.random()*1000);
  }

  
  function render() {
    // filter tasks
    const filtered = tasks.filter(t => {
      if (filterMode === 'all') return true;
      if (filterMode === 'pending') return !t.completed;
      if (filterMode === 'completed') return t.completed;
    });

    
    taskList.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }

    filtered.forEach(task => {
      const tr = document.createElement('tr');
      tr.className = 'task-row';
      tr.dataset.id = task.id;

      
      const tdTask = document.createElement('td');
      tdTask.textContent = task.text;

      
      const tdDue = document.createElement('td');
      tdDue.textContent = formatDate(task.dueDate);

      
      const tdStatus = document.createElement('td');
      const spanStatus = document.createElement('span');
      spanStatus.className = 'status ' + (task.completed ? 'completed' : 'pending');
      spanStatus.textContent = task.completed ? 'Completed' : 'Pending';
      tdStatus.appendChild(spanStatus);

      
      const tdActions = document.createElement('td');

      const btnToggle = document.createElement('button');
      btnToggle.className = 'action-btn action-complete';
      btnToggle.dataset.action = 'toggle';
      btnToggle.title = task.completed ? 'Mark as pending' : 'Mark as completed';
      btnToggle.textContent = task.completed ? 'Undo' : 'Done';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'action-btn action-delete';
      btnDelete.dataset.action = 'delete';
      btnDelete.title = 'Delete task';
      btnDelete.textContent = 'Delete';

      tdActions.appendChild(btnToggle);
      tdActions.appendChild(btnDelete);

      tr.appendChild(tdTask);
      tr.appendChild(tdDue);
      tr.appendChild(tdStatus);
      tr.appendChild(tdActions);

      taskList.appendChild(tr);
    });

    
    updateFilterLabel();
  }

  
  function formatDate(isoDate) {
    try {
      const d = new Date(isoDate + 'T00:00:00');
      const opt = { year: 'numeric', month: 'short', day: 'numeric' };
      return d.toLocaleDateString(undefined, opt);
    } catch (err) {
      return isoDate;
    }
  }

  
  function onTaskListClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const tr = btn.closest('tr');
    const id = tr && tr.dataset.id;
    if (!id) return;

    if (action === 'toggle') {
      toggleComplete(id);
    } else if (action === 'delete') {
      deleteTask(id);
    }
  }

  
  function toggleComplete(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    tasks[idx].completed = !tasks[idx].completed;
    saveToStorage();
    render();
  }

  
  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveToStorage();
    render();
  }

  
  function onDeleteAll() {
    if (tasks.length === 0) return;
    const ok = confirm('Delete all tasks? This cannot be undone.');
    if (!ok) return;
    tasks = [];
    saveToStorage();
    render();
  }

  
  function onFilterClick() {
    if (filterMode === 'all') filterMode = 'pending';
    else if (filterMode === 'pending') filterMode = 'completed';
    else filterMode = 'all';
    render();
  }

  function updateFilterLabel() {
    let label = 'Filter: All';
    if (filterMode === 'pending') label = 'Filter: Pending';
    if (filterMode === 'completed') label = 'Filter: Completed';
    filterBtn.textContent = label;
  }

  
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Could not save tasks', e);
    }
  }
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) tasks = JSON.parse(raw);
    } catch (e) {
      tasks = [];
    }
  }

  // Initialize app
  init();

})();
