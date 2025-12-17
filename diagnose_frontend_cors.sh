#!/bin/bash

echo "========================================="
echo "Frontend CORS Diagnostic Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if server is running
echo "1. Checking if server is running on EC2..."
if curl -s http://localhost:6112/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running on localhost:6112"
else
    echo -e "${RED}✗${NC} Server is NOT running on localhost:6112"
    echo "   Run: sudo docker logs dev-sansaar-container"
    exit 1
fi
echo ""

# Test 2: Check CORS headers from localhost
echo "2. Checking CORS headers from localhost..."
CORS_HEADERS=$(curl -s -I -H "Origin: https://www.merd-bhanwaridevi.merakilearn.org" \
    http://localhost:6112/pathways/dropdown 2>&1 | grep -i "access-control")

if [ -z "$CORS_HEADERS" ]; then
    echo -e "${RED}✗${NC} No CORS headers found"
else
    echo -e "${GREEN}✓${NC} CORS headers present:"
    echo "$CORS_HEADERS"
fi
echo ""

# Test 3: Check if HTTPS endpoint is accessible from EC2
echo "3. Checking if HTTPS endpoint is accessible from EC2..."
HTTPS_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://merd-api.merakilearn.org/pathways/dropdown 2>&1)

if [ "$HTTPS_TEST" = "200" ]; then
    echo -e "${GREEN}✓${NC} HTTPS endpoint is accessible (HTTP $HTTPS_TEST)"
elif [ "$HTTPS_TEST" = "000" ]; then
    echo -e "${RED}✗${NC} Cannot connect to HTTPS endpoint (connection failed)"
    echo "   This could be:"
    echo "   - SSL certificate issue"
    echo "   - DNS not resolving"
    echo "   - Proxy/load balancer not forwarding requests"
else
    echo -e "${YELLOW}⚠${NC} HTTPS endpoint returned HTTP $HTTPS_TEST"
fi
echo ""

# Test 4: Check SSL certificate
echo "4. Checking SSL certificate..."
SSL_CHECK=$(echo | openssl s_client -connect merd-api.merakilearn.org:443 -servername merd-api.merakilearn.org 2>&1)

if echo "$SSL_CHECK" | grep -q "Verify return code: 0"; then
    echo -e "${GREEN}✓${NC} SSL certificate is valid"
elif echo "$SSL_CHECK" | grep -q "connect: Connection refused"; then
    echo -e "${RED}✗${NC} Port 443 is not accessible"
    echo "   Check if:"
    echo "   - Nginx/reverse proxy is running"
    echo "   - Security group allows port 443"
else
    echo -e "${YELLOW}⚠${NC} SSL certificate issue detected:"
    echo "$SSL_CHECK" | grep "Verify return code"
fi
echo ""

# Test 5: Check if reverse proxy is forwarding to Docker
echo "5. Checking nginx/reverse proxy configuration..."
if command -v nginx &> /dev/null; then
    if sudo nginx -t &> /dev/null; then
        echo -e "${GREEN}✓${NC} Nginx configuration is valid"
    else
        echo -e "${RED}✗${NC} Nginx configuration has errors:"
        sudo nginx -t
    fi
    
    # Check if nginx is running
    if pgrep nginx > /dev/null; then
        echo -e "${GREEN}✓${NC} Nginx is running"
    else
        echo -e "${RED}✗${NC} Nginx is NOT running"
        echo "   Run: sudo systemctl start nginx"
    fi
else
    echo -e "${YELLOW}⚠${NC} Nginx not found (might be using different reverse proxy)"
fi
echo ""

# Test 6: Check Docker container logs for errors
echo "6. Checking Docker container logs (last 20 lines)..."
echo "---"
sudo docker logs --tail 20 dev-sansaar-container 2>&1 | tail -20
echo "---"
echo ""

# Test 7: Test actual response time
echo "7. Testing response time from EC2..."
TIME_START=$(date +%s%N)
RESPONSE=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:6112/pathways/dropdown 2>&1)
TIME_MS=$(echo "scale=0; $RESPONSE * 1000 / 1" | bc)

if [ "$TIME_MS" -lt 1000 ]; then
    echo -e "${GREEN}✓${NC} Response time: ${TIME_MS}ms (fast)"
elif [ "$TIME_MS" -lt 5000 ]; then
    echo -e "${YELLOW}⚠${NC} Response time: ${TIME_MS}ms (slow)"
else
    echo -e "${RED}✗${NC} Response time: ${TIME_MS}ms (very slow - likely timeout)"
fi
echo ""

# Test 8: Check security group/firewall
echo "8. Checking if port 443 is listening..."
if sudo netstat -tlnp | grep -q ":443 "; then
    echo -e "${GREEN}✓${NC} Port 443 is listening"
    sudo netstat -tlnp | grep ":443 "
else
    echo -e "${RED}✗${NC} Port 443 is NOT listening"
    echo "   No service is listening on port 443"
    echo "   You need to set up Nginx/Apache as reverse proxy"
fi
echo ""

# Test 9: Test with CORS headers
echo "9. Testing CORS preflight (OPTIONS request)..."
OPTIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: https://www.merd-bhanwaridevi.merakilearn.org" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization" \
    http://localhost:6112/pathways/dropdown 2>&1)

if [ "$OPTIONS_RESPONSE" = "204" ] || [ "$OPTIONS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} CORS preflight working (HTTP $OPTIONS_RESPONSE)"
else
    echo -e "${RED}✗${NC} CORS preflight failed (HTTP $OPTIONS_RESPONSE)"
fi
echo ""

echo "========================================="
echo "Summary & Recommendations"
echo "========================================="
echo ""

# Provide recommendations based on tests
if [ "$HTTPS_TEST" = "000" ]; then
    echo -e "${RED}CRITICAL:${NC} HTTPS endpoint is not accessible"
    echo "This is the root cause of your frontend issue."
    echo ""
    echo "Possible causes:"
    echo "1. Nginx/reverse proxy is not running"
    echo "2. Nginx is not configured to proxy to Docker on port 6112"
    echo "3. SSL certificate is not properly configured"
    echo "4. Port 443 is blocked by security group"
    echo ""
    echo "Check nginx configuration:"
    echo "  sudo nano /etc/nginx/sites-available/merd-api"
    echo ""
    echo "It should proxy to: http://localhost:6112"
fi

if [ "$TIME_MS" -gt 5000 ]; then
    echo -e "${YELLOW}WARNING:${NC} API is very slow (${TIME_MS}ms)"
    echo "This could cause frontend timeouts."
    echo ""
    echo "Check:"
    echo "1. Database connection performance"
    echo "2. N+1 query issues"
    echo "3. External API calls (Strapi)"
fi

echo ""
echo "Done!"
