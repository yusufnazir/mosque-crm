# Organization Message Templates (Email / WhatsApp)

Tenant-editable transactional messages, starting with the **membership request approved** and
**membership request rejected** notifications.

## Where it lives

**Tenant Settings → Message templates** (`/tenant-settings`, `templates` tab).
The tab is only visible with the `message_template.view` permission; editing requires
`message_template.manage`. Both are granted to `ADMIN` and added to every assignable pool
(`241-data-message-template-permissions.xml`, permission ids 94 / 95).

## What an admin can do

- Pick **Email** or **WhatsApp** per template (per language).
- Edit the **subject** (email) and **message body** with a placeholder-aware editor:
  - typing `{{` (or `Ctrl+Space`) opens a filtered placeholder list, `Enter`/`Tab` inserts it;
  - placeholder chips below the editor insert at the cursor;
  - **Edit / Preview** toggle renders the message with sample data (email preview is rendered in a
    sandboxed iframe, WhatsApp as a chat bubble).
- Toggle **Attach membership terms & conditions** (works for both channels).
- Toggle **Send this message** (off = nothing is sent for that event).
- **Save** stores an override; **Reset to default** removes it.

Two language variants are edited independently (`en`, `nl`). The language used at send time is the
recipient's preference, else the organization language (`DEFAULT_LANGUAGE`).

## Placeholders

| Placeholder | Example |
|---|---|
| `{{organization.name}}`, `.shortName`, `.address`, `.city`, `.country`, `.postalCode`, `.phone`, `.email`, `.website` | Masjid Al-Noor |
| `{{app.name}}` | MemberFlow |
| `{{person.firstName}}`, `.lastName`, `.fullName`, `.email`, `.phone` | Ahmed Rahman |
| `{{request.submittedAt}}` | 24 Nov 2026 |
| `{{activation.url}}` | set-password link (approved template) |
| `{{rejection.reason}}` | admin's rejection reason (rejected template) |

Unknown placeholders are removed from real messages (never leak `{{…}}` to a recipient) and kept in
previews so typos are visible.

## Attachment of terms & conditions

The attachment follows the **template language** and the **published terms version**: the PDF uses
`title_nl`/`content_nl` when the template language is Dutch *and that version has them*, otherwise the
English text. A version published without Dutch content therefore yields an English document — the
test-send reply says so explicitly ("Deze versie heeft geen Nederlandse vertaling…"), and the file is
named `lidmaatschapsvoorwaarden-vN.pdf` in the Dutch case.

**Email** — when enabled, the dispatch:

1. Renders the active membership terms to a **PDF** (`TermsDocumentService`, OpenPDF).
2. Sends it as a Base64 `attachments` entry to the mail service.
3. Also renders the full terms as an appendix **inside the email body**.

The mail service's attachment support is not documented; if it rejects a message carrying
attachments, `EmailService.sendTemplateEmail` retries once **without** attachments so the email is
never lost — the appendix then still delivers the terms.

**WhatsApp** — the same terms PDF is sent as a **document** through WAHA `POST /api/sendFile`
(`file.mimetype=application/pdf`, `file.filename=membership-terms-vN.pdf` (or
`lidmaatschapsvoorwaarden-vN.pdf` for Dutch), `file.data=<base64>`), with
the rendered message as the caption. The queue carries the document: `whatsapp_outbound_messages`
gained `media_filename`, `media_mimetype` and `media_data` (DDL `203`), `WhatsAppEnqueueRequest` accepts
the media fields, and `WhatsAppDispatcher` calls `sendFile` instead of `sendText` when the row has a
document. If no active terms version exists, no document is attached and the test-send reply says so.
WhatsApp caps media captions at 1024 characters — the default templates are well under that.

## Fallback behaviour on approve

1. Template channel `EMAIL` and the applicant has an email → send the rendered email.
2. Otherwise (or when the mail service rejects it) → `AccountActivationNotifier` queues the
   set-password link on the WhatsApp outbox, or logs the link for manual sharing.
3. When the applicant has no email, the API still returns `activationUrl` to the admin.

## Test send

The editor has a **Send test** button (requires `message_template.manage`). It sends the
current draft — even unsaved — to an address you type in, using the same code path as the real
notification, with placeholders filled from the sample data and the message marked as a test
(`[Test]` subject prefix, a yellow banner in the email, `Test message` prefix on WhatsApp).

The response tells you exactly what happened:

| Status | Meaning |
|---|---|
| `SENT` | Mail service accepted the message (message says whether the terms PDF was attached) |
| `QUEUED` | WhatsApp outbox accepted it; the dispatcher sends within seconds |
| `SKIPPED` | WhatsApp refused (opt-out, already queued, invalid number) — reason included |
| `NOT_CONFIGURED` | No mail server configured for this organization |
| `NO_RECIPIENT` | No address/number was entered |
| `FAILED` | Mail service rejected the message, or WhatsApp is unavailable |

If a test with **Attach membership terms** is sent but no active terms version exists, the reply
says so instead of silently sending without an attachment.

## Backend

| File | Purpose |
|---|---|
| `entity/OrganizationMessageTemplate.java` | tenant-scoped override rows (`organization_id`, `template_key`, `language`, `channel`, `subject`, `body`, `attach_terms`, `active`) |
| `repository/OrganizationMessageTemplateRepository.java` | find/delete by key + language |
| `service/MessageTemplateDefinitions.java` | template catalogue + default EN/NL texts per channel + placeholder samples |
| `service/MessageTemplateService.java` | resolve/list/update/reset/preview/render, email + WhatsApp dispatch |
| `service/TermsDocumentService.java` | terms → PDF |
| `controller/MessageTemplateController.java` | `/message-templates` |
| `dto/EmailAttachment.java` | Base64 attachment entry |
| DDL `202-create-organization-message-templates.xml` + FK `b1000099-…-019` | table + foreign key |
| `whatsapp_outbound_messages` media columns (DDL `203`) | PDF/attachment payload for WAHA `sendFile` |

Endpoints (all tenant-scoped through `X-Organization-Id`):

```
GET    /message-templates                    list every template × language
GET    /message-templates/{key}?language=en
GET    /message-templates/{key}/placeholders
PUT    /message-templates/{key}?language=en  { channel, subject, body, attachTerms, active }
POST   /message-templates/{key}/reset?language=en
POST   /message-templates/{key}/preview      { language, channel, subject, body, attachTerms, variables }
POST   /message-templates/{key}/test         { language, channel, subject, body, attachTerms, toEmail | toPhone }
```

Only rows that differ from the defaults are stored, so new organizations need no seed data.

## Adding another template

1. Add a definition in `MessageTemplateDefinitions` (key, placeholders, default subject/bodies).
2. Call `messageTemplateService.dispatch(key, org, language, recipientName, email, phone, variables)`
   from the service that owns the event.
3. Optionally add i18n labels under `message_templates.templates.<key_with_underscores>.{name,description}`.

No migration is needed.
