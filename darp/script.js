const STORAGE_KEY = 'todoTasks';

const state = {
  tasks: [],
  filter: 'all'
};

const elements = {};

const loadTasks = () => {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (!savedTasks) return [];

    const parsedTasks = JSON.parse(savedTasks);
    if (!Array.isArray(parsedTasks)) return [];

    // Stored browser data may be old or malformed, so validate it before rendering.
    return parsedTasks
      .filter((task) => task && typeof task === 'object'
        && typeof task.id === 'string'
        && typeof task.text === 'string'
        && typeof task.completed === 'boolean')
      .map((task) => ({
        id: task.id,
        text: task.text.trim(),
        completed: task.completed,
        createdAt: Number.isFinite(task.createdAt) && Math.abs(task.createdAt) <= 8.64e15
          ? task.createdAt
          : Date.now()
      }))
      .filter((task) => task.text.length > 0);
  } catch (error) {
    return [];
  }
};

const saveTasks = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch (error) {
    elements.formMessage.textContent = 'Your browser could not save changes on this device.';
  }
};

const createTaskId = () => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const addTask = (text) => {
  const cleanText = text.trim();
  if (!cleanText) return false;

  state.tasks.unshift({
    id: createTaskId(),
    text: cleanText,
    completed: false,
    createdAt: Date.now()
  });
  saveTasks();
  renderTasks();
  return true;
};

const updateTask = (taskId, text) => {
  const cleanText = text.trim();
  if (!cleanText) return false;

  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return false;

  task.text = cleanText;
  saveTasks();
  renderTasks();
  return true;
};

const deleteTask = (taskId) => {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
};

const toggleTask = (taskId) => {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();
};

const clearCompleted = () => {
  state.tasks = state.tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
};

const setFilter = (filter) => {
  if (!['all', 'active', 'completed'].includes(filter)) return;
  state.filter = filter;
  renderTasks();
};

const getVisibleTasks = () => {
  if (state.filter === 'active') return state.tasks.filter((task) => !task.completed);
  if (state.filter === 'completed') return state.tasks.filter((task) => task.completed);
  return state.tasks;
};

const formatCreatedAt = (timestamp) => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(timestamp);
  } catch (error) {
    return '';
  }
};

const createActionButton = (label, action, extraClass = '') => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `row-button ${extraClass}`.trim();
  button.dataset.action = action;
  button.textContent = label;
  button.setAttribute('aria-label', `${label} task`);
  return button;
};

