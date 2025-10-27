import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  SportsEsports as GameIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

/**
 * 大厅页面组件（临时版本）
 */
const LobbyPage: React.FC = () => {
  const navigate = useNavigate();

  // 从 authStore 获取状态和方法
  const { user, isAuthenticated, logout } = useAuthStore();

  // 如果未登录，跳转到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  /**
   * 处理登出
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // 如果用户信息未加载，显示加载状态
  if (!user) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* 顶部导航栏 */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GameIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              三兄弟的冒险
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 40,
                height: 40,
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {user.username}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              登出
            </Button>
          </Box>
        </Paper>

        {/* 欢迎区域 */}
        <Paper
          elevation={4}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
          }}
        >
          <Typography
            variant="h3"
            sx={{
              mb: 2,
              fontWeight: 'bold',
              color: 'primary.main',
            }}
          >
            欢迎回来，{user.username}！
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              py: 4,
            }}
          >
            <GameIcon
              sx={{
                fontSize: 80,
                color: 'primary.main',
                opacity: 0.5,
              }}
            />

            <Typography
              variant="h5"
              sx={{
                color: 'text.secondary',
                fontWeight: 'medium',
              }}
            >
              游戏功能开发中...
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 600,
              }}
            >
              我们正在努力开发更多精彩的游戏功能。敬请期待！
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 用户信息卡片 */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mt: 4,
              borderRadius: 2,
              background: '#f9f9f9',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              账号信息
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                textAlign: 'left',
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  用户名
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {user.username}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  邮箱
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {user.email}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  注册时间
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  用户 ID
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 'medium',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                >
                  {user.id}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Paper>
      </Container>
    </Box>
  );
};

export default LobbyPage;
