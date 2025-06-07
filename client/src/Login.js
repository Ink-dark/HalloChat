import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  // 用户名校验：3-20位，中文、字母、数字、下划线
  const validateUsername = (value) => {
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{3,20}$/;
    return regex.test(value) ? '' : '用户名需为3-20位（中文/字母/数字/下划线）';
  };

  // 密码校验：8-16位，包含字母、数字、特殊字符
  const validatePassword = (value) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/;
    return regex.test(value) ? '' : '密码需8-20位（包含字母/数字/特殊字符）';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 实时校验
    if (name === 'username') setErrors(prev => ({ ...prev, username: validateUsername(value) }));
    if (name === 'password') setErrors(prev => ({ ...prev, password: validatePassword(value) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 最终校验
    const newErrors = {
      username: validateUsername(formData.username),
      password: validatePassword(formData.password)
    };
    setErrors(newErrors);

    if (!Object.values(newErrors).some(err => err)) {
      // 调用登录接口
      console.log('提交登录：', formData);
      navigate('/home');
    }
  };

  return (
    <div className="login-container">
      <h2>用户登录</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>用户名：</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
          />
          {errors.username && <span className="error">{errors.username}</span>}
        </div>
        <div className="form-group">
          <label>密码：</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>
        <button type="submit">登录</button>
      </form>
    </div>
  );
};

export default Login;