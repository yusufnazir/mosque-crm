# Password Reset Feature Documentation

## Overview
Secure "Forgot Password" feature implemented for the Mosque CRM system with email-based password reset flow.

## Architecture

### Security Features
- **No Username Enumeration**: Same response for valid/invalid usernames
- **Single-Use Tokens**: Tokens are marked as used after password reset
- **Time-Limited**: Tokens expire after 30 minutes
- **Cryptographically Secure**: UUID-based tokens
- **BCrypt Password Hashing**: Passwords are securely hashed
- **Automatic Cleanup**: Expired tokens can be deleted

---

## Backend Implementation

### 1. Database Schema

**Table**: `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
```

**Location**: `backend/src/main/resources/db/changelog/changes/ddl/008-create-password-reset-tokens-table.xml`

### 2. Entity

**PasswordResetToken.java**

```java
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    // Helper methods
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !used && !isExpired();
    }
}
```

**Location**: `backend/src/main/java/com/mosque/crm/entity/PasswordResetToken.java`

### 3. Repository

**PasswordResetTokenRepository.java**

```java
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);
    
    @Transactional
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now")
    void deleteExpiredTokens(LocalDateTime now);
}
```

**Location**: `backend/src/main/java/com/mosque/crm/repository/PasswordResetTokenRepository.java`

### 4. Services

#### PasswordResetService.java

**Key Methods**:

1. **requestPasswordReset(String username)**
   - Finds user by username
   - Generates UUID token
   - Sets 30-minute expiry
   - Saves token to database
   - Sends email (logs in development)
   - **Always returns success** (no username enumeration)

2. **resetPassword(String token, String newPassword)**
   - Validates token exists, not used, not expired
   - Validates password strength (min 6 characters)
   - Hashes new password with BCrypt
   - Updates user password
   - Marks token as used
   - Returns success/failure

3. **deleteExpiredTokens()**
   - Removes expired tokens from database
   - Can be scheduled for periodic cleanup

**Location**: `backend/src/main/java/com/mosque/crm/service/PasswordResetService.java`

#### EmailService.java

**Development Mode**:
- Logs email content to console
- Logs reset URL for easy testing
- Email body includes: greeting, reset link, expiry notice

**Production TODO**:
- Integrate with SMTP server
- Configure SendGrid / AWS SES / other email provider
- Add email templates
- Add retry logic

**Location**: `backend/src/main/java/com/mosque/crm/service/EmailService.java`

### 5. REST API

#### POST /api/auth/forgot-password

**Request**:
```json
{
  "username": "john.doe"
}
```

**Response** (always same):
```json
{
  "message": "If the account exists, a reset link has been sent."
}
```

**Status**: `200 OK` (even if user not found)

---

#### POST /api/auth/reset-password

**Request**:
```json
{
  "token": "abc123-def456-...",
  "newPassword": "NewSecurePassword123!"
}
```

**Success Response**:
```json
{
  "message": "Password successfully reset."
}
```
**Status**: `200 OK`

**Error Response**:
```json
{
  "message": "Invalid or expired reset token."
}
```
**Status**: `400 Bad Request`

**Location**: `backend/src/main/java/com/mosque/crm/controller/AuthController.java`

---

## Frontend Implementation

### 1. Forgot Password Page

**Route**: `/forgot-password`

**Features**:
- Username input field
- Language selector (top-right)
- Form validation
- Loading state
- Success/error messages
- "Back to Login" link
- Fully internationalized (English/Dutch)

**Flow**:
1. User enters username
2. Form submits to `/api/auth/forgot-password`
3. Shows success message (even if user not found)
4. Clears username field on success

**Location**: `frontend/app/(auth)/forgot-password/page.tsx`

### 2. Reset Password Page

**Route**: `/reset-password?token=xyz`

**Features**:
- Reads token from URL query parameter
- New password input (min 6 characters)
- Confirm password input
- Client-side validation:
  - Password length check
  - Password match verification