const createTaskElement = (task) => {
  const item = document.createElement('li');
  item.className = `task-row${task.completed ? ' is-completed' : ''}`;
  item.dataset.taskId = task.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute('aria-label', `${task.completed ? 'Mark active' : 'Complete'}: ${task.text}`);

  const main = document.createElement('div');
  main.className = 'task-main';

  const taskText = document.createElement('span');
  taskText.className = 'task-text';
  taskText.dataset.action = 'edit-text';
  taskText.textContent = task.text;

  const meta = document.createElement('time');
  meta.className = 'task-meta';
  meta.dateTime = new Date(task.createdAt).toISOString();
  meta.textContent = `Added ${formatCreatedAt(task.createdAt)}`;
  main.append(taskText, meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  actions.append(
    createActionButton('Edit', 'edit'),
    createActionButton('Delete', 'delete', 'delete-button')
  );

  item.append(checkbox, main, actions);
  return item;
};

const updateTaskCount = () => {
  const remaining = state.tasks.filter((task) => !task.completed).length;
  elements.taskCount.textContent = `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`;

  const completedCount = state.tasks.length - remaining;
  elements.clearCompleted.disabled = completedCount === 0;
  elements.filterCounts.all.textContent = state.tasks.length;
  elements.filterCounts.active.textContent = remaining;
  elements.filterCounts.completed.textContent = completedCount;
};

const updateFilterButtons = () => {
  elements.filterButtons.forEach((button) => {
    const isSelected = button.dataset.filter === state.filter;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
};

const updateEmptyState = (visibleTasks) => {
  const isEmpty = visibleTasks.length === 0;
  elements.emptyState.hidden = !isEmpty;
  elements.taskList.hidden = isEmpty;

  if (state.tasks.length === 0) {
    elements.emptyTitle.textContent = 'A little breathing room.';
    elements.emptyCopy.textContent = 'Add a task above to get started.';
  } else if (state.filter === 'active') {
    elements.emptyTitle.textContent = 'Nothing left in motion.';
    elements.emptyCopy.textContent = 'You have no active tasks right now.';
  } else if (state.filter === 'completed') {
    elements.emptyTitle.textContent = 'No finished tasks yet.';
    elements.emptyCopy.textContent = 'Completed tasks will show up here.';
  }
};

const renderTasks = () => {
  const visibleTasks = getVisibleTasks();
  const fragment = document.createDocumentFragment();
  visibleTasks.forEach((task) => fragment.append(createTaskElement(task)));
  elements.taskList.replaceChildren(fragment);
  updateEmptyState(visibleTasks);
  updateFilterButtons();
  updateTaskCount();
};

const startEditing = (taskId) => {
  const task = state.tasks.find((item) => item.id === taskId);
  const row = elements.taskList.querySelector(`[data-task-id="${CSS.escape(taskId)}"]`);
  if (!task || !row) return;

  const main = row.querySelector('.task-main');
  const editForm = document.createElement('form');
  editForm.className = 'edit-form';
  editForm.dataset.taskId = task.id;
  row.classList.add('is-editing');

  const input = document.createElement('input');
  input.className = 'edit-input';
  input.type = 'text';
  input.maxLength = 240;
  input.value = task.text;
  input.setAttribute('aria-label', 'Edit task');

  main.replaceChildren(editForm);
  editForm.append(
    input,
    createActionButton('Save', 'save-edit'),
    createActionButton('Cancel', 'cancel-edit')
  );
  input.focus();
  input.select();
};

const cancelEditing = (row) => {
  const taskId = row.dataset.taskId;
  const task = state.tasks.find((item) => item.id === taskId);
  if (task) renderTasks();
};

const handleTaskListClick = (event) => {
  const row = event.target.closest('[data-task-id]');
  if (!row || !elements.taskList.contains(row)) return;

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'edit') startEditing(row.dataset.taskId);
  if (action === 'delete') deleteTask(row.dataset.taskId);
  if (action === 'save-edit') {
    const input = row.querySelector('.edit-input');
    if (!updateTask(row.dataset.taskId, input.value)) {
      input.setCustomValidity('Please enter a task before saving.');
      input.reportValidity();
    }
  }
  if (action === 'cancel-edit') cancelEditing(row);
  if (action === 'edit-text' && event.detail === 2) startEditing(row.dataset.taskId);
};

const handleTaskListChange = (event) => {
  if (event.target.matches('[data-action="toggle"]')) {
    const row = event.target.closest('[data-task-id]');
    if (row) toggleTask(row.dataset.taskId);
  }
};

const handleTaskListSubmit = (event) => {
  const form = event.target.closest('.edit-form');
  if (!form) return;
  event.preventDefault();
  const row = form.closest('[data-task-id]');
  const input = form.querySelector('.edit-input');
  if (row && !updateTask(row.dataset.taskId, input.value)) {
    input.setCustomValidity('Please enter a task before saving.');
    input.reportValidity();
  }
};

const handleTaskListKeydown = (event) => {
  if (event.key !== 'Escape' || !event.target.matches('.edit-input')) return;
  const row = event.target.closest('[data-task-id]');
  if (row) cancelEditing(row);
};

const handleTaskListInput = (event) => {
  if (event.target.matches('.edit-input')) event.target.setCustomValidity('');
};

const initialize = () => {
  elements.form = document.querySelector('#task-form');
  elements.taskInput = document.querySelector('#task-input');
  elements.formMessage = document.querySelector('#form-message');
  elements.taskList = document.querySelector('#task-list');
  elements.taskCount = document.querySelector('#task-count');
  elements.clearCompleted = document.querySelector('#clear-completed');
  elements.emptyState = document.querySelector('#empty-state');
  elements.emptyTitle = document.querySelector('#empty-title');
  elements.emptyCopy = document.querySelector('#empty-copy');
  elements.filterButtons = [...document.querySelectorAll('[data-filter]')];
  elements.filterCounts = {
    all: document.querySelector('[data-filter-count="all"]'),
    active: document.querySelector('[data-filter-count="active"]'),
    completed: document.querySelector('[data-filter-count="completed"]')
  };

  state.tasks = loadTasks();
  state.filter = 'all';

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.formMessage.textContent = '';
    if (!addTask(elements.taskInput.value)) {
      elements.formMessage.textContent = 'Please enter a task before adding it.';
      elements.taskInput.focus();
      return;
    }
    elements.taskInput.value = '';
    elements.taskInput.focus();
  });

  elements.taskList.addEventListener('click', handleTaskListClick);
  elements.taskList.addEventListener('change', handleTaskListChange);
  elements.taskList.addEventListener('submit', handleTaskListSubmit);
  elements.taskList.addEventListener('keydown', handleTaskListKeydown);
  elements.taskList.addEventListener('input', handleTaskListInput);

  elements.filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });
  elements.clearCompleted.addEventListener('click', clearCompleted);

  const now = new Date();
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).format(now);
  document.querySelector('#day-number').textContent = String(now.getDate()).padStart(2, '0');

  renderTasks();
};

document.addEventListener('DOMContentLoaded', initialize);
