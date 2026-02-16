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
          '@ericblade/quagga2': path.resolve(__dirname, 'node_modules/@ericblade/quagga2/lib/quagga.js'),
        }
      },
      ssr: {
        // 确保这些浏览器包被正确打包，而不是当作外部依赖
        noExternal: ['@ericblade/quagga2']
      },
      build: {
        // 优化 Rollup 配置处理依赖
        rollupOptions: {
          // 不标记为外部依赖，确保被打包进来
          external: []
        }
      }
    };
});