- Loading state
- Success/error messages
- Auto-redirect to login after successful reset (2 seconds)
- "Back to Login" link
- Fully internationalized (English/Dutch)

**Flow**:
1. User opens reset link from email
2. Token extracted from URL
3. User enters new password twice
4. Form submits to `/api/auth/reset-password`
5. On success: Shows message and redirects to login
6. On failure: Shows error message

**Location**: `frontend/app/(auth)/reset-password/page.tsx`

### 3. Login Page Integration

Updated login page with working "Forgot password?" link that navigates to `/forgot-password` route.

**Location**: `frontend/app/(auth)/login/page.tsx`

### 4. Translations

**English** (`en.json`):
```json
{
  "forgotPassword": {
    "title": "Forgot Password",
    "subtitle": "Enter your username to receive a password reset link",
    "username": "Username",
    "usernamePlaceholder": "Enter your username",
    "submit": "Send Reset Link",
    "sending": "Sending...",
    "success": "If the account exists, a reset link has been sent.",
    "error": "An error occurred. Please try again.",
    "backToLogin": "Back to Login"
  },
  "resetPassword": {
    "title": "Reset Password",
    "subtitle": "Enter your new password",
    "newPassword": "New Password",
    "newPasswordPlaceholder": "Enter new password (min 6 characters)",
    "confirmPassword": "Confirm Password",
    "confirmPasswordPlaceholder": "Re-enter new password",
    "submit": "Reset Password",
    "resetting": "Resetting...",
    "success": "Password successfully reset. Redirecting to login...",
    "error": "Invalid or expired reset token.",
    "noToken": "No reset token provided.",
    "passwordTooShort": "Password must be at least 6 characters.",
    "passwordMismatch": "Passwords do not match.",
    "backToLogin": "Back to Login"
  }
}
```

**Dutch** (`nl.json`): Complete translations provided

**Location**: 
- `frontend/lib/i18n/locales/en.json`
- `frontend/lib/i18n/locales/nl.json`

---

## Testing

### Development Testing

1. **Start Backend**:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Forgot Password Flow**:
   - Navigate to http://localhost:3000/login
   - Click "Forgot your password?"
   - Enter username: `admin`
   - Check backend console for reset URL
   - Copy token from console log

4. **Test Reset Password Flow**:
   - Open reset URL from console: `http://localhost:3000/reset-password?token=<token>`
   - Enter new password (min 6 chars)
   - Confirm password
   - Click "Reset Password"
   - Should redirect to login

5. **Test Login with New Password**:
   - Login with username and new password
   - Should successfully authenticate

### Test Cases

#### Security Tests
- ✅ Same response for valid/invalid usernames
- ✅ Token expires after 30 minutes
- ✅ Token can only be used once
- ✅ Invalid token returns error
- ✅ Expired token returns error
- ✅ Password is hashed (not stored in plaintext)

#### Functional Tests
- ✅ Email sent (logged in development)
- ✅ Reset URL contains valid token
- ✅ New password must be at least 6 characters
- ✅ Password confirmation must match
- ✅ Successful reset allows login
- ✅ Language selection persists across pages

#### UI Tests
- ✅ Forgot password link navigates correctly
- ✅ Form validation shows appropriate errors
- ✅ Loading states prevent double submission
- ✅ Success messages display correctly
- ✅ Error messages display correctly
- ✅ Auto-redirect after successful reset

---

## Production Deployment Checklist

### Backend

1. **Email Service Integration**
   - [ ] Configure SMTP server or email provider
   - [ ] Update `EmailService.java` with real email sending
   - [ ] Set up email templates
   - [ ] Configure email credentials securely (environment variables)
   - [ ] Test email delivery

2. **Security Configuration**
   - [ ] Configure production base URL for reset links
   - [ ] Set up rate limiting for forgot-password endpoint
   - [ ] Add CAPTCHA for forgot-password form (optional)
   - [ ] Configure token expiry duration (default: 30 minutes)
   - [ ] Enable HTTPS/SSL

