(function attachDashboard(globalScope) {
  const api = globalScope.TaskFlowApi;
  const utils = globalScope.TaskFlowUtils;

  const state = {
    tasks: [],
    activeStatus: "all",
    editingTaskId: null,
  };

  const selectors = {
    board: "#task-board",
    taskModal: "#task-modal",
    settingsModal: "#settings-modal",
    taskForm: "#task-form",
    settingsForm: "#settings-form",
    toast: "#toast",
  };

  function element(selector) {
    return document.querySelector(selector);
  }

  function showToast(message, type = "success") {
    const toast = element(selectors.toast);
    toast.textContent = message;
    toast.className = `toast visible ${type === "error" ? "error" : ""}`;
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  function openDialog(selector) {
    const dialog = element(selector);
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "open");
  }

  function closeDialog(selector) {
    const dialog = element(selector);
    if (dialog.close) dialog.close();
    else dialog.removeAttribute("open");
  }

  function applyUser(user) {
    if (!user) return;
    document.getElementById("welcome-label").textContent = `${user.username}'s workspace`;
    document.getElementById("user-points").textContent = Number(user.points).toLocaleString();
    document.getElementById("theme-color").value = user.theme_color || "#2563eb";
    document.getElementById("font-style").value = user.font_style || "Inter";
    document.documentElement.style.setProperty("--accent", user.theme_color || "#2563eb");
    document.body.style.fontFamily =
      user.font_style === "System"
        ? "ui-sans-serif, system-ui, sans-serif"
        : `${user.font_style}, ui-sans-serif, system-ui, sans-serif`;
  }

  function renderMetrics(stats) {
    document.getElementById("metric-total").textContent = stats.total;
    document.getElementById("metric-progress").textContent = stats.in_progress;
    document.getElementById("metric-done").textContent = stats.done;
    document.getElementById("metric-rate").textContent = `${Math.round(stats.completion_rate)}%`;
    document.getElementById("count-todo").textContent = stats.todo;
    document.getElementById("count-in-progress").textContent = stats.in_progress;
    document.getElementById("count-done").textContent = stats.done;
  }

  function taskActionButtons(task) {
    const nextStatusButton =
      task.status === "todo"
        ? `<button class="small-button" data-action="status" data-status="in_progress" data-id="${task.id}">Start</button>`
        : task.status === "in_progress"
          ? `<button class="small-button" data-action="status" data-status="done" data-id="${task.id}">Complete</button>`
          : "";

    return `
      ${nextStatusButton}
      <button class="small-button" data-action="edit" data-id="${task.id}">Edit</button>
      <button class="danger-button" data-action="delete" data-id="${task.id}">Delete</button>
    `;
  }

  function taskCard(task) {
    const description = task.description
      ? `<p>${utils.escapeHtml(task.description)}</p>`
      : "";
    const completedLabel = task.points_awarded ? "Awarded" : `${task.points_reward} pts`;

    return `
      <article class="task-card" draggable="true" data-id="${task.id}">
        <div>
          <h3>${utils.escapeHtml(task.title)}</h3>
          ${description}
        </div>
        <div class="card-meta">
          <span class="badge ${task.priority}">${utils.priorityLabels[task.priority]}</span>
          <span class="badge">${utils.formatDateTime(task.due_date)}</span>
          <span class="badge">${completedLabel}</span>
        </div>
        <div class="card-actions">${taskActionButtons(task)}</div>
      </article>
    `;
  }

  function renderTasks() {
    const grouped = utils.groupTasks(state.tasks);
    const columns = {
      todo: document.getElementById("todo-list"),
      in_progress: document.getElementById("in-progress-list"),
      done: document.getElementById("done-list"),
    };

    Object.entries(columns).forEach(([status, list]) => {
      list.innerHTML = grouped[status].length
        ? grouped[status].map(taskCard).join("")
        : `<div class="empty-state">No ${utils.statusLabels[status].toLowerCase()} tasks</div>`;
    });
  }

  async function refreshProfile() {
    const user = await api.users.me();
    api.saveSession({ access_token: api.getToken(), user });
    applyUser(user);
  }

  async function refreshTasks() {
    const [tasks, stats] = await Promise.all([
      api.tasks.list(state.activeStatus),
      api.tasks.stats(),
    ]);
    state.tasks = tasks;
    renderTasks();
    renderMetrics(stats);
  }

  async function refreshAll() {
    try {
      await refreshProfile();
      await refreshTasks();
    } catch (error) {
      if (error.status === 401) {
        api.clearSession();
        globalScope.location.href = "auth.html";
      } else {
        showToast(error.message || "Could not load dashboard", "error");
      }
    }
  }

  function resetTaskForm() {
    state.editingTaskId = null;
    element(selectors.taskForm).reset();
    document.getElementById("task-id").value = "";
    document.getElementById("task-modal-title").textContent = "New task";
    document.getElementById("task-status").value = "todo";
    document.getElementById("task-priority").value = "medium";
    document.getElementById("task-points").value = "10";
  }

  function openTaskForm(task = null) {
    resetTaskForm();
    if (task) {
      state.editingTaskId = task.id;
      document.getElementById("task-id").value = task.id;
      document.getElementById("task-modal-title").textContent = "Edit task";
      document.getElementById("task-title").value = task.title;
      document.getElementById("task-description").value = task.description || "";
      document.getElementById("task-status").value = task.status;
      document.getElementById("task-priority").value = task.priority;
      document.getElementById("task-due-date").value = utils.toDateTimeLocal(task.due_date);
      document.getElementById("task-points").value = task.points_reward;
    }
    openDialog(selectors.taskModal);
  }

  function taskPayloadFromForm() {
    return {
      title: document.getElementById("task-title").value.trim(),
      description: document.getElementById("task-description").value.trim() || null,
      status: document.getElementById("task-status").value,
      priority: document.getElementById("task-priority").value,
      due_date: utils.fromDateTimeLocal(document.getElementById("task-due-date").value),
      points_reward: Number(document.getElementById("task-points").value || 10),
    };
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();
    const payload = taskPayloadFromForm();
    try {
      if (state.editingTaskId) {
        await api.tasks.update(state.editingTaskId, payload);
        showToast("Task updated");
      } else {
        await api.tasks.create(payload);
        showToast("Task created");
      }
      closeDialog(selectors.taskModal);
      await refreshAll();
    } catch (error) {
      showToast(error.message || "Could not save task", "error");
    }
  }

  async function handleBoardClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const taskId = Number(button.dataset.id);
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;

    try {
      if (button.dataset.action === "edit") {
        openTaskForm(task);
      }

      if (button.dataset.action === "status") {
        await api.tasks.update(taskId, { status: button.dataset.status });
        showToast("Task moved");
        await refreshAll();
      }

      if (button.dataset.action === "delete") {
        if (!globalScope.confirm("Delete this task?")) return;
        await api.tasks.remove(taskId);
        showToast("Task deleted");
        await refreshAll();
      }
    } catch (error) {
      showToast(error.message || "Task action failed", "error");
    }
  }

  function handleDragStart(event) {
    const card = event.target.closest(".task-card");
    if (!card) return;
    card.classList.add("dragging");
    event.dataTransfer.setData("text/plain", card.dataset.id);
  }

  function handleDragEnd(event) {
    const card = event.target.closest(".task-card");
    if (card) card.classList.remove("dragging");
  }

  async function handleDrop(event) {
    const list = event.target.closest(".task-list");
    if (!list) return;
    event.preventDefault();
    list.classList.remove("drag-over");

    const taskId = Number(event.dataTransfer.getData("text/plain"));
    const newStatus = list.dataset.status;
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await api.tasks.update(taskId, { status: newStatus });
      showToast("Task moved");
      await refreshAll();
    } catch (error) {
      showToast(error.message || "Could not move task", "error");
    }
  }

  async function handleSettingsSubmit(event) {
    event.preventDefault();
    try {
      const user = await api.users.updateSettings({
        theme_color: document.getElementById("theme-color").value,
        font_style: document.getElementById("font-style").value,
      });
      api.saveSession({ access_token: api.getToken(), user });
      applyUser(user);
      closeDialog(selectors.settingsModal);
      showToast("Settings saved");
    } catch (error) {
      showToast(error.message || "Could not save settings", "error");
    }
  }

  function bindEvents() {
    document.getElementById("new-task-button").addEventListener("click", () => openTaskForm());
    document.getElementById("logout-button").addEventListener("click", () => {
      api.clearSession();
      globalScope.location.href = "auth.html";
    });
    document.getElementById("settings-button").addEventListener("click", () => openDialog(selectors.settingsModal));

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(`#${button.dataset.closeModal}`));
    });

    document.getElementById("status-filter").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-status]");
      if (!button) return;
      state.activeStatus = button.dataset.status;
      document.querySelectorAll("#status-filter button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      await refreshTasks();
    });

    element(selectors.taskForm).addEventListener("submit", handleTaskSubmit);
    element(selectors.settingsForm).addEventListener("submit", handleSettingsSubmit);
    element(selectors.board).addEventListener("click", handleBoardClick);
    element(selectors.board).addEventListener("dragstart", handleDragStart);
    element(selectors.board).addEventListener("dragend", handleDragEnd);
    element(selectors.board).addEventListener("dragover", (event) => {
      const list = event.target.closest(".task-list");
      if (!list) return;
      event.preventDefault();
      list.classList.add("drag-over");
    });
    element(selectors.board).addEventListener("dragleave", (event) => {
      const list = event.target.closest(".task-list");
      if (list) list.classList.remove("drag-over");
    });
    element(selectors.board).addEventListener("drop", handleDrop);
  }

  function init() {
    if (!api.getToken()) {
      globalScope.location.href = "auth.html";
      return;
    }
    applyUser(api.getCurrentUser());
    bindEvents();
    refreshAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);

