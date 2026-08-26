// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://came.plotcenterlab.com.ar',
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  security: {
    // En Vercel el host interno es localhost y el check de origen bloquea
    // todos los POST (formulario y panel). allowedDomains hace que se confíe
    // el dominio público; checkOrigin queda apagado porque el formulario es público.
    checkOrigin: false,
    allowedDomains: [
      { hostname: 'came.plotcenterlab.com.ar', protocol: 'https' },
      { hostname: 'came-lake.vercel.app', protocol: 'https' },
      { hostname: '*.vercel.app', protocol: 'https' },
    ],
  },
  server: { port: 4325, host: true },
  devToolbar: { enabled: false },
});