3. **Monitoring & Logging**
   - [ ] Log password reset requests (without sensitive data)
   - [ ] Monitor for abuse/suspicious patterns
   - [ ] Set up alerts for high volume of reset requests

4. **Scheduled Tasks**
   - [ ] Schedule periodic cleanup of expired tokens
   - [ ] Example Spring scheduled task:
     ```java
     @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
     public void cleanupExpiredTokens() {
         passwordResetService.deleteExpiredTokens();
     }
     ```

### Frontend

1. **Configuration**
   - [ ] Update API base URL for production
   - [ ] Update reset password base URL in email template
   - [ ] Test email links point to correct domain

2. **User Experience**
   - [ ] Test all flows in production-like environment
   - [ ] Verify translations are complete
   - [ ] Test on mobile devices
   - [ ] Verify email client rendering

3. **Analytics** (Optional)
   - [ ] Track password reset requests
   - [ ] Monitor completion rate
   - [ ] Identify common issues

---

## Configuration

### Backend Configuration

**application.yml** (add these settings):

```yaml
app:
  password-reset:
    token-expiry-minutes: 30
    base-url: http://localhost:3000  # Update for production
    email:
      from: noreply@mosque-crm.org
      subject: Password Reset Request
```

### Environment Variables

For production, use environment variables:

```bash
# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key

# App Configuration
APP_BASE_URL=https://your-domain.com
```

---

## Security Considerations

### ✅ Implemented
- No username enumeration
- Cryptographically secure tokens (UUID)
- Token expiration (30 minutes)
- Single-use tokens
- Password hashing (BCrypt)
- Cascading delete on user removal

### 🔄 Recommended Additions
- Rate limiting (prevent brute force)
- CAPTCHA on forgot-password form
- Email verification before password reset
- Notify user via email when password is changed
- IP-based rate limiting
- Account lockout after multiple failed attempts
- Two-factor authentication (2FA) option

---

## Troubleshooting

### Common Issues

**1. Email not received**
- Check console logs (development mode logs reset URL)
- Verify user has email address in database
- Check email service configuration
- Check spam/junk folder

**2. Invalid/expired token error**
- Token expires after 30 minutes
- Token can only be used once
- Verify token in URL matches database

**3. Password reset fails**
- Ensure password is at least 6 characters
- Check passwords match
- Verify token is valid and not expired

**4. Frontend build errors**
- Run `npm install` in frontend directory
- Verify all imports are correct
- Check TypeScript errors with `npm run build`

### Debug Commands

**Check token in database**:
```sql
SELECT * FROM password_reset_tokens 
WHERE token = 'your-token-here';
```

**Check user password updated**:
```sql
SELECT id, username, password, updated_at 
FROM users 
WHERE username = 'your-username';
```

**Clean up all tokens**:
```sql
DELETE FROM password_reset_tokens;
```

---

## API Usage Examples

### cURL Examples

**Request Password Reset**:
```bash
curl -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}'
```

**Reset Password**:
```bash
curl -X POST http://localhost:8080/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"your-token-here",
    "newPassword":"NewPassword123!"
  }'
```

---

## Future Enhancements

### Planned Features
- [ ] Email templates with branding
- [ ] SMS-based password reset option
- [ ] Multi-language emails
- [ ] Password strength meter on frontend
- [ ] Password history (prevent reuse)
- [ ] Security questions as additional verification
- [ ] Audit log for password changes
- [ ] Admin panel to manage reset tokens

### Integration Opportunities
- [ ] Integrate with notification system
- [ ] Add to admin dashboard statistics
- [ ] Create audit trail for compliance
- [ ] Add user activity timeline

---

## Support

For issues or questions:
1. Check console logs (backend and frontend)
2. Review this documentation
3. Check database for token records
4. Verify email service configuration
5. Test with development credentials (admin / admin123)

---

## License & Credits

Part of the Mosque CRM system
- Backend: Spring Boot 3.2.1
- Frontend: Next.js 14
- Security: BCrypt password hashing, JWT authentication
