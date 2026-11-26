# Multi-number WhatsApp (channels)

The application can send from **several WhatsApp numbers** at the same time — one per linked WAHA
session — without any of them leaking into another's traffic.

The rule is simple: **a number is data, never code.** No phone number, jid, session name, host name,
token, event list, retry count or timeout is written into the application source. Everything that can
differ per deployment, per environment or per number is configuration.

---

## 1. How isolation works

| Concern | Where the number comes from |
| --- | --- |
| Outbound | `whatsapp_outbound_messages.channel_id` + `waha_session` (snapshot) are written when the message is **queued**. The dispatcher sends through exactly that session, so a retry can never switch numbers. |
| Inbound | The webhook resolves the channel from the payload `session` (fallback: the account jid in `me.id`), then checks the channel exists **and** is enabled. Anything else is refused with a 4xx and nothing is written. |
| Threads | `whatsapp_inbound_messages` is keyed by `(channel_id, from_phone)`, so one contact writing to two of our numbers produces two threads. |
| Opt-out / STOP | `whatsapp_opt_outs` is keyed by `(channel_id, phone_e164)`. A STOP protects the number that was messaged; the other number is unaffected. Rows without a channel (pre-channel data) are treated as a global stop. |
| Caps & pacing | Platform-wide on purpose (`WAHA_MAX_PER_HOUR` …), so several numbers never multiply the total volume by accident. |
| Disabled number | Excluded from claiming (`findDueForUpdate`), skipped at send time and refused on inbound. |

A channel is identified by its **id**. `display_number` / `me.id` are read from WAHA and shown in the
UI; they are never used as an identifier.

---

## 2. Configuration reference

### 2.1 Global connection (Settings → WhatsApp, or environment)

Resolution order: `configurations` row → environment variable → the default declared in
`com.mosque.crm.config.WahaProperties` (the single place every default is documented).

| Setting | Env var | DB key (`configurations`) | Type | Default | Read by |
| --- | --- | --- | --- | --- | --- |
| WAHA base URL | `WAHA_BASE_URL` | `WAHA_BASE_URL` | URL | `http://localhost:3000` | `WahaSettingsService.baseUrl()` → `WahaClient` |
| WAHA API key | `WAHA_API_KEY` | `WAHA_API_KEY` | secret | *(empty)* | same (sent as `X-Api-Key`, never logged) |
| Fallback session name | `WAHA_SESSION` | `WAHA_SESSION` | string | `default` | migration 201 (import), `WhatsAppChannelService` error text. **Never** overrides a channel. |
| Global webhook secret | `WAHA_WEBHOOK_SECRET` | `WAHA_WEBHOOK_SECRET` | secret | *(empty)* | `WhatsAppChannelService.expectedWebhookToken` for channels without their own token |
| Default webhook events | `WAHA_WEBHOOK_EVENTS` | `WAHA_WEBHOOK_EVENTS` | CSV | `message` | `WhatsAppChannelService.expectedWebhookEvents` |
| Opt-out keywords | `WAHA_OPT_OUT_KEYWORDS` | `WAHA_OPT_OUT_KEYWORDS` | CSV | `stop,stop all,…` (see `WahaProperties`) | `WhatsAppWebhookService.detectOptOutKeyword` |
| Connect timeout | `WAHA_CONNECT_TIMEOUT_MILLIS` | — | ms | `5000` | `WahaClient` (restart-bound) |
| Read timeout | `WAHA_READ_TIMEOUT_MILLIS` | — | ms | `20000` | `WahaClient` (restart-bound) |
| Retries before giving up | `WAHA_MAX_ATTEMPTS` | `WAHA_MAX_ATTEMPTS` | int | `3` | `WhatsAppOutboundService.markAttemptFailed` |
| Hold-back when a number is offline | `WAHA_OFFLINE_RETRY_MINUTES` | — | minutes | `5` | `WhatsAppDispatcher` (no attempt is consumed) |
| Back-off when the hourly cap is hit | `WAHA_CAP_RETRY_MINUTES` | — | minutes | `15` | `WhatsAppRateLimiter` |
| Pacing, caps, warm-up, quiet hours, country code, conversation window | `WAHA_*` | `WAHA_*` | int | see `WahaProperties` | `WhatsAppRateLimiter`, `WhatsAppOutboundService` |

### 2.2 Per number (`whatsapp_channels`, Settings → WhatsApp → Numbers)

| Column | Meaning | Default |
| --- | --- | --- |
| `label` | Human name ("Members", "Events") | the session name |
| `purpose` | Free text, shown to admins | — |
| `waha_session` | WAHA session that holds this number's login (unique) | — |
| `display_number` | Last account jid WAHA reported (`<digits>@c.us`) | filled from WAHA |
| `enabled` | When false nothing is queued for it, sent from it or accepted for it | `true` |
| `is_default` | The number used when a caller names none (at most one row) | first row |
| `webhook_token` | This channel's own webhook secret | generated on create; empty = global secret |
| `webhook_url` | Webhook URL override | empty = `APP_BASE_URL` + `/api/whatsapp/webhook` |
| `webhook_events` | WAHA events for this channel (CSV) | empty = global default list |

A session name can only be saved when **WAHA reports it at that moment** (`GET /api/sessions?all=true`);
an unknown name, or an unreachable WAHA, is rejected with a 400. The dropdown is built from that same
call, so a typo cannot produce a channel that silently never sends.

