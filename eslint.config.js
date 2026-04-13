import globals from "globals";

const commonRules = {
  "no-unused-vars": "warn",
  "no-undef":       "error",
  "no-console":     "warn",
  "no-empty":       "warn",
};

export default [
  // ── Ignore ────────────────────────────────────────────────────
  { ignores: ["node_modules/**", "test/**"] },

  // ── Backend: Node.js ES module ────────────────────────────────
  {
    files: ["utils/server.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: commonRules,
  },

  // ── utils.js: browser module (loaded as type="module") ────────
  {
    files: ["utils/utils.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        _AW:         "readonly",
        Appwrite:    "readonly",
        // Functions defined via window.* in this file — ESLint can't trace window assignments
        toast:       "readonly",
        closeDialog: "readonly",
        logout:      "readonly",
      },
    },
    rules: commonRules,
  },

  // ── config.js: browser script ─────────────────────────────────
  {
    files: ["utils/config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        Appwrite: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef":       "error",
    },
  },

  // ── Frontend page scripts: browser scripts (not modules) ──────
  {
    files: ["root/**/*.js", "pages/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        Appwrite:    "readonly",
        _AW:         "readonly",
        toast:       "readonly",
        openDialog:  "readonly",
        closeDialog: "readonly",
        logout:      "readonly",
        html2pdf:    "readonly",
        Chart:       "readonly",
      },
    },
    rules: {
      ...commonRules,
      "no-unused-vars": ["warn", { "vars": "local" }], // top-level functions are called from HTML onclick
      "no-console":     "off",                          // all console.error calls are intentional catch-block logging
    },
  },
];
