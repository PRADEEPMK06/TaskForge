module.exports = {
  testEnvironment: "jsdom",
  collectCoverageFrom: ["src/api.js", "src/utils.js"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.js"]
};
