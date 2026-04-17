# Document Management Module — Design Specification

## Overview

A Google Docs-inspired document management system for any organisation. Members and admins can upload files, write rich-text documents, organise content into folders, share with specific users or roles, and track version history — all secured behind the existing plan-entitlement and multi-tenancy infrastructure.

The module stores files in MinIO (existing `StorageService`), leverages the permission system, and follows every existing entity/Liquibase/API convention in the project.

---

## Goals

| Goal | In scope |
|---|:---:|
| File upload and storage (PDF, Word, Excel, images) | ✅ |
| Rich-text document creation and editing | ✅ |
| Folder / workspace organisation | ✅ |
| Granular sharing (per-user, per-role, org-wide) | ✅ |
| Access levels: View / Comment / Edit / Manage | ✅ |
| Version history with rollback | ✅ |
| Inline comments (threaded) | ✅ |
| Presigned URL downloads (no public bucket) | ✅ |
| Real-time collaborative editing | ❌ (out of scope) |
| Full-text search inside document content | ❌ (future) |
| Thumbnail generation | ❌ (future) |
| Record attachments (link documents to any entity) | ✅ |
| Trash / soft delete with 30-day retention | ✅ |
| Audit log (view, download, edit, share events) | ✅ |
| Document expiry dates with auto-archive | ✅ |
| Metadata search (title, uploader, date, type, expiry) | ✅ |
| Version retention policy (keep last N auto-saves) | ✅ |
| Admin storage & bandwidth dashboard (all orgs) | ✅ |

---

## Data Model

### Entity: `DocumentFolder`
**Table:** `org_document_folders`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `document_folders_seq` |
| `organization_id` | BIGINT NOT NULL | multi-tenancy FK → `organizations` |
| `name` | VARCHAR(255) NOT NULL | |
| `description` | VARCHAR(1000) | |
| `parent_folder_id` | BIGINT NULL | self-join → enables nested folders |
| `owner_user_id` | BIGINT NOT NULL | FK → `users` |
| `visibility` | VARCHAR(30) NOT NULL | `PRIVATE` \| `ORGANIZATION` |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Visibility:**
- `PRIVATE` — only the owner sees it
- `ORGANIZATION` — all org members see the folder (but document-level access still applies)

---

### Entity: `Document`
**Table:** `org_documents`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `documents_seq` |
| `organization_id` | BIGINT NOT NULL | multi-tenancy FK → `organizations` |
| `folder_id` | BIGINT NULL | FK → `org_document_folders`; NULL = root |
| `title` | VARCHAR(500) NOT NULL | |
| `description` | VARCHAR(2000) | |
| `document_type` | VARCHAR(30) NOT NULL | `UPLOADED_FILE` \| `RICH_TEXT` |
| `mime_type` | VARCHAR(200) | for `UPLOADED_FILE` only |
| `storage_key` | VARCHAR(1000) | MinIO object key (current version) |
| `content_html` | LONGTEXT | for `RICH_TEXT` only (current version snapshot) |
| `file_size` | BIGINT | bytes; 0 for rich-text |
| `original_filename` | VARCHAR(500) | original upload filename |
| `status` | VARCHAR(30) NOT NULL | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| `visibility` | VARCHAR(30) NOT NULL | `PRIVATE` \| `SHARED` \| `ORGANIZATION` |
| `owner_user_id` | BIGINT NOT NULL | FK → `users` |
| `version_count` | INT NOT NULL DEFAULT 1 | denormalised count |
| `expires_at` | DATETIME NULL | Optional expiry; NULL = never expires. Scheduler auto-sets status to `ARCHIVED` on this date |
| `expiry_notification_sent` | BOOLEAN NOT NULL DEFAULT false | True once the 30-day-before warning has been sent |
| `deleted_at` | DATETIME NULL | Soft delete timestamp; NULL = active |
| `deleted_by` | BIGINT NULL | FK → `users` |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |
| `created_by` | BIGINT | FK → `users` |

**Document Types:**
- `UPLOADED_FILE` — any binary file (PDF, DOCX, XLSX, PNG, etc.). Content lives in MinIO under `storage_key`.
- `RICH_TEXT` — HTML document created in the browser. Current content in `content_html`; MinIO stores version snapshots.

**Status transitions:**
```
DRAFT → PUBLISHED → ARCHIVED
          ↑               ↓ (unarchive)
     PUBLISHED  ←─────────
          ↓ (soft delete)
        TRASH  → (auto hard-delete after 30 days)
```

**Visibility:**
- `PRIVATE` — only the owner
- `SHARED` — explicitly shared via `DocumentShare` records
- `ORGANIZATION` — all org members get VIEW access; explicit shares can grant higher access

---

### Entity: `DocumentShare`
**Table:** `org_document_shares`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `document_shares_seq` |
| `document_id` | BIGINT NOT NULL | FK → `org_documents` |
| `share_type` | VARCHAR(30) NOT NULL | `USER` \| `ROLE` |
| `target_user_id` | BIGINT NULL | FK → `users`; set when `share_type = USER` |
| `target_role_id` | BIGINT NULL | FK → `roles`; set when `share_type = ROLE` |
| `access_level` | VARCHAR(30) NOT NULL | `VIEW` \| `COMMENT` \| `EDIT` \| `MANAGE` |
| `shared_by_user_id` | BIGINT NOT NULL | FK → `users` |
| `expires_at` | DATETIME NULL | optional expiry; NULL = permanent |
| `shared_at` | DATETIME | |

One document can have many share records. When a document is shared with a role, all users assigned that role inherit the share access level.

---

### Entity: `DocumentVersion`
**Table:** `org_document_versions`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `document_versions_seq` |
| `document_id` | BIGINT NOT NULL | FK → `org_documents` |
| `organization_id` | BIGINT NOT NULL | multi-tenancy |
| `version_number` | INT NOT NULL | 1, 2, 3 … |
| `storage_key` | VARCHAR(1000) | MinIO key for this version (uploaded files and rich-text snapshots) |
| `content_html` | LONGTEXT | rich-text content snapshot (redundant with MinIO; easier queries) |
| `file_size` | BIGINT | |
| `change_note` | VARCHAR(500) | optional description of change |
| `changed_by_user_id` | BIGINT NOT NULL | FK → `users` |
| `created_at` | DATETIME | |

