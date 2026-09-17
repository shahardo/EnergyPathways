import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import noPhysicalDirection from "./eslint-rules/no-physical-direction.mjs";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const local = {
  rules: {
    "no-physical-direction": noPhysicalDirection,
  },
};

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // The matrix's RTL fidelity depends on `dir="rtl"` doing all the
    // mirroring (SPEC §8); a physical left/right class defeats it silently.
    plugins: { local },
    rules: {
      "local/no-physical-direction": "error",
    },
  },
  {
    // lib/engine is the one calculation engine (PRD §5, NFR-7): pure
    // functions only, so client and server evaluations of a scenario can
    // never disagree. No I/O, no framework, no non-deterministic clock.
    files: ["lib/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "lib/engine must stay pure: no React imports." },
            {
              name: "react-dom",
              message: "lib/engine must stay pure: no React imports.",
            },
            { name: "fs", message: "lib/engine must stay pure: no fs imports." },
            { name: "node:fs", message: "lib/engine must stay pure: no fs imports." },
            { name: "fs/promises", message: "lib/engine must stay pure: no fs imports." },
            {
              name: "node:fs/promises",
              message: "lib/engine must stay pure: no fs imports.",
            },
          ],
          patterns: [
            {
              group: ["next", "next/*", "react/*", "react-dom/*"],
              message: "lib/engine must stay pure: no framework imports.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "Date",
          message:
            "lib/engine must stay pure: no Date — pass milestone years as parameters.",
        },
      ],
    },
  },
  // Default ignores of eslint-config-next, restated because supplying any
  // `ignores` array overrides rather than extends them.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
