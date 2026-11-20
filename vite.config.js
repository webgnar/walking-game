import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Build stamp shown in Settings, so a tester can tell which version they're running.
let sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
if (!sha) { try { sha = execSync('git rev-parse --short HEAD').toString().trim(); } catch { sha = 'dev'; } }
const stamp = `${sha} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

export default defineConfig({
  define: { __BUILD__: JSON.stringify(stamp) },
  build: { chunkSizeWarningLimit: 1200, target: 'es2020' },
  server: { host: true },
});