Versions are **append-only**. Rolling back creates a new version (version N+1 with the old content).

---

### Entity: `DocumentComment`
**Table:** `org_document_comments`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `document_comments_seq` |
| `document_id` | BIGINT NOT NULL | FK → `org_documents` |
| `organization_id` | BIGINT NOT NULL | multi-tenancy |
| `content` | TEXT NOT NULL | |
| `author_user_id` | BIGINT NOT NULL | FK → `users` |
| `parent_comment_id` | BIGINT NULL | self-join for threaded replies |
| `resolved` | BOOLEAN NOT NULL DEFAULT false | |
| `resolved_by_user_id` | BIGINT NULL | FK → `users` |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

---

## Access Control Model

### Access Resolution (priority order)

```
1. Caller is document owner                           → MANAGE
2. Caller has org permission `document.manage`
   (admin-level)                                      → MANAGE
3. Caller has an active, non-expired DocumentShare
   (user-level or via a role assignment)              → share.accessLevel
4. Document visibility = ORGANIZATION
   AND caller is a member of this organisation         → VIEW
5. Otherwise                                          → DENIED (403)

> **Trashed documents** (`deleted_at IS NOT NULL`) are invisible to all access resolution except the owner and `document.manage` holders, who can see them in the trash view and restore or permanently delete them.
```

### Access Level Capabilities

| Capability | VIEW | COMMENT | EDIT | MANAGE |
|---|:---:|:---:|:---:|:---:|
| Download / read content | ✅ | ✅ | ✅ | ✅ |
| Add / reply to comments | ❌ | ✅ | ✅ | ✅ |
| Resolve comments | ❌ | ❌ | ✅ | ✅ |
| Edit title, description, content | ❌ | ❌ | ✅ | ✅ |
| Upload new version | ❌ | ❌ | ✅ | ✅ |
| Delete document | ❌ | ❌ | ❌ | ✅ |
| Share with others | ❌ | ❌ | ❌ | ✅ |
| Revoke shares | ❌ | ❌ | ❌ | ✅ |
| Move to folder | ❌ | ❌ | ❌ | ✅ |
| Archive / change status | ❌ | ❌ | ❌ | ✅ |
| Move to trash (soft delete) | ❌ | ❌ | ❌ | ✅ |
| Restore from trash | ❌ | ❌ | ❌ | ✅ |
| Permanent delete (from trash only) | ❌ | ❌ | ❌ | ✅ |

---

## MinIO Storage Strategy

### Object Key Convention

```
{organizationId}/documents/{documentId}/v{versionNumber}/{sanitised-filename}
```

Examples:
```
7/documents/42/v1/annual-report-2025.pdf
7/documents/42/v2/annual-report-2025.pdf
7/documents/88/v1/friday-khutba-notes.html   ← rich-text snapshot
```

### Rich-Text Versions in MinIO

When a user saves a rich-text document, the backend:
1. Stores `content_html` directly in the `org_documents` row (current state).
2. Writes the HTML as a `.html` blob to MinIO as the new version snapshot (for history).
3. Creates a `DocumentVersion` row pointing to the MinIO key.

This gives both fast current-state reads (DB column) and a reliable version archive.

### Download Flow (Presigned URLs)

The bucket is **private** — no public access. Downloads go through the API:

```
GET /documents/{id}/download           → 302 or 200 with presigned URL (15 min TTL)
GET /documents/{id}/versions/{v}/download
```

The backend:
1. Resolves caller access (must be ≥ VIEW).
2. Calls `storageService.generatePresignedUrl(storageKey, 15)`.
3. Returns `{ "url": "https://minio/.../...", "expiresAt": "..." }`.
4. Frontend redirects the browser to the URL.

### File Size Limits

Enforced in the controller layer before calling `StorageService.upload()`:
- Default: **50 MB** per file upload
- Configurable via tenant settings (`document.max_file_size_mb`)

---

## Permissions & Roles

### New Permission Records (IDs 71–74)

| ID | Code | Category | Description |
|---|---|---|---|
| 71 | `document.view` | `document` | Browse and read shared / org-visible documents |
| 72 | `document.manage` | `document` | Create, edit, delete, share any document (admin power) |
| 73 | `document.share` | `document` | Share own documents with other users/roles |
| 74 | `document.upload` | `document` | Upload files and create documents |

### Default Role Assignments

| Role | Permissions |
|---|---|
| ADMIN | `document.view`, `document.manage`, `document.share` |
| MEMBER | `document.view`, `document.share` |
| TREASURER | `document.view`, `document.share` |
| IMAM | `document.view`, `document.share` |

> **Note:** Every authenticated user can create documents (documents are personal by default). `document.manage` gives admin-level control over *all* org documents, not just their own.

---

## Subscription Enforcement

### Feature Key

Add to `FeatureKeys.java`:
```java
public static final String DOCUMENT_MANAGEMENT = "document.management";
```

Seed in plan entitlements:
- **Basic plan**: ❌ disabled
- **Standard plan**: ✅ enabled (limit: max 500 MB storage per org)
- **Premium plan**: ✅ enabled (limit: max 5 GB storage per org)

### Optional Storage Limit Key

`document.storage_mb` — numeric limit for total storage per organisation (MB). Checked in `DocumentService.uploadFile()`.

---

## Backend Structure

### Enums

```java
enum DocumentType    { UPLOADED_FILE, RICH_TEXT }
enum DocumentStatus  { DRAFT, PUBLISHED, ARCHIVED }
enum DocumentVisibility { PRIVATE, SHARED, ORGANIZATION }
enum ShareType       { USER, ROLE }
enum AccessLevel     { VIEW, COMMENT, EDIT, MANAGE }
```

### Entities

| Entity | Table | Sequence name |
|---|---|---|
| `DocumentFolder` | `org_document_folders` | `document_folders_seq` |
| `Document` | `org_documents` | `documents_seq` |
| `DocumentShare` | `org_document_shares` | `document_shares_seq` |
| `DocumentVersion` | `org_document_versions` | `document_versions_seq` |
| `DocumentComment` | `org_document_comments` | `document_comments_seq` |

