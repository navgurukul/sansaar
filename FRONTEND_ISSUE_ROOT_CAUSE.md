# Frontend CORS Issue - Root Cause Analysis

## The REAL Problem

Your issue is **NOT CORS** - it's that your frontend can't reach the backend at all!

### Evidence from Browser Screenshot:
1. ⚠️ **"Provisional headers are shown"** - browser NEVER received a response
2. ⚠️ Requests stuck in "pending" state
3. ⚠️ Eventually timeout or fail

### Root Cause

Your Docker container runs on `http://localhost:6112`, but your frontend tries to access `https://merd-api.merakilearn.org` (port 443 HTTPS).

**You need a reverse proxy** (Nginx) to:
- Listen on port 443 (HTTPS)
- Handle SSL certificate
- Forward requests to Docker on port 6112

## Diagnostic Steps

### On EC2, run this script:

```bash
cd ~/sansaar
chmod +x diagnose_frontend_cors.sh
./diagnose_frontend_cors.sh
```

This will tell you exactly what's wrong.

## Most Likely Issues & Fixes

### Issue 1: Nginx Not Running

**Check:**
```bash
sudo systemctl status nginx
```

**Fix:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Issue 2: Nginx Not Configured

**Check if config exists:**
```bash
ls -la /etc/nginx/sites-available/merd-api
ls -la /etc/nginx/sites-enabled/merd-api
```

**Create config:**
```bash
# Copy the provided nginx-merd-api.conf
sudo cp nginx-merd-api.conf /etc/nginx/sites-available/merd-api

# Update SSL certificate paths in the file
sudo nano /etc/nginx/sites-available/merd-api

# Enable the site
sudo ln -s /etc/nginx/sites-available/merd-api /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Issue 3: No SSL Certificate

**If you don't have SSL certificate, get one with Let's Encrypt:**

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d merd-api.merakilearn.org

# This will automatically:
# 1. Get SSL certificate
# 2. Configure nginx
# 3. Set up auto-renewal
```

### Issue 4: Port 443 Blocked

**Check security group:**
```bash
# Test if port 443 is accessible from outside
curl -v https://merd-api.merakilearn.org
```

**If it fails, you need to:**
1. Go to AWS Console
2. EC2 → Security Groups
3. Find your instance's security group
4. Add inbound rule:
   - Type: HTTPS
   - Port: 443
   - Source: 0.0.0.0/0 (or your specific IPs)

### Issue 5: DNS Not Pointing to EC2

**Check DNS:**
```bash
nslookup merd-api.merakilearn.org
```

Should return your EC2 public IP.

**If wrong:**
1. Update A record in your DNS provider
2. Point `merd-api.merakilearn.org` to your EC2 public IP

## Quick Test After Setup

```bash
# From EC2
curl -v https://merd-api.merakilearn.org/pathways/dropdown

# Should return:
# HTTP/2 200
# access-control-allow-origin: *
# {...JSON data...}
```

## Complete Setup Commands (If Starting Fresh)

```bash
# 1. Install nginx
sudo apt update
sudo apt install nginx

# 2. Copy nginx config
sudo cp ~/sansaar/nginx-merd-api.conf /etc/nginx/sites-available/merd-api

# 3. Get SSL certificate
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d merd-api.merakilearn.org

# 4. Enable site
sudo ln -s /etc/nginx/sites-available/merd-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. Make sure Docker is running
cd ~/sansaar
sudo docker-compose -f dev-compose.yaml up -d

# 6. Test
curl https://merd-api.merakilearn.org/pathways/dropdown
```

## Why CORS Changes Didn't Help

The CORS settings are **on the backend server**. But if the reverse proxy (Nginx) isn't forwarding requests to the backend, the browser never even reaches the CORS logic.

**Flow should be:**
```
Browser (HTTPS 443)
  ↓
Nginx (reverse proxy on EC2)
  ↓
Docker container (port 6112)
  ↓
Your API code (with CORS)
```

**Current flow (broken):**
```
Browser (HTTPS 443)
  ↓
??? Nothing listening on port 443
  ✗ Connection fails
  ✗ "Provisional headers" shown
  ✗ CORS never evaluated
```

## Summary

1. Run `diagnose_frontend_cors.sh` to identify the exact issue
2. Most likely: Nginx is not configured/running
3. Set up Nginx reverse proxy with SSL
4. Make sure port 443 is open in security group
5. Test again from frontend

The CORS configuration is correct (`origin: ['*']`), but it's irrelevant if requests aren't reaching your server!
