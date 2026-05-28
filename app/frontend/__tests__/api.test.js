const api = require("../src/api");

function jsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => "application/json" },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

describe("TaskFlow API client", () => {
  test("uses the default API base URL", () => {
    expect(api.getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  test("uses configured API base URL without a trailing slash", () => {
    window.TASKFLOW_API_URL = "http://api.example.com/api/v1/";
    expect(api.getApiBaseUrl()).toBe("http://api.example.com/api/v1");
  });

  test("saves and clears auth session", () => {
    api.saveSession({
      access_token: "token-123",
      user: { id: 1, username: "pradeep" },
    });

    expect(api.getToken()).toBe("token-123");
    expect(api.getCurrentUser().username).toBe("pradeep");

    api.clearSession();
    expect(api.getToken()).toBeNull();
    expect(api.getCurrentUser()).toBeNull();
  });

  test("returns null for corrupted stored user data", () => {
    window.localStorage.setItem(api.STORAGE_KEYS.user, "{bad json");
    expect(api.getCurrentUser()).toBeNull();
  });

  test("adds bearer token to authenticated requests", async () => {
    window.localStorage.setItem(api.STORAGE_KEYS.token, "token-123");
    fetch.mockResolvedValueOnce(jsonResponse({ username: "pradeep" }));

    const user = await api.users.me();

    expect(user.username).toBe("pradeep");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
  });

  test("wraps task and settings endpoints", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ access_token: "new-token", user: { id: 1 } }, true, 201))
      .mockResolvedValueOnce(jsonResponse([{ id: 1, status: "done" }]))
      .mockResolvedValueOnce(jsonResponse({ total: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, title: "A" }, true, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 1, title: "B" }))
      .mockResolvedValueOnce({ ok: true, status: 204, headers: { get: () => "" }, text: async () => "" })
      .mockResolvedValueOnce(jsonResponse({ theme_color: "#2563eb" }));

    await expect(api.auth.register({ username: "a", password: "password123" })).resolves.toMatchObject({
      access_token: "new-token",
    });
    await expect(api.tasks.list("done")).resolves.toHaveLength(1);
    await expect(api.tasks.stats()).resolves.toMatchObject({ total: 1 });
    await expect(api.tasks.create({ title: "A" })).resolves.toMatchObject({ title: "A" });
    await expect(api.tasks.update(1, { title: "B" })).resolves.toMatchObject({ title: "B" });
    await expect(api.tasks.remove(1)).resolves.toBeNull();
    await expect(api.users.updateSettings({ theme_color: "#2563eb" })).resolves.toMatchObject({
      theme_color: "#2563eb",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/tasks?status=done",
      expect.any(Object),
    );
  });

  test("throws ApiError with backend detail", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ detail: "Invalid username or password" }, false, 401));

    await expect(api.auth.login({ username: "a", password: "b" })).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Invalid username or password",
    });
  });
});
