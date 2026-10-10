import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    // Tests load Apti-App/.env, which can hold real Gmail credentials. Empty values
    // are not overridden by loadEnvFile, so test mail goes to the log, never to Gmail.
    env: { GMAIL_USER: "", GMAIL_APP_PASSWORD: "" },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
