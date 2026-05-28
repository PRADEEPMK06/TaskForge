(function attachTaskFlowApi(globalScope) {
  // Get API base URL - will be set by config.js or use fallback
  function getDefaultApiUrl() {
    if (globalScope.window?.location?.hostname?.includes('onrender.com')) {
      return 'https://taskforge-backend-v3z4.onrender.com/api/v1';
    }
    return 'http://localhost:8000/api/v1';
  }

  const DEFAULT_API_BASE_URL = getDefaultApiUrl();
  const STORAGE_KEYS = {
    token: "taskflow_token",
    user: "taskflow_user",
    apiUrl: "taskflow_api_url",
  };

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.payload = payload;
    }
  }

  function getApiBaseUrl() {
    const configuredUrl =
      globalScope.TASKFLOW_API_URL ||
      globalScope.localStorage?.getItem(STORAGE_KEYS.apiUrl) ||
      DEFAULT_API_BASE_URL;
    return configuredUrl.replace(/\/$/, "");
  }

  function getToken() {
    return globalScope.localStorage?.getItem(STORAGE_KEYS.token) || null;
  }

  function getCurrentUser() {
    const rawUser = globalScope.localStorage?.getItem(STORAGE_KEYS.user);
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser);
    } catch (_error) {
      return null;
    }
  }

  function saveSession(authResponse) {
    globalScope.localStorage?.setItem(STORAGE_KEYS.token, authResponse.access_token);
    globalScope.localStorage?.setItem(STORAGE_KEYS.user, JSON.stringify(authResponse.user));
  }

  function clearSession() {
    globalScope.localStorage?.removeItem(STORAGE_KEYS.token);
    globalScope.localStorage?.removeItem(STORAGE_KEYS.user);
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    const text = await response.text();
    return text ? { detail: text } : null;
  }

  async function request(path, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await globalScope.fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
    });
    const payload = await parseResponse(response);

    if (!response.ok) {
      const message = payload?.detail || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    return payload;
  }

  const api = {
    ApiError,
    STORAGE_KEYS,
    clearSession,
    getApiBaseUrl,
    getCurrentUser,
    getToken,
    request,
    saveSession,
    auth: {
      register: (payload) =>
        request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
      login: (payload) =>
        request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    },
    users: {
      me: () => request("/users/me"),
      updateSettings: (payload) =>
        request("/users/me/settings", { method: "PATCH", body: JSON.stringify(payload) }),
    },
    tasks: {
      list: (status) => request(`/tasks${status && status !== "all" ? `?status=${status}` : ""}`),
      stats: () => request("/tasks/summary/stats"),
      create: (payload) =>
        request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
      update: (id, payload) =>
        request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
      remove: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
    },
  };

  globalScope.TaskFlowApi = api;
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

