import { defineConfig } from "astro/config";

// GitHub Pages: https://<user>.github.io/<repo>/
// SITE and BASE are set by the deploy workflow; defaults suit local dev.
export default defineConfig({
  site: process.env.SITE ?? "http://localhost:4321",
  base: process.env.BASE ?? "/",
  trailingSlash: "always",
  output: "static",
  vite: { server: { fs: { allow: [".."] } } },
});
