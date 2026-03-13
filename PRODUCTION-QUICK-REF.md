# Production Deployment - Quick Reference

## 🚀 Deployment Commands

### 1. Set Environment Variables
```bash
# Generate JWT secret
export JWT_SECRET=$(openssl rand -base64 32)

# Set CORS
export CORS_ALLOWED_ORIGINS=https://app.mosque.com

# Set database password
export DB_PASSWORD=your_secure_password
```

### 2. Build Application
```bash
cd backend
mvn clean package -DskipTests
```

### 3. Run in Production
```bash
java -jar target/mosque-crm-backend-0.0.1-SNAPSHOT.jar
```

---

## 📋 Pre-Deployment Checklist

- [ ] JWT_SECRET environment variable set
- [ ] CORS_ALLOWED_ORIGINS configured
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Default admin password changed
- [ ] Database password secured
- [ ] Mobile app baseUrl updated to HTTPS
- [ ] .env file exists and is NOT in Git
- [ ] Security headers verified

---

## 🔒 Security Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `PRODUCTION-DEPLOYMENT.md` | Complete deployment guide |
| `SECURITY-POLICY.md` | Security measures and reporting |
| `PRODUCTION-SECURITY-SUMMARY.md` | Changes made summary |

---

## 🧪 Quick Tests

### Test Authentication
```bash
# Should return 401 (no token)
curl https://api.mosque.com/api/members

# Should return 200 (with token)
curl -H "Authorization: Bearer TOKEN" https://api.mosque.com/api/members
```

### Test CORS
```bash
curl -I -H "Origin: https://app.mosque.com" https://api.mosque.com/api/auth/login
# Should see: Access-Control-Allow-Origin: https://app.mosque.com
```

### Test Security Headers
```bash
curl -I https://api.mosque.com/api/auth/login
# Should see: Strict-Transport-Security, X-Frame-Options
```

---

## 🆘 Common Issues

### "JWT secret cannot be null"
**Solution**: Set `JWT_SECRET` environment variable

### CORS errors in browser
**Solution**: Add your frontend domain to `CORS_ALLOWED_ORIGINS`

### Mobile app can't connect
**Solution**: Update `api_config.dart` baseUrl to use HTTPS

### 401 on all endpoints
**Solution**: Ensure JWT token is valid and not expired

---

## 📞 Support

- Security: security@mosque.com
- DevOps: devops@mosque.com
- Documentation: See `backend/PRODUCTION-DEPLOYMENT.md`
