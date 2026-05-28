const utils = require("../src/utils");

describe("TaskFlow utility helpers", () => {
  test("escapes HTML entities", () => {
    expect(utils.escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  test("groups invalid statuses into todo", () => {
    const groups = utils.groupTasks([
      { title: "A", status: "todo" },
      { title: "B", status: "done" },
      { title: "C", status: "blocked" },
    ]);

    expect(groups.todo).toHaveLength(2);
    expect(groups.done).toHaveLength(1);
    expect(groups.in_progress).toHaveLength(0);
  });

  test("calculates completion rate safely", () => {
    expect(utils.completionRate(2, 5)).toBe(40);
    expect(utils.completionRate(0, 0)).toBe(0);
  });

  test("formats empty and real due dates", () => {
    expect(utils.formatDateTime(null)).toBe("No due date");
    expect(utils.formatDateTime("2026-05-08T10:30:00.000Z")).toEqual(expect.any(String));
  });

  test("converts datetime-local values", () => {
    expect(utils.fromDateTimeLocal("")).toBeNull();
    expect(utils.fromDateTimeLocal("2026-05-08T10:30")).toContain("2026-05-08");
    expect(utils.toDateTimeLocal(null)).toBe("");
    expect(utils.toDateTimeLocal("2026-05-08T10:30:00.000Z")).toMatch(/^2026-05-08T/);
  });
});