`Document`, `DocumentFolder`, `DocumentVersion`, `DocumentComment` all implement `OrganizationAware` + `@EntityListeners(OrganizationEntityListener.class)` + `@Filter(name="organizationFilter")`.  
`DocumentShare` does **not** need `OrganizationAware` (it is always fetched via document FK, which is already tenant-scoped).

### DTOs

| DTO | Purpose |
|---|---|
| `DocumentFolderDTO` | Response for folder listings |
| `DocumentFolderCreateDTO` | Request to create/update folder |
| `DocumentDTO` | Full document metadata response (no content_html inline for list views) |
| `DocumentDetailDTO` | Document + content_html + currentUserAccessLevel |
| `DocumentUploadResponseDTO` | Response after upload (includes id, storageKey, presigned download URL) |
| `DocumentShareDTO` | Share record response |
| `DocumentShareCreateDTO` | Request to create a share |
| `DocumentVersionDTO` | Version list entry |
| `DocumentCommentDTO` | Comment with author name, replies |
| `DocumentCommentCreateDTO` | Request to add comment |
| `DownloadUrlDTO` | `{ url, expiresAt }` |

### Service: `DocumentService`

Key responsibilities:
- `createFolder()` / `updateFolder()` / `deleteFolder()`
- `uploadFile(folderId, file, metadata)` — validates size, uploads to MinIO, creates `Document` + `DocumentVersion`
- `createRichTextDocument(folderId, dto)` — creates `Document` with `documentType=RICH_TEXT`
- `getDocument(id)` — resolves caller access level, populates `currentUserAccessLevel` in response
- `updateDocument(id, dto)` — requires EDIT access
- `saveRichTextContent(id, html)` — auto-versions if content changed; requires EDIT access
- `deleteDocument(id)` — requires MANAGE; deletes MinIO objects + all child records
- `uploadNewVersion(id, file)` — requires EDIT access; increments `version_count`
- `rollbackToVersion(id, versionId)` — requires MANAGE; creates new version with old content
- `generateDownloadUrl(id)` — requires VIEW access; returns presigned URL
- `addShare(documentId, dto)` — requires MANAGE access
- `removeShare(shareId)` — requires MANAGE access
- `resolveAccess(documentId, userId)` — returns effective `AccessLevel` or throws 403
- `addComment(documentId, dto)` — requires COMMENT access
- `resolveComment(commentId)` — requires EDIT access

### Controller: `DocumentController`

`@RestController @RequestMapping("/documents") @CrossOrigin(origins="*")`

All endpoints listed in the API section below. No security annotations — handled centrally per project convention.

### Controller: `DocumentFolderController`

`@RequestMapping("/document-folders")`

---

## REST API

### Folders

```
GET    /document-folders                       List folders (filtered by visibility/parent)
POST   /document-folders                       Create folder
PUT    /document-folders/{id}                  Update folder
DELETE /document-folders/{id}                  Delete folder (must be empty)
GET    /document-folders/{id}/documents        List documents in a specific folder
```

### Documents

```
GET    /documents                              List documents (see Metadata Search section for filter params)
POST   /documents/upload                       Upload a file (multipart/form-data)
POST   /documents/rich-text                    Create rich-text document
GET    /documents/trash                        List trashed documents (MANAGE only)
GET    /documents/{id}                         Get document detail + currentUserAccessLevel
PUT    /documents/{id}                         Update metadata (title, description, status, visibility, expiresAt)
DELETE /documents/{id}                         Soft delete — moves to trash (requires MANAGE)
GET    /documents/{id}/download                Get presigned download URL
PUT    /documents/{id}/content                 Save rich-text content (auto-versions)
POST   /documents/{id}/move                    Move to a different folder
POST   /documents/{id}/restore                 Restore from trash (requires MANAGE)
DELETE /documents/{id}/permanent               Hard delete from trash, purges MinIO (requires MANAGE)
GET    /documents/{id}/audit                   Audit log for this document (MANAGE only)
```

### Audit

```
GET    /documents/audit                        All audit events for the org (admin only); supports date range + event type filters
```

### Versions

```
GET    /documents/{id}/versions                List all versions
POST   /documents/{id}/versions               Upload new file version
GET    /documents/{id}/versions/{v}/download  Get presigned URL for specific version
POST   /documents/{id}/versions/{v}/rollback  Roll back to this version (creates new version)
```

### Sharing

```
GET    /documents/{id}/shares                  List shares for this document
POST   /documents/{id}/shares                  Add a share (user or role)
DELETE /documents/{id}/shares/{shareId}        Revoke a share
```

### Comments

```
GET    /documents/{id}/comments                List comments (threaded)
POST   /documents/{id}/comments                Add comment or reply
PUT    /documents/{id}/comments/{cId}          Edit comment (own comment only)
DELETE /documents/{id}/comments/{cId}          Delete comment (own or MANAGE)
PUT    /documents/{id}/comments/{cId}/resolve  Resolve / unresolve a comment
```

### Record Attachments

These endpoints operate from the **document** side (all links for a document):

```
GET    /documents/{id}/links                          List all record links for this document
POST   /documents/{id}/links                          Create a link to a record
PUT    /documents/{id}/links/{linkId}                 Update access_level_override or note
DELETE /documents/{id}/links/{linkId}                 Remove a link
```

These endpoints operate from the **record** side (all attachments for a given entity):

```
GET    /record-attachments?entityType={type}&entityId={id}      List documents linked to this record
POST   /record-attachments                                      Link an existing document to a record
POST   /record-attachments/upload                              Upload a new file AND link it in one step
DELETE /record-attachments/{linkId}                             Unlink (does NOT delete the document)
```

#### `POST /record-attachments` — Link existing document

```json
{
  "documentId": 42,
  "entityType": "MEMBER",
  "entityId": 17,
  "accessLevelOverride": null,
  "note": "Annual membership form 2025"
}
```

`accessLevelOverride` is optional; omit or pass `null` to use inherited access.

#### `POST /record-attachments/upload` — Upload & attach in one step

`multipart/form-data` fields:

| Field | Type | Notes |
|---|---|---|
| `file` | Binary | The file to upload |
| `entityType` | String | e.g. `MEMBER` |
| `entityId` | Long | PK of the parent record |
| `title` | String (optional) | Defaults to original filename |
| `note` | String (optional) | Shown in the attachments panel |
| `accessLevelOverride` | String (optional) | `VIEW` \| `COMMENT` \| `EDIT` \| `MANAGE`; omit for inherited |

