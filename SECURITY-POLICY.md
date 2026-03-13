# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please DO NOT create public GitHub issues for security vulnerabilities.**

To report a security vulnerability, please email: security@mosque.com

You should receive a response within 48 hours. If for some reason you do not, please follow up via email.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Security Measures

### Authentication & Authorization
- ✅ BCrypt password hashing with adaptive cost factor
- ✅ JWT-based stateless authentication
- ✅ Role-based access control (RBAC)
- ✅ Token expiration (24 hours default)
- ✅ Secure token storage (FlutterSecureStorage with hardware encryption)

### Data Protection
- ✅ Password validation enforcement (8+ chars, uppercase, lowercase, number, special char)
- ✅ Encrypted token storage on mobile devices
- ✅ Secure session management
- ⚠️ **MUST enable HTTPS in production**

### API Security
- ✅ CORS configuration for allowed origins only
- ✅ Security headers (HSTS, X-Frame-Options, etc.)
- ✅ Authentication required for all endpoints (except /auth/*)
- ⚠️ Rate limiting recommended (see PRODUCTION-DEPLOYMENT.md)

### Infrastructure Security
- ⚠️ **Database credentials must be secured**
- ⚠️ **JWT secret must be cryptographically random**
- ⚠️ **Environment variables for all secrets**
- ⚠️ **HTTPS/TLS required in production**

## Security Checklist for Production

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Strong JWT secret (256-bit random, from environment variable)
- [ ] Default credentials changed
- [ ] CORS limited to production domain(s)
- [ ] Database password is strong and unique
- [ ] Rate limiting enabled on authentication endpoints
- [ ] Security headers configured
- [ ] Dependency security scanning enabled
- [ ] Logging and monitoring configured
- [ ] Backup and disaster recovery plan

## Known Security Limitations

1. **No Built-in Rate Limiting**: 
   - Current implementation does not include rate limiting
   - Vulnerable to brute-force attacks on login endpoint
   - **Mitigation**: Add rate limiter (e.g., Bucket4j, Spring Security rate limiter)

2. **No Token Refresh Mechanism**:
   - Users must re-login after 24 hours
   - **Mitigation**: Implement refresh token pattern

3. **No Two-Factor Authentication (2FA)**:
   - Single-factor authentication only
   - **Mitigation**: Add 2FA support for sensitive accounts

4. **No Session Revocation**:
   - Cannot invalidate tokens before expiration
   - **Mitigation**: Implement token blacklist with Redis

## Dependency Security

Run security audit regularly:

```bash
# Backend (Maven)
mvn org.owasp:dependency-check-maven:check

# Frontend (npm)
cd frontend && npm audit

# Mobile (Flutter)
cd mobile && flutter pub outdated
```

## Incident Response

In case of a security incident:

1. **Assess Impact**: Determine what data/systems are affected
2. **Contain**: Immediately revoke compromised credentials
3. **Investigate**: Review logs to understand the breach
4. **Notify**: Inform affected users if necessary
5. **Remediate**: Apply fixes and security patches
6. **Review**: Update security measures to prevent recurrence

## Security Updates

- Security patches are released as needed
- Subscribe to security advisories: security@mosque.com
- Check for updates regularly: `git pull origin main`

## Vulnerability Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 1-2**: Initial response and acknowledgment
- **Day 3-7**: Investigation and impact assessment
- **Day 8-14**: Develop and test fix
- **Day 15**: Release security patch
- **Day 30**: Public disclosure (if appropriate)

## Contact

Security Team: security@mosque.com
Emergency Contact: +1-XXX-XXX-XXXX

---

Last Updated: February 28, 2026
