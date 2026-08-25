// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  server: { port: 4325, host: true },
  devToolbar: { enabled: false },
  vite: {
    // El cliente nativo de libSQL (solo se usa con archivos locales) no debe
    // empaquetarse dentro de la función serverless.
    ssr: { external: ['@libsql/client', 'libsql'] },
  },
});