Backend behaviour (single transaction):
1. Validates `document.upload` permission and quota.
2. Uploads file to MinIO.
3. Creates `Document` with `visibility=PRIVATE`, `folderId=null`, owner = current user.
4. Creates `DocumentLink` connecting the new document to the specified record.
5. Returns combined `RecordAttachmentUploadResponseDTO` containing the new `Document` + `DocumentLink`.

The document is **also visible** in the main Documents module under the owner's private documents — nothing is orphaned.

---

## Liquibase DDL Files

| File | Creates |
|---|---|
| `150-create-org-document-folders-table.xml` | `org_document_folders` |
| `151-create-org-documents-table.xml` | `org_documents` |
| `152-create-org-document-shares-table.xml` | `org_document_shares` |
| `153-create-org-document-versions-table.xml` | `org_document_versions` |
| `154-create-org-document-comments-table.xml` | `org_document_comments` |
| `155-create-org-document-links-table.xml` | `org_document_links` (unique constraint on `document_id + entity_type + entity_id`) |
| `156-create-org-document-quotas-table.xml` | `org_document_quotas` |
| `157-create-org-document-audit-events-table.xml` | `org_document_audit_events` |

All foreign key constraints go into the existing `999-add-all-foreign-keys.xml` as changeset `b1000099-9990-0000-0000-000000000005-1`.

---

### Entity: `DocumentLink`
**Table:** `org_document_links`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `document_links_seq` |
| `document_id` | BIGINT NOT NULL | FK → `org_documents` |
| `organization_id` | BIGINT NOT NULL | multi-tenancy |
| `entity_type` | VARCHAR(50) NOT NULL | `MEMBER` \| `CONTRIBUTION` \| `EVENT` \| `FAMILY` \| `DISTRIBUTION_EVENT` \| `MEMBERSHIP` \| `GROUP` |
| `entity_id` | BIGINT NOT NULL | PK of the referenced record |
| `access_level_override` | VARCHAR(30) NULL | When NULL, access is **inherited** from the parent record's access; otherwise one of `VIEW` \| `COMMENT` \| `EDIT` \| `MANAGE` |
| `linked_by_user_id` | BIGINT NOT NULL | FK → `users` — who created the link |
| `note` | VARCHAR(500) NULL | Optional context note shown in the attachments panel |
| `linked_at` | DATETIME | |

**Unique constraint:** `(document_id, entity_type, entity_id)` — a document can only be linked once to the same record.

**Enum: `LinkedEntityType`**
```java
enum LinkedEntityType {
    MEMBER, CONTRIBUTION, EVENT, FAMILY,
    DISTRIBUTION_EVENT, MEMBERSHIP, GROUP
}
```
New entity types are added to this enum without any schema change.

#### Access Resolution for Record Attachments

