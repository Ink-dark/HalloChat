import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Form, Input, Modal, Table, Tag, message, Alert } from 'antd';
import { 
  CheckOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ThunderboltOutlined,
  PlusOutlined
} from '@ant-design/icons';
import authService from '../services/authService';

const ServerSelectionWindow = ({ visible, onClose, onServerSelected }) => {
  const [servers, setServers] = useState([]);
  const [foundServers, setFoundServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [isEditingServer, setIsEditingServer] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [newServerName, setNewServerName] = useState('');
  const [newServerAddress, setNewServerAddress] = useState('');
  const [newServerPort, setNewServerPort] = useState('3000');
  // eslint-disable-next-line
  const [error, setError] = useState('');
  const [serverStatuses, setServerStatuses] = useState({});

  // 从localStorage加载已保存的服务器列表
  useEffect(() => {
    if (visible) {
      loadSavedServers();
      // 移除局域网发现，因为它可能导致卡顿
      // discoverLocalServers();
    }
  }, [visible]);

  // 加载保存的服务器列表
  const loadSavedServers = () => {
    try {
      const savedServers = localStorage.getItem('halloChat_servers');
      if (savedServers) {
        const serverList = JSON.parse(savedServers);
        setServers(serverList);
      }
    } catch (err) {
      console.log('加载保存的服务器失败:', err);
    }
  };

  // 发现局域网服务器
  const discoverLocalServers = () => {
    try {
      // 这里可以添加mDNS发现逻辑
      // 暂时使用空数组
      setFoundServers([]);
    } catch (err) {
      console.log('发现局域网服务器失败:', err);
    }
  };

  // 测试服务器连接
  const testServerConnection = async (address, port) => {
    if (!address) {
      return false;
    }
    
    setIsTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const fullAddress = `${address}:${port}`;
      authService.setServerAddress(fullAddress);
      
      const result = await authService.testConnection();
      setConnectionStatus('success');
      
      if (result.success) {
        message.success(`服务器连接成功！延迟：${result.latency}ms`);
      }
      
      return result;
    } catch (err) {
      setConnectionStatus('error');
      message.error('连接失败：' + err.message);
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 添加新服务器
  // 处理编辑服务器
  const handleEditServer = (server) => {
    setEditingServer(server);
    setNewServerName(server.name);
    setNewServerAddress(server.address);
    setNewServerPort(server.port);
    setIsEditingServer(true);
  };

  // 处理删除服务器
  const handleDeleteServer = (server) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除服务器 "${server.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk() {
        const updatedServers = servers.filter(s => s.id !== server.id);
        setServers(updatedServers);
        localStorage.setItem('halloChat_servers', JSON.stringify(updatedServers));
        
        if (selectedServer?.id === server.id) {
          setSelectedServer(null);
        }
        
        message.success('服务器删除成功');
      },
    });
  };

  // 更新服务器信息
  const updateServer = async () => {
    if (!newServerName || !newServerAddress || !newServerPort) {
      message.error('请填写服务器名称、地址和端口');
      return;
    }

    // 验证端口号
    const portNum = parseInt(newServerPort);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      message.error('请输入有效的端口号(1-65535)');
      return;
    }

    // 测试连接
    const isConnected = await testServerConnection(newServerAddress, newServerPort);
    
    if (isConnected) {
      const updatedServer = {
        ...editingServer,
        name: newServerName,
        address: newServerAddress,
        port: newServerPort
      };

      const updatedServers = servers.map(server => 
        server.id === editingServer.id ? updatedServer : server
      );

      setServers(updatedServers);
      localStorage.setItem('halloChat_servers', JSON.stringify(updatedServers));

      if (selectedServer?.id === editingServer.id) {
        setSelectedServer(updatedServer);
      }

      setIsEditingServer(false);
      resetForm();
      message.success('服务器更新成功！');
    }
  };

  // 重置表单
  const resetForm = () => {
    setNewServerName('');
    setNewServerAddress('');
    setNewServerPort('3000');
    setConnectionStatus(null);
    setEditingServer(null);
  };

  const addServer = async () => {
    if (!newServerName || !newServerAddress || !newServerPort) {
      message.error('请填写服务器名称、地址和端口');
      return;
    }

    // 验证端口号
    const portNum = parseInt(newServerPort);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      message.error('请输入有效的端口号(1-65535)');
      return;
    }

    // 测试连接
    const isConnected = await testServerConnection(newServerAddress, newServerPort);
    
    if (isConnected && newServerAddress) {
      const newServer = {
        id: Date.now().toString(),
        name: newServerName,
        address: newServerAddress,
        port: newServerPort
      };

      const updatedServers = [...servers, newServer];
      setServers(updatedServers);
      
      // 保存到localStorage
      localStorage.setItem('halloChat_servers', JSON.stringify(updatedServers));
      
      // 自动选择新添加的服务器
      setSelectedServer(newServer);
      
      // 关闭添加服务器弹窗
      setIsAddingServer(false);
      resetForm();
      
      message.success('服务器添加成功！');
    }
  };

  // 处理服务器选择
  // 处理服务器测试
  const handleTestServer = async (server) => {
    setServerStatuses(prev => ({
      ...prev,
      [server.id]: { status: 'testing' }
    }));

    try {
      const result = await testServerConnection(server.address, server.port);
      setServerStatuses(prev => ({
        ...prev,
        [server.id]: { 
          status: result ? 'success' : 'error',
          testedAt: new Date(),
          latency: result.latency
        }
      }));
    } catch (error) {
      setServerStatuses(prev => ({
        ...prev,
        [server.id]: { 
          status: 'error',
          testedAt: new Date(),
          error: error.message
        }
      }));
    }
  };

  // 处理服务器选择 - 使用 useCallback 优化
  const handleServerSelect = useCallback((server) => {
    setSelectedServer(server);
  }, []);

  // 确认选择服务器 - 使用 useCallback 优化
  const handleConfirmSelection = useCallback(() => {
    if (!selectedServer) {
      message.error('请先选择一个服务器');
      return;
    }

    if (onServerSelected) {
      onServerSelected(selectedServer);
    }
    
    onClose();
  }, [selectedServer, onServerSelected, onClose]);

  // 服务器表格列定义 - 使用 useMemo 优化
  const serverColumns = useMemo(() => [
    {
      title: '服务器名称',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      ellipsis: true,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text}</span>
      ),
    },
    {
      title: '服务器地址',
      key: 'address',
      width: '25%',
      ellipsis: true,
      render: (_, record) => (
        <span style={{ fontFamily: 'monospace' }}>{record.address}:{record.port}</span>
      ),
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
      width: 100,
      align: 'center',
    },
    {
      title: '类型',
      key: 'type',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Tag color={record.isLocal ? 'blue' : 'green'}>
          {record.isLocal ? '局域网' : '已保存'}
        </Tag>
      ),
    },
    {
      title: '连接状态',
      key: 'status',
      width: '20%',
      render: (_, record) => {
        const status = serverStatuses[record.id];
        if (!status) {
          return <span style={{ color: '#999' }}>未测试</span>;
        }

        if (status.status === 'testing') {
          return <Tag color="processing">测试中...</Tag>;
        }

        if (status.status === 'success') {
          return (
            <div>
              <Tag color="success">连接正常</Tag>
              <div style={{ fontSize: '12px', color: '#666' }}>
                延迟: {status.latency}ms
                <br />
                测试时间: {status.testedAt.toLocaleTimeString()}
              </div>
            </div>
          );
        }

        return (
          <div>
            <Tag color="error">连接失败</Tag>
            {status.error && (
              <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                {status.error}
                <br />
                测试时间: {status.testedAt.toLocaleTimeString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: '25%',
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'flex-start'
        }}>
          <Button
            type={selectedServer?.id === record.id ? 'primary' : 'default'}
            size="small"
            onClick={() => handleServerSelect(record)}
            icon={<CheckOutlined />}
          >
            {selectedServer?.id === record.id ? '已选择' : '选择'}
          </Button>
          <Button
            type="default"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleTestServer(record);
            }}
            icon={<ThunderboltOutlined />}
          >
            测试
          </Button>
          {!record.isLocal && (
            <>
              <Button
                type="default"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditServer(record);
                }}
                icon={<EditOutlined />}
              >
                编辑
              </Button>
              <Button
                type="default"
                danger
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteServer(record);
                }}
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </>
          )}
        </div>
      ),
    },
  ], [selectedServer, serverStatuses, handleServerSelect]);

  // 合并局域网服务器和已保存服务器 - 使用 useMemo 优化
  const combinedServers = useMemo(() => [
    ...foundServers.map(server => ({ ...server, isLocal: true, key: `local-${server.address}` })),
    ...servers.map(server => ({ ...server, isLocal: false, key: `saved-${server.id}` }))
  ], [foundServers, servers]);

  return (
    <Modal
      title="服务器选择"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="add" 
          type="dashed" 
          onClick={() => setIsAddingServer(true)}
          icon={<PlusOutlined />}
        >
          添加服务器
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirmSelection}
          disabled={!selectedServer}
        >
          确认选择
        </Button>
      ]}
      width="80%"
      style={{ maxWidth: '1200px', minWidth: '600px' }}
      styles={{ 
        body: {
          maxHeight: '70vh',
          overflow: 'auto',
          padding: '16px 24px'
        }
      }}
      destroyOnClose={false}
      maskClosable={true}
      keyboard={true}
    >
      {error && <Alert message="错误提示" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      {/* 服务器列表 */}
      {combinedServers.length > 0 ? (
        <Table 
          columns={serverColumns}
          dataSource={combinedServers}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20'],
            showTotal: (total) => `共 ${total} 个服务器`
          }}
          rowKey="key"
          style={{ marginBottom: 20 }}
          onRow={(record) => ({
            onClick: () => handleServerSelect(record),
            style: {
              cursor: 'pointer',
              backgroundColor: selectedServer?.id === record.id ? '#f0f7ff' : undefined,
              transition: 'background-color 0.3s'
            }
          })}
          scroll={{ x: 'max-content', y: 'calc(60vh - 120px)' }}
          size="middle"
          loading={false}
        />
      ) : (
        <div style={{ textAlign: 'center', marginBottom: 20, color: '#999' }}>
          暂无可用服务器，请点击"添加服务器"按钮添加新服务器
        </div>
      )}

      {/* 添加/编辑服务器弹窗 */}
      <Modal
        title={isEditingServer ? "编辑服务器" : "添加服务器"}
        open={isAddingServer || isEditingServer}
        onOk={isEditingServer ? updateServer : addServer}
        onCancel={() => {
          if (isEditingServer) {
            setIsEditingServer(false);
          } else {
            setIsAddingServer(false);
          }
          resetForm();
        }}
        okText={isEditingServer ? "保存" : "添加"}
        cancelText="取消"
        okButtonProps={{ loading: isTestingConnection }}
      >
        <Form layout="vertical">
          <Form.Item label="服务器名称">
            <Input 
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              placeholder="请输入服务器名称"
            />
          </Form.Item>
          <Form.Item label="服务器地址">
            <Input 
              value={newServerAddress}
              onChange={(e) => setNewServerAddress(e.target.value)}
              placeholder="请输入服务器IP或域名"
            />
          </Form.Item>
          <Form.Item label="服务器端口">
            <Input 
              value={newServerPort}
              onChange={(e) => setNewServerPort(e.target.value)}
              placeholder="默认为3000"
            />
          </Form.Item>
        </Form>
        {connectionStatus && (
          <Tag 
            color={connectionStatus === 'success' ? 'green' : 'red'} 
            style={{ display: 'block', marginTop: 10 }}
          >
            {connectionStatus === 'success' ? '连接成功' : '连接失败'}
          </Tag>
        )}
      </Modal>
    </Modal>
  );
};

export default React.memo(ServerSelectionWindow);