// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://came-lake.vercel.app',
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  server: { port: 4325, host: true },
  devToolbar: { enabled: false },
});