### 2.3 Per flow (which number a feature uses)

`WAHA_CHANNEL_FLOW_<FLOW>` → a channel id, stored in `configurations`. Resolution order for any send:
explicit `channelId` (UI) → flow mapping → `is_default` channel.

| Key | Used by |
| --- | --- |
| `WAHA_CHANNEL_FLOW_NOTIFICATIONS` | account-activation / set-password link (`AccountActivationNotifier`) |

Missing or disabled mapping falls back to the default number; no code change is needed to move a flow
to another number.

---

## 3. HTTP API (platform admin only)

| Method & path | Purpose |
| --- | --- |
| `GET /whatsapp/channels` | List with live WAHA state per number |
| `GET /whatsapp/channels/available-sessions` | Sessions WAHA reports (source for the dropdown) |
| `POST /whatsapp/channels` | Create (validates the session against WAHA) |
| `PUT /whatsapp/channels/{id}` | Update (label, session, enabled, default, webhook url/token/events) |
| `POST /whatsapp/channels/{id}/default` | Make this number the default |
| `POST /whatsapp/channels/{id}/token` | Rotate this number's webhook token |
| `POST /whatsapp/channels/{id}/test` | Send one message right now from this number |
| `GET /whatsapp/channels/{id}/webhook-config` | The exact JSON to `PUT` on the WAHA host (read-only) |
| `DELETE /whatsapp/channels/{id}` | Delete — only when the number has no history (disable instead) |
| `POST /whatsapp/webhook` | WAHA → app; authenticated per channel |

Every change is effective for the next send and the next inbound event, without restarting the
application container. Messages already queued keep the number they were queued for — that is the
retry-safety guarantee.

---

## 4. Migration 201 (`201-create-whatsapp-channels.xml`)

1. Creates `whatsapp_channels`.
2. Imports the session that was configured **before** channels existed
   (`configurations.WAHA_SESSION`, falling back to `default`) as the single, default channel. This is
   the only place a session name appears, and it reads the current value instead of inventing one.
3. Adds `whatsapp_outbound_messages.channel_id` + `waha_session`, `whatsapp_inbound_messages.channel_id`,
   `whatsapp_opt_outs.channel_id`.
4. Replaces the global unique key on `whatsapp_opt_outs.phone_e164` with `(channel_id, phone_e164)`.
5. Backfills every existing outbox / inbound / opt-out row onto that channel.
6. Foreign keys (`…018` in `999-add-all-foreign-keys.xml`).

Existing installs therefore behave exactly as before after the migration: same session, same rows,
same queue.

---

## 5. Ops step (not performed by the application)

WAHA currently has **no webhook registered on any session** (`config: {}`), so inbound replies reach
nothing. After a channel exists in the application, register the endpoint **per session** on the WAHA
host. The payload is generated by the app — copy it from *Settings → WhatsApp → Numbers → Webhook*
(`GET /whatsapp/channels/{id}/webhook-config`) — and looks like:

```http
PUT https://<waha-host>/api/sessions/<session>
X-Api-Key: <WAHA_API_KEY>

{
  "name": "<session>",
  "config": {
    "webhooks": [
      {
        "url": "<channel webhook url>",
        "events": ["<channel events>"],
        "hmac": { "key": "<channel webhook token>" }
      }
    ]
  }
}
```

Notes:

* `PUT /api/sessions/<session>` **replaces the whole session config and restarts that session only** —
  the phone stays paired, no QR scan is needed.
* Repeat for every session (one `PUT` per number).
* The URL and token come from that channel's row — never from code.
* No retry count is sent; WAHA applies its own default.

### Verify afterwards

1. `GET https://<waha-host>/api/sessions?all=true` → each session shows `config.webhooks[0].url` and
   `me.id`. Keep the `name → me.id` pairs from this call as the expected mapping.
2. Send one message per number from *WhatsApp → Compose* (each with its own "Send from" number), then
   `GET /api/{session}/chats` for **each** session on WAHA: the message appears in exactly one session
   and in the chat of the recipient.
3. Post a webhook payload per channel (see below) and check the app: `GET /whatsapp/messages` shows the
   channel on every row, and the Replies tab shows two separate threads for the same contact.
4. Post the same payload with `"session": "does-not-exist"` → `400 {"code":"UNKNOWN_SESSION"}` and no row
   is created. Disable a channel and repeat → `400 {"code":"CHANNEL_DISABLED"}`.

Minimal payload shape (values are examples, not configuration):

```json
{
  "event": "message",
  "session": "<session>",
  "payload": {
    "id": "<wa message id>",
    "timestamp": 1731000000,
    "from": "<remote digits>@c.us",
    "fromMe": false,
    "body": "hello"
  }
}
```

Send it with the channel's token: `X-Webhook-Token: <channel token>` (or `?token=`).

---

## 6. Why nothing is hardcoded

* WAHA paths, JSON field names and session states (`WORKING`, `SCAN_QR_CODE`, …) live in
  `com.mosque.crm.waha` only (`WahaClient.Path`, `WahaClient.Field`, `WahaSessionStatus`, `WahaEvent`).
* The `@c.us` jid syntax lives in `WahaChatId` only.
* Numbers, labels, sessions, webhook URLs, tokens and event lists are channel rows.
* Timeouts, caps, retry counts and the opt-out keyword list are settings.
* Session names appear only in migration 201 (reading the previous configuration) and in docs.
