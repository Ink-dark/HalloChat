import React, { useState, useEffect } from 'react';
import MainWindow from './components/MainWindow';
import './App.css';
import { Modal, Button } from 'antd';

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  // 模拟当前登录用户
  const currentUser = {
    id: 'user1',
    username: '当前用户',
    onlineStatus: true
  };

  const [hasAgreed, setHasAgreed] = useState(false);
  
  const handleDisclaimerClose = () => {
    if (hasAgreed) {
      setShowDisclaimer(false);
    }
  };

  return (
    <div className="App">
      <Modal
        title="法律声明"
        visible={showDisclaimer}
        onOk={handleDisclaimerClose}
        onCancel={handleDisclaimerClose}
        closable={false}
        maskClosable={false}
        footer={[
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => {
              setHasAgreed(true);
              handleDisclaimerClose();
            }}
          >
            我已阅读并同意
          </Button>
        ]}
      >
        <p>本程序由墨染柒Darkseven开发，仅供学习交流使用，测试版不代表最终品质。</p>
        <p>1. 用户在使用过程中应遵守当地法律法规，不得用于非法用途。</p>
        <p>2. 开发者不对用户行为承担任何法律责任。</p>
        <p>3. 本软件不收集、存储或传输用户隐私数据。</p>
        <p>4. 使用本软件即表示您同意以上条款。</p>
      </Modal>
      <MainWindow currentUser={currentUser} />
    </div>
  );
}

export default App;