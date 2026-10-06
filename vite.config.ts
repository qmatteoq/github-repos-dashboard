import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { managedApps } from '@microsoft/managed-apps-vite-plugin';

export default defineConfig({
  base: './',
  plugins: [react(), managedApps()],
});
