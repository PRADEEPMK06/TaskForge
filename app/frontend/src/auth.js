(function attachAuthPage(globalScope) {
  const api = globalScope.TaskFlowApi;
  let mode = "login";

  function setMode(nextMode) {
    mode = nextMode;
    document.querySelectorAll("#auth-mode button").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });
    document.getElementById("auth-title").textContent =
      mode === "login" ? "Welcome back" : "Create your account";
    document.getElementById("auth-submit").textContent =
      mode === "login" ? "Login" : "Create account";
    document.getElementById("auth-message").textContent = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = document.getElementById("auth-message");
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "";
    try {
      const response =
        mode === "login"
          ? await api.auth.login({ username, password })
          : await api.auth.register({ username, password });
      api.saveSession(response);
      globalScope.location.href = "index.html";
    } catch (error) {
      message.textContent = error.message || "Authentication failed";
    }
  }

  function init() {
    if (api.getToken()) {
      globalScope.location.href = "index.html";
      return;
    }

    document.getElementById("auth-form").addEventListener("submit", handleSubmit);
    document.getElementById("auth-mode").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-mode]");
      if (button) setMode(button.dataset.mode);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);

