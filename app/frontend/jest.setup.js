require("@testing-library/jest-dom");

beforeEach(() => {
  global.fetch = jest.fn();
  window.localStorage.clear();
  delete window.TASKFORGE_API_URL;
});

