import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __DEPLOY_BRANCH__: JSON.stringify(process.env.BRANCH || 'main'),
  },
});
