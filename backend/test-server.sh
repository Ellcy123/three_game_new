#!/bin/bash

# 服务器测试脚本
# 用于验证服务器是否正常工作

echo "========================================"
echo "  ECHO Game 服务器测试"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器地址
SERVER="http://localhost:3000"

# 测试计数
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_status="$4"
    local data="$5"

    echo -n "测试: $name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$SERVER$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$SERVER$url")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (状态码: $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (期望: $expected_status, 实际: $status_code)"
        echo "  响应: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# 等待服务器启动
echo "等待服务器启动..."
sleep 2

echo ""
echo "开始测试..."
echo ""

# 1. 测试健康检查端点
test_endpoint "健康检查" "GET" "/health" "200"

# 2. 测试 API 根路径
test_endpoint "API 根路径" "GET" "/api" "200"

# 3. 测试 404 错误
test_endpoint "404 错误处理" "GET" "/nonexistent" "404"

# 4. 测试注册（缺少字段）
test_endpoint "注册验证（缺少字段）" "POST" "/api/v1/auth/register" "400" \
    '{"username":"test"}'

# 5. 测试注册（无效邮箱）
test_endpoint "注册验证（无效邮箱）" "POST" "/api/v1/auth/register" "400" \
    '{"username":"testuser","email":"invalid-email","password":"password123"}'

# 6. 测试注册（密码太短）
test_endpoint "注册验证（密码太短）" "POST" "/api/v1/auth/register" "400" \
    '{"username":"testuser","email":"test@example.com","password":"12345"}'

# 7. 测试登录（无效凭据）
test_endpoint "登录验证（无效凭据）" "POST" "/api/v1/auth/login" "401" \
    '{"email":"nonexistent@example.com","password":"password123"}'

# 8. 测试 Token 验证（无 Token）
test_endpoint "Token 验证（无 Token）" "GET" "/api/v1/auth/verify" "401"

echo ""
echo "========================================"
echo "  测试结果"
echo "========================================"
echo -e "${GREEN}通过: $TESTS_PASSED${NC}"
echo -e "${RED}失败: $TESTS_FAILED${NC}"
echo "总计: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
