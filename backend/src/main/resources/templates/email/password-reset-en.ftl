<!DOCTYPE html>
<html style="color-scheme: light;">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <style>
        :root { color-scheme: light; }
        @media (prefers-color-scheme: dark) {
            body, table { background-color: #f5f5f5 !important; }
            td[bgcolor="#047857"] { background-color: #047857 !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;color:transparent;">
        Password reset request for ${appName}. This link expires in 30 minutes.
    </div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td bgcolor="#047857" style="background-color: #047857 !important; padding: 40px 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; text-align: center;">
                                ${appName}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                Password Reset Request
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                You have requested to reset your password for ${appName}. Click the button below to create a new password:
                            </p>
                            
                            <!-- Button -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background-color: #047857; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:
                            </p>
                            
                            <p style="margin: 0 0 20px 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; color: #047857; font-size: 14px; word-break: break-all;">
                                ${resetUrl}
                            </p>
                            
                            <div style="margin: 30px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    <strong>&#9888; Important:</strong> This link will expire in 30 minutes for security reasons.
                                </p>
                            </div>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                If you did not request this password reset, please ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                Best regards,<br>
                                <strong style="color: #047857;">${appName} Team</strong>
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                This is an automated message, please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
