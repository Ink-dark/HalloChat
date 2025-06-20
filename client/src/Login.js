import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';

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
  const validatePassword = debounce((value) => {
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(value)) {
      setErrors({ ...errors, password: '需包含字母和数字且≥8位' });
    } else {
      setErrors({ ...errors, password: '' });
    }
  }, 300);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
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
        <button type="submit" disabled={isSubmitting} className={isSubmitting ? 'loading' : ''}>
          {isSubmitting ? ( 
            <>
              <span className="spinner"></span>
              登录中...
            </>
          ) : '登录'}
        </button>
      </form>
    </div>
  );
};

export default Login;

try {
  const response = await axios.post('/api/login', formData);
  console.log('登录成功:', response.data);
} catch (error) {
  console.error('登录失败:', error.response?.data || error.message);
} finally {
  setIsSubmitting(false);
}
;