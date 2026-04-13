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
                                Registration Request Received
                            </h2>

                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Dear <strong>${firstName}</strong>,
                            </p>

                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Thank you for submitting your membership application to <strong>${orgName}</strong>. We have received your request and it is currently under review.
                            </p>

                            <div style="margin: 20px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #047857; border-radius: 4px;">
                                <p style="margin: 0; color: #1f2937; font-size: 14px;">
                                    You will receive another email once your application has been reviewed. This may take a few business days.
                                </p>
                            </div>

                            <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                If you did not submit this request, please disregard this email.
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
