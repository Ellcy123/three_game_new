import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';

/**
 * 注册页面组件
 */
const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // 从 authStore 获取状态和方法
  const { register, isLoading, error, isAuthenticated, clearError } = useAuthStore();

  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // 验证错误状态
  const [validationErrors, setValidationErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // 如果已经登录，跳转到大厅
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/lobby');
    }
  }, [isAuthenticated, navigate]);

  // 清除错误信息
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  /**
   * 验证用户名
   */
  const validateUsername = (username: string): string => {
    if (username.length < 3) {
      return '用户名至少需要3个字符';
    }
    return '';
  };

  /**
   * 验证邮箱格式
   */
  const validateEmail = (email: string): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return '请输入有效的邮箱地址';
    }
    return '';
  };

  /**
   * 验证密码强度
   */
  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return '密码至少需要8个字符';
    }
    if (!/[a-z]/.test(password)) {
      return '密码必须包含小写字母';
    }
    if (!/[A-Z]/.test(password)) {
      return '密码必须包含大写字母';
    }
    if (!/[0-9]/.test(password)) {
      return '密码必须包含数字';
    }
    return '';
  };

  /**
   * 验证确认密码
   */
  const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    if (password !== confirmPassword) {
      return '两次输入的密码不一致';
    }
    return '';
  };

  /**
   * 处理输入变化
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 实时验证
    let error = '';
    switch (name) {
      case 'username':
        error = validateUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        // 如果确认密码已填写，也重新验证确认密码
        if (formData.confirmPassword) {
          setValidationErrors((prev) => ({
            ...prev,
            confirmPassword: validateConfirmPassword(value, formData.confirmPassword),
          }));
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.password, value);
        break;
    }

    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  /**
   * 处理注册表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证所有字段
    const errors = {
      username: validateUsername(formData.username),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword),
    };

    setValidationErrors(errors);

    // 如果有任何验证错误，不提交表单
    if (Object.values(errors).some((error) => error !== '')) {
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      // 注册成功后会自动跳转（通过 useEffect）
    } catch (err) {
      // 错误已经在 store 中处理
      console.error('Registration failed:', err);
    }
  };

  /**
   * 检查表单是否有效
   */
  const isFormValid = () => {
    return (
      formData.username &&
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      !Object.values(validationErrors).some((error) => error !== '')
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          {/* 游戏标题 */}
          <Typography
            component="h1"
            variant="h3"
            sx={{
              mb: 1,
              fontWeight: 'bold',
              color: 'primary.main',
              textAlign: 'center',
            }}
          >
            三兄弟的冒险
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{ mb: 3, color: 'text.secondary' }}
          >
            创建新账号
          </Typography>

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 注册表单 */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: '100%' }}
          >
            {/* 用户名输入框 */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="用户名"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
              error={!!validationErrors.username}
              helperText={validationErrors.username || '至少3个字符'}
            />

            {/* 邮箱输入框 */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="邮箱"
              name="email"
              autoComplete="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              error={!!validationErrors.email}
              helperText={validationErrors.email || '用于登录和找回密码'}
            />

            {/* 密码输入框 */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="密码"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              error={!!validationErrors.password}
              helperText={validationErrors.password || '至少8位，包含大小写字母和数字'}
            />

            {/* 确认密码输入框 */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="确认密码"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword || '请再次输入密码'}
            />

            {/* 注册按钮 */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>

            {/* 登录链接 */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                已有账号？{' '}
                <Link
                  to="/login"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  立即登录
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterPage;
