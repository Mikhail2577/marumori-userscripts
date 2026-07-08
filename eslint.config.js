export default [
  {
    files: ["*.user.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        AudioContext: "readonly",
        Event: "readonly",
        GM_getValue: "readonly",
        GM_setValue: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        MutationObserver: "readonly",
        Object: "readonly",
        cancelAnimationFrame: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        history: "readonly",
        location: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        window: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "eqeqeq": ["error", "always"],
      "curly": ["error", "multi-line"]
    }
  }
];
