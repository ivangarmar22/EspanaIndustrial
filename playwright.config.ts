import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -H 127.0.0.1 -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
      // Unreachable SMTP: enough to render the form; the validation test never sends.
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "2525",
      SMTP_USER: "e2e",
      SMTP_PASS: "e2e",
      CONTACT_TO: "e2e@example.invalid",
    },
  },
});
