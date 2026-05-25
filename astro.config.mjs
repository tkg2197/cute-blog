// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  vite: {
    ssr: {
      noExternal: ['@supabase/supabase-js'],
    },
  },
});
