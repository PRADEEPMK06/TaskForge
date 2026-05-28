require("@testing-library/jest-dom");

beforeEach(() => {
  global.fetch = jest.fn();
  window.localStorage.clear();
  delete window.TASKFLOW_API_URL;
});

