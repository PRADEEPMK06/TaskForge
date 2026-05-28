(function attachTaskForgeUtils(globalScope) {
  const statusLabels = {
    todo: "To do",
    in_progress: "In progress",
    done: "Done",
  };

  const priorityLabels = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "No due date";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function toDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }

  function fromDateTimeLocal(value) {
    return value ? new Date(value).toISOString() : null;
  }

  function groupTasks(tasks) {
    return tasks.reduce(
      (groups, task) => {
        const status = statusLabels[task.status] ? task.status : "todo";
        groups[status].push(task);
        return groups;
      },
      { todo: [], in_progress: [], done: [] },
    );
  }

  function completionRate(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
  }

  const utils = {
    completionRate,
    escapeHtml,
    formatDateTime,
    fromDateTimeLocal,
    groupTasks,
    priorityLabels,
    statusLabels,
    toDateTimeLocal,
  };

  globalScope.TaskForgeUtils = utils;
  if (typeof module !== "undefined") {
    module.exports = utils;
  }
})(typeof window !== "undefined" ? window : globalThis);

