import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // 动态设置 base 路径
    // - 在 Capacitor 移动应用中: 使用 '/' 以支持本地文件系统加载
    // - 在 GitHub Pages Web 上: 使用 '/Photo_app/'
    const isCapacitor = process.env.VITE_CAPACITOR === 'true';
    const base = isCapacitor ? '/' : '/Photo_app/';
    
    return {
      base: base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
