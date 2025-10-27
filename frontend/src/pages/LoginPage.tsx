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
 * 登录页面组件
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  // 从 authStore 获取状态和方法
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();

  // 表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
   * 处理登录表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 基本验证
    if (!email || !password) {
      return;
    }

    try {
      await login(email, password);
      // 登录成功后会自动跳转（通过 useEffect）
    } catch (err) {
      // 错误已经在 store 中处理
      console.error('Login failed:', err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            欢迎回来！
          </Typography>

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 登录表单 */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: '100%' }}
          >
            {/* 邮箱输入框 */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="邮箱"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              type="email"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            {/* 登录按钮 */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>

            {/* 注册链接 */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                还没有账号？{' '}
                <Link
                  to="/register"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  立即注册
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
