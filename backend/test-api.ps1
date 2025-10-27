# Test API endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing ECHO Game Backend API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "  - Database Connected: $($content.data.services.database.connected)" -ForegroundColor Green
    Write-Host "  - Redis Connected: $($content.data.services.redis.connected)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: API Info
Write-Host "Test 2: API Info" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api" -UseBasicParsing
    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Register User
Write-Host "Test 3: Register New User" -ForegroundColor Yellow
$body = @{
    username = "testuser$(Get-Random -Maximum 10000)"
    email = "testuser$(Get-Random -Maximum 10000)@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/register" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "  - User Created: $($content.data.user.username)" -ForegroundColor Green
    Write-Host "  - User ID: $($content.data.user.id)" -ForegroundColor Green
    $global:accessToken = $content.data.tokens.accessToken
    $global:testEmail = $content.data.user.email
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Login
if ($global:testEmail) {
    Write-Host "Test 4: Login" -ForegroundColor Yellow
    $loginBody = @{
        email = $global:testEmail
        password = "password123"
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
        Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "  - Login Successful" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 5: Verify Token
if ($global:accessToken) {
    Write-Host "Test 5: Verify Token" -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $global:accessToken"
        }
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/verify" -Headers $headers -UseBasicParsing
        Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "  - Token Valid: $($content.data.valid)" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 6: Logout
if ($global:accessToken) {
    Write-Host "Test 6: Logout" -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $global:accessToken"
        }
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/logout" -Method POST -Headers $headers -UseBasicParsing
        Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 7: 404 Error
Write-Host "Test 7: 404 Error Handling" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/nonexistent" -UseBasicParsing
    Write-Host "✗ Should have returned 404" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✓ Correctly returned 404" -ForegroundColor Green
    } else {
        Write-Host "✗ Wrong status code" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All Tests Completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
