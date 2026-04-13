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
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 40px 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; text-align: center;">
                                ${appName}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                Update Lidmaatschapsaanvraag
                            </h2>

                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Beste <strong>${firstName}</strong>,
                            </p>

                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Bedankt voor uw interesse in het lidmaatschap van <strong>${orgName}</strong>. Na zorgvuldige afweging zijn wij helaas niet in staat uw aanvraag op dit moment goed te keuren.
                            </p>

                            <#if rejectionReason?has_content>
                            <div style="margin: 20px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #d97706; border-radius: 4px;">
                                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">Reden:</p>
                                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">${rejectionReason}</p>
                            </div>
                            </#if>

                            <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Als u vragen heeft of denkt dat deze beslissing onjuist is, neem dan rechtstreeks contact met ons op.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                Met vriendelijke groet,<br>
                                <strong style="color: #047857;">${appName} Team</strong>
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                Dit is een automatisch bericht, gelieve niet te antwoorden op deze e-mail.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
