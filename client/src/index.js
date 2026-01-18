import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import './i18n/config'; // 导入 i18n 配置

// 客户端应用入口文件
console.log('HalloChat 客户端启动中...');

// 创建根元素并渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

console.log('应用初始化完成');