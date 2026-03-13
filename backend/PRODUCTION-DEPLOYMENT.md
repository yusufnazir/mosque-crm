# Production Deployment Guide

## Pre-Deployment Security Checklist

### ✅ Required Before Production

- [ ] **Generate Strong JWT Secret**
  ```bash
  openssl rand -base64 32
  ```
  Set as `JWT_SECRET` environment variable

- [ ] **Enable HTTPS/SSL**
  - Obtain SSL certificate (Let's Encrypt, AWS Certificate Manager, etc.)
  - Configure `server.ssl.*` properties
  - Update mobile app API base URL to use `https://`

- [ ] **Change Default Credentials**
  - Remove or change default admin/admin123 user
  - Enforce strong password policy for all users

- [ ] **Configure Production CORS**
  - Set `CORS_ALLOWED_ORIGINS` to your actual frontend domain(s)
  - Use HTTPS URLs only (e.g., `https://app.mosque.com`)

- [ ] **Secure Database**
  - Use strong database password
  - Restrict database access to application server only
  - Enable SSL for database connections

- [ ] **Review Application Properties**
  - Set `spring.jpa.show-sql=false` (disable SQL logging)
  - Set `spring.freemarker.cache=true` (enable template caching)
  - Remove development-only settings

### 🔒 Optional Security Enhancements

- [ ] **Rate Limiting** - Add rate limiter for /auth endpoints
- [ ] **Token Refresh** - Implement refresh token mechanism
- [ ] **Audit Logging** - Log authentication events and sensitive operations
- [ ] **Password Policy** - Enforce minimum length, complexity requirements
- [ ] **Two-Factor Authentication** - Add 2FA support
- [ ] **Session Management** - Track active sessions, allow revocation
- [ ] **Security Monitoring** - Set up alerts for suspicious activity

## Environment Variables

Copy `.env.example` to `.env` and set actual values:

```bash
cp .env.example .env
nano .env  # Edit with your actual values
```

**Never commit `.env` file to source control!**

## HTTPS Configuration

### Option 1: Let's Encrypt (Recommended for Production)

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d api.mosque.com

# Certificate location: /etc/letsencrypt/live/api.mosque.com/
```

Add to `application.properties`:
```properties
server.ssl.enabled=true
server.ssl.certificate=/etc/letsencrypt/live/api.mosque.com/fullchain.pem
server.ssl.certificate-private-key=/etc/letsencrypt/live/api.mosque.com/privkey.pem
```

### Option 2: Java Keystore

```bash
# Generate keystore
keytool -genkeypair -alias mosque-crm \
  -keyalg RSA -keysize 2048 \
  -storetype PKCS12 \
  -keystore keystore.p12 \
  -validity 3650
```

Add to `application.properties`:
```properties
server.ssl.enabled=true
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=YOUR_PASSWORD
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=mosque-crm
```

## Database Configuration

### MariaDB Production Setup

```sql
-- Create production database
CREATE DATABASE mcrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with strong password
CREATE USER 'mcrm'@'localhost' IDENTIFIED BY 'STRONG_RANDOM_PASSWORD';
GRANT ALL PRIVILEGES ON mcrm.* TO 'mcrm'@'localhost';
FLUSH PRIVILEGES;

-- Enable SSL for connections (recommended)
-- Configure in MariaDB server settings
```

Update `application.properties`:
```properties
spring.datasource.url=jdbc:mariadb://localhost:3306/mcrm?useSSL=true&requireSSL=true
spring.datasource.username=mcrm
spring.datasource.password=${DB_PASSWORD}
```

## Mobile App Configuration

Update [mobile/lib/core/config/api_config.dart](../mobile/lib/core/config/api_config.dart):

```dart
class ApiConfig {
  // Production API URL - MUST use HTTPS
  static const String baseUrl = 'https://api.mosque.com/api';
  
  // Increase timeouts for production
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 60000;
  
  // ... rest of config
}
```

## Deployment Steps

### 1. Build Application

```bash
# Backend
cd backend
mvn clean package -DskipTests

# Frontend (if applicable)
cd ../frontend
npm run build
```

### 2. Set Environment Variables

```bash
# Export environment variables or use systemd environment files
export JWT_SECRET=$(openssl rand -base64 32)
export CORS_ALLOWED_ORIGINS=https://app.mosque.com
export DB_PASSWORD=your_strong_password
# ... other variables
```

### 3. Run Application

```bash
# Production mode
java -jar target/mosque-crm-backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=production
```

### 4. Systemd Service (Linux)

Create `/etc/systemd/system/mosque-crm.service`:

```ini
[Unit]
Description=Mosque CRM Backend
After=mariadb.service

[Service]
Type=simple
User=mosque-crm
WorkingDirectory=/opt/mosque-crm
Environment="JWT_SECRET=your_secret_here"
Environment="CORS_ALLOWED_ORIGINS=https://app.mosque.com"
Environment="DB_PASSWORD=your_db_password"
ExecStart=/usr/bin/java -jar /opt/mosque-crm/backend.jar
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable mosque-crm
sudo systemctl start mosque-crm
sudo systemctl status mosque-crm
```

## Docker Deployment (Alternative)

Create `Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080 8443
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Run with environment file:
```bash
docker run -d \
  --name mosque-crm \
  --env-file .env \
  -p 443:8443 \
  mosque-crm:latest
```

## Security Monitoring

### Log Authentication Events

Monitor logs for:
- Failed login attempts
- Token validation failures
- Unexpected 401/403 responses
- Unusual access patterns

```bash
# Tail application logs
tail -f /var/log/mosque-crm/application.log | grep -E "auth|401|403"
```

### Database Backups

```bash
# Automated backup script
mysqldump -u mcrm -p mcrm > backup-$(date +%Y%m%d).sql
```

## Testing Production Configuration

Before going live:

1. **Test HTTPS**: Verify SSL certificate is valid
2. **Test CORS**: Ensure only allowed origins can access API
3. **Test Authentication**: Verify JWT tokens work correctly
4. **Test Rate Limiting**: Verify brute-force protection
5. **Load Testing**: Use tools like JMeter or k6
6. **Security Scan**: Run OWASP ZAP or similar

## Troubleshooting

### Common Issues

**JWT Secret Not Set**
```
Error: JWT secret cannot be null
Solution: Set JWT_SECRET environment variable
```

**CORS Errors**
```
Access-Control-Allow-Origin error
Solution: Add frontend domain to CORS_ALLOWED_ORIGINS
```

**SSL Certificate Issues**
```
Certificate validation failed
Solution: Ensure certificate is valid and paths are correct
```

## Security Best Practices

1. **Never** commit secrets to Git
2. **Always** use HTTPS in production
3. **Rotate** JWT secret periodically
4. **Monitor** authentication logs
5. **Update** dependencies regularly
6. **Backup** database daily
7. **Test** disaster recovery procedures
8. **Document** security incidents

## Support

For security issues, contact: security@mosque.com
For deployment help: devops@mosque.com
