import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 客户端应用入口文件
console.log('HalloChat 客户端启动中...');

// 创建根元素并渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('应用初始化完成');