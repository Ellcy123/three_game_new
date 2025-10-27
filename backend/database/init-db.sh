#!/bin/bash
# =====================================================
# 数据库初始化脚本 (Linux/Mac)
# =====================================================

echo ""
echo "===================================="
echo "  ECHO 游戏数据库初始化"
echo "===================================="
echo ""

# 检查环境变量
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-three_brothers_game}
DB_HOST=${DB_HOST:-localhost}

echo "配置信息:"
echo "  数据库用户: $DB_USER"
echo "  数据库名称: $DB_NAME"
echo "  数据库主机: $DB_HOST"
echo ""

# 询问是否继续
read -p "是否继续执行初始化? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "已取消初始化"
    exit 0
fi

echo ""
echo "正在执行SQL脚本..."
echo ""

# 执行SQL文件
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f migrations/001_initial_schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "  初始化成功! ✅"
    echo "===================================="
    echo ""
    echo "数据库表已创建完成，可以开始开发了！"
else
    echo ""
    echo "===================================="
    echo "  初始化失败! ❌"
    echo "===================================="
    echo ""
    echo "请检查:"
    echo "  1. PostgreSQL服务是否运行"
    echo "  2. 数据库 \"$DB_NAME\" 是否存在"
    echo "  3. 用户 \"$DB_USER\" 是否有权限"
    echo ""
fi
