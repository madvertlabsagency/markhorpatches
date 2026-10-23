import next from "eslint-config-next";

const config = [
  ...next,
  {
    rules: {
      // Apostrophes in JSX copy are intentional and render correctly.
      "react/no-unescaped-entities": "off",
      // Private, signed, short-lived storage URLs can't go through the Next image optimizer.
      "@next/next/no-img-element": "off",
    },
  },
  { ignores: ["src/generated/**", ".next/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
];
export default config;