When a user accesses a document via a record link (e.g. from the member's attachments panel), the effective access level is determined as follows:

```
1. User must be able to VIEW the parent record (standard record-level security).
2. If link.access_level_override IS NOT NULL → use that level.
3. If link.access_level_override IS NULL (inherit) →
   a. User has document.manage permission   → MANAGE
   b. User has an explicit DocumentShare     → share.accessLevel
   c. Document visibility = ORGANIZATION    → VIEW
   d. User is document owner                → MANAGE
   e. Otherwise                             → VIEW  ← inheritance floor:
      being able to see the record grants at least VIEW on its attachments.
```

Step 3e is the key behaviour: if a user can view a record (e.g. a member profile), they automatically get **VIEW** access to all documents linked to that record, even if those documents are otherwise `PRIVATE`. This is the "inherit" default. Setting an explicit override on the link raises or restricts that floor.

`DocumentLink` does **not** implement `OrganizationAware`; it is always fetched via its `document_id` FK which is already tenant-scoped.

---

## Frontend Architecture

### Pages

| Route | Description |
|---|---|
| `/documents` | Main page — folder tree (left) + document grid (right) |
| `/documents/new` | Create rich-text document |
| `/documents/upload` | Upload file(s) |
| `/documents/[id]` | Document viewer / editor |
| `/documents/[id]/edit` | Full-screen rich-text editor |

### TypeScript API Client

`frontend/lib/documentApi.ts`

Types: `DocumentFolder`, `Document`, `DocumentDetail`, `DocumentShare`, `DocumentShareCreate`, `DocumentVersion`, `DocumentComment`, `DocumentCommentCreate`, `DownloadUrlResponse`, `AccessLevel`, `DocumentLink`, `DocumentLinkCreate`, `RecordAttachment`.

All methods call `ApiClient.get/post/put/delete` with the standard auth headers.

### Document Viewer (`/documents/[id]`)

Tabs:
1. **Document** — display content (PDF embed via `<iframe>` or `<embed>` for PDFs, `<img>` for images, content-rendered HTML for rich text, fallback download button for other types)
2. **Comments** — threaded list with add/reply/resolve
3. **Versions** — list with diff summary and download link; rollback button for MANAGE access
4. **Sharing** — share management panel (only visible when access ≥ MANAGE)
5. **Linked Records** — list of all `DocumentLink` records for this document; each row shows entity type badge + a hyperlink to the record; MANAGE users can remove links or change the access override

### `RecordAttachmentsPanel` Component

A reusable component rendered inside any entity detail page (member profile, contribution detail, event detail, etc.):

```tsx
<RecordAttachmentsPanel entityType="MEMBER" entityId={member.id} />
```

The panel header contains **two action buttons** (hidden when user lacks `document.upload`):

```
[ ↑ Upload & Attach ]   [ Link Existing Document ]
```

**Upload & Attach flow:**
- Opens a lightweight modal: file picker, optional title field, optional note field, optional access override dropdown (default: Inherited).
- Client-side size check against `quota.maxFileSizeMb` before submitting.
- Calls `POST /record-attachments/upload` (multipart).
- On success: closes modal, appends new card to the list, shows success toast.
- On 413/507/429 error: shows specific toast (file too large / storage quota exceeded / bandwidth limit reached).

**Link Existing Document flow:**
- Opens a search modal with a debounced text input hitting `GET /documents?q=...`.
- Results show document title, type badge, owner, last modified.
- Selecting a document and clicking **Link** calls `POST /record-attachments`.
- On success: closes modal, appends card to list, shows success toast.

**Card list behaviour:**
- Renders a compact card per link: document icon, title, type badge (PDF / DOCX / Rich Text), linked-by username, date, access level badge.
- Each card has a context menu: **Open document**, **Change access override** (inline dropdown: Inherit / View / Comment / Edit / Manage), **Remove link** (with `ConfirmDialog` variant="danger").
- Access override changes call `PUT /documents/{id}/links/{linkId}`.
- Users without `document.upload` permission see the panel in read-only mode (no Upload or Link buttons; context menu shows **Open document** only).

### Rich-Text Editor (`/documents/[id]/edit` and `/documents/new`)

Use **Tiptap** (headless rich-text editor for React). It renders to clean HTML, works well with server-side persistence, and supports common formatting without a builder lock-in.

Editor features (phase 1):
- Bold, italic, underline, strikethrough
- Headings (H1–H3)
- Bullet / ordered lists
- Blockquote
- Code block
- Horizontal rule
- Undo / redo

Auto-save (debounced 3 seconds) with a "Saved" indicator. Manual "Save Version" button creates an explicit named version.

### Sidebar Entry

```ts
{
  name: 'Documents',
  href: '/documents',
  permission: 'document.view',
  entitlement: 'document.management',
  icon: <FolderOpen />
}
```

Placed in the **OPERATIONS** group alongside Reports and Events.

### i18n Keys

Top-level `"documents"` block with keys for: `title`, `subtitle`, CRUD labels, `tabs.*`, `access_levels.*`, `share_types.*`, `document_types.*`, `statuses.*`, visibility options, toast messages.

---

## Implementation Checklist

### Backend

- [ ] Add `DOCUMENT_MANAGEMENT = "document.management"` to `FeatureKeys.java`
- [ ] Create enums: `DocumentType`, `DocumentStatus`, `DocumentVisibility`, `ShareType`, `AccessLevel`, `LinkedEntityType`, `DocumentAuditEventType`
- [ ] Create entities: `DocumentFolder`, `Document`, `DocumentShare`, `DocumentVersion`, `DocumentComment`, `DocumentLink`, `DocumentAuditEvent`
- [ ] Create DTOs (including `DocumentLinkDTO`, `DocumentLinkCreateDTO`, `RecordAttachmentDTO`, `RecordAttachmentUploadResponseDTO`, `DocumentAuditEventDTO`)
- [ ] Create repositories (7: one per entity)
- [ ] Create `DocumentAccessResolver` component (centralises access resolution, trash visibility)
- [ ] Create `DocumentService` (upload, rich-text, CRUD, trash, restore, permanent delete, version retention)
- [ ] Create `AuditService.record(documentId, eventType, detail)` — called from `DocumentService`
- [ ] Create `QuotaService` (storage increment/decrement, bandwidth tracking, monthly reset)
- [ ] Create `DocumentController` + `DocumentFolderController` + `RecordAttachmentController`
- [ ] Add document expiry scheduler `DocumentExpiryScheduler` (daily 02:00 — archive expired docs, send 30-day warnings)
- [ ] Add trash purge scheduler `DocumentTrashPurgeScheduler` (daily 03:00 — hard-delete docs where `deleted_at` > 30 days)
- [ ] Add `document.version_retention` plan feature key
- [ ] Add `GET /documents/trash`, `POST /{id}/restore`, `DELETE /{id}/permanent` endpoints
- [ ] Add `GET /documents/{id}/audit` and `GET /documents/audit` endpoints
- [ ] Add `GET /admin/document-usage` and `GET /admin/document-usage/{orgId}` endpoints
- [ ] Create Liquibase DDL files 150–157 (see Liquibase table)
- [ ] Update `db.changelog-ddl.xml`
- [ ] Add FK changeset to `999-add-all-foreign-keys.xml`
- [ ] Add permissions 71–74 in `030-data-permissions.xml`
- [ ] Add role-permission mappings in `031-data-role-permissions.xml`
- [ ] Add `document.management` seeding in plan entitlements data

### Frontend

- [ ] Create `frontend/lib/documentApi.ts`
- [ ] Add Tiptap dependencies to `package.json`
- [ ] Create `/documents/page.tsx` (folder tree + grid)
- [ ] Create `/documents/new/page.tsx` (rich-text create)
- [ ] Create `/documents/upload/page.tsx` (file upload)
- [ ] Create `/documents/[id]/page.tsx` (viewer + tabs, including Linked Records tab)
- [ ] Create `/documents/[id]/edit/page.tsx` (full-screen editor)
- [ ] Create `components/RecordAttachmentsPanel.tsx` (dual-action: Upload & Attach + Link Existing)
- [ ] Add `RecordAttachmentsPanel` to member detail, contribution detail, event detail, family detail pages
- [ ] Update `Sidebar.tsx`
- [ ] Update `en.json` + `nl.json` (add `documents.linked_records.*` keys)
- [ ] Update `Header.tsx` breadcrumb mapping for `documents`

---

## Security Notes

- All MinIO objects are in a **private bucket**. No direct URL access — always via presigned URLs.
- Presigned URLs expire in **15 minutes**. Frontend must re-request on expiry.
- Rich-text HTML is sanitised on the backend using an allowlist (standard tags only) before persistence — prevents XSS via stored content.
- File upload validates `Content-Type` and file extension against a safe allowlist. Executable types (`.exe`, `.sh`, `.bat`, `.js`, `.php`, etc.) are rejected.
- Share expiry is enforced server-side; expired shares are ignored in `resolveAccess()`.
- Super-admin bypass applies: `TenantContext.getCurrentOrganizationId() == null` → full access (standard project behaviour).

---

## Role-Based Upload Permissions

The `document.upload` permission (ID 70, category `document`, description "Upload files and create documents") is a **separate, assignable permission** distinct from `document.view`. This allows admins to grant read-only access org-wide while restricting who can actually add content.

### Permission Table (revised)

| ID | Code | Category | Description |
|---|---|---|---|
| 67 | `document.view` | `document` | Browse and read shared / org-visible documents |
| 68 | `document.manage` | `document` | Create, edit, delete, share any document (admin power) |
| 69 | `document.share` | `document` | Share own documents with other users/roles |
| 70 | `document.upload` | `document` | Upload files and create new documents |

### Default Role Assignments (revised)

| Role | Permissions |
|---|---|
| ADMIN | `document.view`, `document.manage`, `document.share`, `document.upload` |
| IMAM | `document.view`, `document.share`, `document.upload` |
| TREASURER | `document.view`, `document.share`, `document.upload` |
| MEMBER | `document.view` |

> **Rationale:** Regular members can read organisation documents but cannot upload by default. The admin can grant `document.upload` to specific members or custom roles from the Roles & Permissions UI.

### Enforcement in `DocumentService`

```java
// Before any upload operation
permissionService.assertHasPermission(currentUserId, "document.upload");
```

This check runs before the size and quota checks so the error message is role-permission-related, not quota-related, when the user simply lacks the right.

---

## Storage Quota System

### Quota Tracking

Two denormalised counters are maintained to avoid expensive aggregate queries:

**On `org_document_quotas` table** (one row per organisation, created on first document upload):

| Column | Type | Notes |
|---|---|---|
| `organization_id` | BIGINT PK | FK → `organizations` |
| `storage_used_bytes` | BIGINT NOT NULL DEFAULT 0 | Running total; updated on every upload and delete |
| `bandwidth_used_bytes_this_month` | BIGINT NOT NULL DEFAULT 0 | Rolling monthly download counter |
| `bandwidth_month` | VARCHAR(7) NOT NULL | e.g. `2026-04`; when month changes, counter resets to 0 |
| `extra_storage_mb` | INT NOT NULL DEFAULT 0 | Paid add-on storage in MB (managed by billing/admin) |
| `extra_bandwidth_mb` | INT NOT NULL DEFAULT 0 | Paid add-on monthly bandwidth in MB |

Both counters are updated atomically with `UPDATE … SET col = col + ?` to avoid race conditions.

The `bandwidth_month` column is checked on every download request. If the stored month ≠ current calendar month, the counter is reset to 0 and the month updated before the check proceeds.

### Plan-Level Limits

Three feature keys govern quota:

| Feature Key | Type | Description |
|---|---|---|
| `document.storage_mb` | Numeric limit | Base storage quota in MB included in the plan |
| `document.max_file_mb` | Numeric limit | Max size of a single uploaded file in MB |
| `document.monthly_bandwidth_mb` | Numeric limit | Max download bandwidth per calendar month in MB |

Default plan values:

| Plan | `document.storage_mb` | `document.max_file_mb` | `document.monthly_bandwidth_mb` |
|---|---|---|---|
| Basic | 0 (feature disabled) | — | — |
| Standard | 256 | 10 | 2048 (2 GB/month) |
| Premium | 2048 | 10 | 20480 (20 GB/month) |

> **Max file size is capped at 10 MB** for all plans. The system hard cap in `application.properties` is also set to 10 MB. Larger files must be split by the user before upload.

### Paid Storage & Bandwidth Add-ons

Organisations can purchase additional storage or bandwidth in blocks. The billing system (or an admin action) writes to `org_document_quotas.extra_storage_mb` / `extra_bandwidth_mb`. The effective limit is always:

```
effective_storage_limit  = plan_storage_mb  + extra_storage_mb
effective_bandwidth_limit = plan_bandwidth_mb + extra_bandwidth_mb
```

Add-on blocks (example pricing — configured in the billing module):

| Block | Storage | Monthly cost |
|---|---|---|
| Storage S | +256 MB | €2/month |
| Storage M | +1024 MB | €6/month |
| Storage L | +5120 MB | €20/month |

| Block | Bandwidth | Monthly cost |
|---|---|---|
| Bandwidth S | +5 GB/month | €3/month |
| Bandwidth M | +20 GB/month | €8/month |

Add-on management endpoint (admin only):
```
PUT /admin/organizations/{orgId}/document-quota
  { "extraStorageMb": 1024, "extraBandwidthMb": 5120 }
```

### Quota Check Flow (upload path)

```
1. assertHasPermission(userId, "document.upload")
2. assertFeatureEnabled(orgId, "document.management")
3. maxFileMb = min(getFeatureLimit(orgId, "document.max_file_mb"), systemMaxFileMb)  // both ≤ 10
   if file.size > maxFileMb * 1_048_576 → throw DocumentFileSizeExceededException
4. effectiveStorageMb = getFeatureLimit(orgId, "document.storage_mb") + quota.extraStorageMb
   if quota.storageUsedBytes + file.size > effectiveStorageMb * 1_048_576
       → throw DocumentStorageQuotaExceededException
5. proceed with MinIO upload
6. UPDATE storage_used_bytes += file.size
```

On **delete**, `storage_used_bytes` is decremented by the sum of all version file sizes.

### Bandwidth Check Flow (download path)

Bandwidth is tracked when a presigned download URL is generated (optimistic accounting — the file size is recorded as consumed even if the user abandons the download; this is intentionally conservative to protect server resources).

```
1. assertAccess(documentId, userId) ≥ VIEW
2. quotaRow = getOrCreateQuotaRow(orgId)
3. if quotaRow.bandwidthMonth ≠ currentYearMonth:
       reset bandwidthUsedBytesThisMonth = 0, bandwidthMonth = currentYearMonth
4. effectiveBandwidthMb = getFeatureLimit(orgId, "document.monthly_bandwidth_mb") + quota.extraBandwidthMb
   if quotaRow.bandwidthUsedBytesThisMonth + document.fileSize > effectiveBandwidthMb * 1_048_576
       → throw DocumentBandwidthExceededException
5. UPDATE bandwidth_used_bytes_this_month += document.fileSize
6. generate and return presigned URL (15 min TTL)
```

> Rich-text documents (`RICH_TEXT`) have `fileSize = 0` and do not consume bandwidth — the content is served directly from the DB column, not MinIO.

### Quota API Endpoint

```
GET /documents/quota
```

Response:
```json
{
  "storageUsedBytes": 134217728,
  "storageUsedMb": 128,
  "storageLimitMb": 512,
  "storagePercentUsed": 25.0,
  "storageExtraMb": 256,
  "bandwidthUsedBytesThisMonth": 52428800,
  "bandwidthUsedMbThisMonth": 50,
  "bandwidthLimitMb": 2048,
  "bandwidthPercentUsed": 2.4,
  "bandwidthExtraMb": 0,
  "bandwidthResetDate": "2026-05-01",
  "maxFileSizeMb": 10
}
```

The frontend displays **two progress bars** on the `/documents` page: one for storage, one for monthly bandwidth. Each shows used/limit and a "Buy more" link when usage exceeds 80%.

### New Exceptions

| Exception | HTTP Status | Message |
|---|---|---|
| `DocumentFileSizeExceededException` | 413 | "File exceeds the maximum allowed size of {n} MB" |
| `DocumentStorageQuotaExceededException` | 507 | "Organisation storage quota of {n} MB has been reached. Upgrade your plan or purchase add-on storage." |
| `DocumentBandwidthExceededException` | 429 | "Monthly download bandwidth limit of {n} MB has been reached. Resets on {date} or purchase add-on bandwidth." |

---

## Document Size Limits

### Hierarchical Limit Resolution

Size limits are resolved in this order (most specific wins):

```
1. Folder-level override  (org admin can set a lower cap per folder)
2. Plan-level limit       (document.max_file_mb feature key)
3. System hard cap        (application.properties: document.system-max-file-mb, default 10)
```

### Folder-Level Overrides

`org_document_folders` gets two optional columns:

| Column | Type | Default | Notes |
|---|---|---|---|
| `max_file_size_mb` | INT NULL | NULL | NULL = use plan limit |
| `allowed_mime_types` | VARCHAR(1000) NULL | NULL | comma-separated allowlist; NULL = global allowlist applies |

**Example:** A "Financial Records" folder can be restricted to `application/pdf,application/vnd.ms-excel` only — other file types are rejected at upload regardless of the global allowlist.

### System-Level Allowlist (application.properties)

```properties
document.system-max-file-mb=10
document.allowed-extensions=pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,jpg,jpeg,png,gif,webp,mp4,mp3,zip
```

Executable types are **always blocked** regardless of any configuration or plan:
`.exe`, `.sh`, `.bat`, `.cmd`, `.ps1`, `.vbs`, `.js`, `.php`, `.py`, `.rb`, `.jar`, `.war`, `.msi`, `.dmg`

### Size Validation in `DocumentService`

```java
private void validateFileSize(MultipartFile file, Long folderId) {
    long systemMax = systemMaxFileSizeMb * 1_048_576L;
    long planMax   = getPlanFileSizeLimit(orgId);           // document.max_file_mb
    long folderMax = getFolderFileSizeLimit(folderId);       // folder override or planMax

    long effective = Math.min(systemMax, Math.min(planMax, folderMax));

    if (file.getSize() > effective) {
        throw new DocumentFileSizeExceededException(effective / 1_048_576L);
    }
}
```

### Frontend Upload UX

- The upload form fetches `/documents/quota` on mount to display available space.
- File picker is pre-filtered with `accept=".pdf,.doc,.docx,..."` matching the allowed extension list.
- Client-side size check against `quota.maxFileSizeMb` gives an immediate error before the round trip.
- A progress bar shows upload progress via `XMLHttpRequest` (or `fetch` with `ReadableStream`).
- Error responses from `DocumentFileSizeExceededException` (413) and `DocumentStorageQuotaExceededException` (507) map to specific user-facing toast messages.

### Additional Checklist Items

> These items extend the main checklist above with quota, size, and infrastructure specifics.

#### Backend
- [ ] Add `document.storage_mb`, `document.max_file_mb`, `document.monthly_bandwidth_mb`, `document.version_retention` plan feature keys
- [ ] Add `max_file_size_mb` and `allowed_mime_types` columns to `org_document_folders` DDL (file 133)
- [ ] Create `DocumentFileSizeExceededException`, `DocumentStorageQuotaExceededException`, `DocumentBandwidthExceededException`
- [ ] Implement `validateFileSize()` in `DocumentService`
- [ ] Add `GET /documents/quota` endpoint to `DocumentController`
- [ ] Add `PUT /admin/organizations/{orgId}/document-quota` endpoint (admin add-on management)
- [ ] Add `document.system-max-file-mb=10` and `document.allowed-extensions` to `application.properties`

#### Frontend
- [ ] Add storage quota progress bar to `/documents` page
- [ ] Add monthly bandwidth progress bar to `/documents` page (reset date + "Buy more" link at >80%)
- [ ] Add expiry warning badges (amber ≤30 days, red = expired) to document cards and viewer
- [ ] Add expiry date picker to document create/edit forms
- [ ] Add Trash page (`/documents/trash`) with restore and permanent-delete actions
- [ ] Add Audit Log tab to document viewer (MANAGE access only)
- [ ] Add `/admin/document-usage` page (super-admin) with sortable org table and add-on management modal
- [ ] Add client-side file size check in upload form (max 10 MB)
- [ ] Handle 413, 507, and 429 error responses with specific toast messages
- [ ] Map `allowed_mime_types` from folder metadata to the file picker `accept` attribute

---

## Trash / Soft Delete

Deleting a document via `DELETE /documents/{id}` sets `deleted_at = NOW()` and `deleted_by = currentUserId`. The document is immediately hidden from all normal listings. Storage quota is **not** decremented until permanent deletion.

- **Restore**: `POST /documents/{id}/restore` clears `deleted_at` / `deleted_by`.
- **Permanent delete**: `DELETE /documents/{id}/permanent` — only allowed when `deleted_at IS NOT NULL`. Purges all MinIO objects for all versions, decrements storage counter, then hard-deletes all child records (versions, comments, shares, links, audit events) and the document row.
- **Automatic purge**: Scheduled job runs nightly at 03:00. Permanently deletes documents where `deleted_at < NOW() - INTERVAL 30 DAY`.
- **Trash view**: `GET /documents/trash` — accessible to `document.manage` holders only, sorted by `deleted_at DESC`.

---

## Audit Log

### Entity: `DocumentAuditEvent`
**Table:** `org_document_audit_events`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `document_audit_events_seq` |
| `document_id` | BIGINT NOT NULL | FK → `org_documents` |
| `organization_id` | BIGINT NOT NULL | for scoped queries |
| `event_type` | VARCHAR(50) NOT NULL | See event types below |
| `actor_user_id` | BIGINT NOT NULL | FK → `users` |
| `detail` | VARCHAR(1000) NULL | Human-readable context (e.g. "Shared with role MANAGER") |
| `ip_address` | VARCHAR(45) NULL | IPv4 or IPv6 of the request |
| `created_at` | DATETIME | |

**Event types:** `CREATED`, `VIEWED`, `DOWNLOADED`, `EDITED`, `CONTENT_SAVED`, `VERSION_UPLOADED`, `VERSION_ROLLED_BACK`, `SHARED`, `SHARE_REVOKED`, `MOVED`, `STATUS_CHANGED`, `TRASHED`, `RESTORED`, `PERMANENTLY_DELETED`, `LINKED`, `UNLINKED`, `EXPIRY_SET`, `EXPIRED`.

`DocumentAuditEvent` is **append-only** and is never filtered by the org multi-tenancy filter. Events are written inside the same transaction as the triggering operation via `AuditService.record()` in `DocumentService`.

---

## Document Expiry

Any document can have an optional `expires_at` timestamp. When set:

1. **30 days before expiry**: scheduler sends a notification to the document owner. `expiry_notification_sent` is set `true` to prevent duplicate sends.
2. **On expiry date**: scheduler sets `status = ARCHIVED`. The document remains accessible to anyone with existing access — it is not deleted, just archived.
3. **UI indicators**:
   - Documents expiring within 30 days show an amber warning badge in listings and the viewer.
   - Expired/archived documents show a red "Expired" badge.
   - `GET /documents?expiringBefore={date}` lets admins build an expiry dashboard.

**Use cases:** insurance certificates, contracts, committee mandates, event permits, signed agreements — anything with a real-world expiry date.

Scheduler runs daily at 02:00 (`@Scheduled(cron="0 0 2 * * *")`).

---

## Metadata Search

`GET /documents` accepts the following query parameters (all optional, combined with AND):

| Parameter | Type | Description |
|---|---|---|
| `q` | String | Title contains (case-insensitive) |
| `folderId` | Long | Filter by folder; omit for all folders |
| `type` | String | `UPLOADED_FILE` \| `RICH_TEXT` |
| `status` | String | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| `ownerId` | Long | Filter by owner user |
| `createdAfter` | ISO date | Created on or after |
| `createdBefore` | ISO date | Created on or before |
| `expiringBefore` | ISO date | `expires_at` is non-null and ≤ this date |
| `mimeType` | String | e.g. `application/pdf` |
| `page` / `size` | Int | Pagination (default size: 20) |
| `sort` | String | e.g. `updatedAt,desc` |

Trashed documents are excluded unless the caller uses `GET /documents/trash`.

---

## Version Retention Policy

To prevent unbounded storage growth from rich-text auto-save, a configurable retention limit applies to **auto-generated versions** (versions with no `change_note`).

| Feature Key | Type | Default | Description |
|---|---|---|---|
| `document.version_retention` | Numeric | 10 | Max auto-save versions to keep per document |

**Enforcement** — after each auto-save in `DocumentService.saveRichTextContent()`:
1. Count auto-save versions for this document (`change_note IS NULL`).
2. If count > limit: delete the oldest excess auto-save versions.
3. For each purged version: delete the MinIO object, decrement org storage counter, delete the `DocumentVersion` row.

Manual versions (`change_note IS NOT NULL`) are **never** automatically purged — they are treated as named checkpoints and retained indefinitely.

---

## Admin Storage & Bandwidth Dashboard

### Purpose

A super-admin view (outside any org tenant context) showing storage and bandwidth usage across **all organisations**. Lets the platform operator monitor disk consumption, spot orgs approaching limits, and grant add-on storage/bandwidth.

### Endpoints

```
GET  /admin/document-usage               Summary for all orgs (paginated, sortable)
GET  /admin/document-usage/{orgId}       Detailed breakdown for one org
PUT  /admin/organizations/{orgId}/document-quota   Update extra_storage_mb / extra_bandwidth_mb
```

`GET /admin/document-usage` response row:

```json
{
  "organizationId": 7,
  "organizationName": "Acme Corp",
  "documentCount": 142,
  "storageUsedMb": 384,
  "storageLimitMb": 512,
  "storagePercentUsed": 75.0,
  "extraStorageMb": 256,
  "bandwidthUsedMbThisMonth": 1800,
  "bandwidthLimitMb": 2048,
  "bandwidthPercentUsed": 87.9,
  "extraBandwidthMb": 0,
  "trashedDocumentCount": 3,
  "pendingPurgeBytes": 2097152
}
```

### Frontend Page — `/admin/document-usage`

- Sortable table: one row per org, sortable by storage %, bandwidth %, document count.
- Rows > 80% usage: amber highlight. Rows > 95%: red highlight.
- **Manage add-ons** button per row opens a modal to update extra quotas.
- **Platform totals** card at the top: total storage across all orgs, total documents, total bandwidth this month.
- Accessible to super-admin role only.

---

## Open Questions / Future Scope

| Topic | Decision / Deferral |
|---|---|
| **Full-text search** | Deferred. Would require PostgreSQL `tsvector` or Elasticsearch integration. |
| **Email notifications on share** | Deferred. Can use existing message/email infrastructure when built. |
| **Public sharing links** | Deferred. Requires a separate signed-token endpoint outside JWT auth. |
| **Document templates** | Deferred. Could be org-level documents with `TEMPLATE` status. |
| **Bulk operations** | Deferred (bulk move, bulk delete, bulk share). |
| **Mobile app support** | Standard REST API is mobile-compatible. No extra work needed. |
| **Per-user quota** | Deferred. Current model is per-organisation. Per-user tracking is a future enhancement. |
| **Bandwidth for rich-text** | Rich-text served from DB does not consume bandwidth quota. If this becomes a load concern, a CDN cache layer is a future option. |
| **Storage add-on billing automation** | Current design requires manual admin action. Self-service purchase flow (Stripe/Mollie) is a future billing module concern. |
| **Bulk link / unlink** | Deferred. Link one document to many records in one call. |
| **Attachment notifications** | Deferred. Notify record owner when a document is linked to their record. |
| **Audit log retention** | Deferred. Currently audit events are kept indefinitely. A configurable retention period with archiving is a future compliance feature. |
