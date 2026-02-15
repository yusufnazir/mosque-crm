# Liquibase Data Management Pattern

## Overview

This project uses **two distinct Liquibase patterns**:

1. **DDL (Schema)** - Standard Liquibase XML for CREATE TABLE, ALTER TABLE, etc.
2. **DML (Data)** - Custom Java task changes that enable INSERT/UPDATE with UPSERT logic

Both use **UUID-based changeset IDs** for consistency and to enable updates.

---

## Folder Organization Rule

**CRITICAL:** Each folder (ddl, dml) MUST have its own consolidation changelog file that includes all files in that folder.

### Structure
```
db/changelog/
├── db.changelog-master.xml           (master file - references folder changelogs)
└── changes/
    ├── ddl/
    │   ├── db.changelog-ddl.xml      (consolidates all DDL files)
    │   ├── 001-create-members-table.xml
    │   ├── 002-create-fees-table.xml
    │   ├── ...
    │   └── 999-add-all-foreign-keys.xml  (ALL FK constraints, loaded last)
    └── dml/
        ├── db.changelog-dml.xml      (consolidates all DML files)
        ├── 020-data-roles.xml
        ├── 021-data-users.xml
        └── ...
```

### Master Changelog Pattern
The `db.changelog-master.xml` should ONLY reference the folder consolidation files:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <!-- DDL Changes (Schema) -->
    <include file="db/changelog/changes/ddl/db.changelog-ddl.xml"/>

    <!-- DML Changes (Data) -->
    <include file="db/changelog/changes/dml/db.changelog-dml.xml"/>

</databaseChangeLog>
```

### Folder Consolidation Files
Each folder's `db.changelog-xxx.xml` includes all individual changesets in that folder:

**Example: `db.changelog-ddl.xml`**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <!-- Member Tables -->
    <include file="db/changelog/changes/ddl/001-create-members-table.xml"/>
    <include file="db/changelog/changes/ddl/002-create-membership-fees-table.xml"/>
    
    <!-- Security Tables -->
    <include file="db/changelog/changes/ddl/010-create-users-table.xml"/>
    <include file="db/changelog/changes/ddl/011-create-roles-table.xml"/>

    <!-- Foreign Key Constraints (loaded LAST, after all tables exist) -->
    <include file="db/changelog/changes/ddl/999-add-all-foreign-keys.xml"/>
    
</databaseChangeLog>
```

**Example: `db.changelog-dml.xml`**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <!-- Security Data -->
    <include file="db/changelog/changes/dml/020-data-roles.xml"/>
    <include file="db/changelog/changes/dml/021-data-users.xml"/>
    
</databaseChangeLog>
```

### Benefits
- **Cleaner master file**: Only 2 includes instead of dozens
- **Better organization**: Clear separation between schema and data
- **Easier maintenance**: Add new files only to folder consolidation file
- **Logical grouping**: Can group related changesets with comments in folder file

---

## Part 1: DDL - Creating Tables (Schema Changes)

### Purpose
Define database schema: tables, columns, constraints, indexes, foreign keys.

### Location
`src/main/resources/db/changelog/changes/ddl/`

### Pattern

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="UUID-GOES-HERE" author="mosque-crm">
        <!-- Optional: Check if table already exists -->
        <preConditions onFail="MARK_RAN">
            <not>
                <tableExists tableName="table_name"/>
            </not>
        </preConditions>
        
        <createTable tableName="table_name">
            <!-- Primary Key (Auto-increment) -->
            <column name="id" type="BIGINT" autoIncrement="true">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            
            <!-- Required Fields -->
            <column name="name" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            
            <!-- Unique Fields -->
            <column name="email" type="VARCHAR(255)">
                <constraints unique="true"/>
            </column>
            
            <!-- Optional Fields -->
            <column name="phone" type="VARCHAR(20)"/>
            
            <!-- Foreign Key Columns (FK constraints defined in 999-add-all-foreign-keys.xml) -->
            <column name="user_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            
            <!-- Enum/Status Fields -->
            <column name="status" type="VARCHAR(20)">
                <constraints nullable="false"/>
            </column>
            
            <!-- Boolean with Default -->
            <column name="is_active" type="BOOLEAN" defaultValueBoolean="true">
                <constraints nullable="false"/>
            </column>
            
            <!-- Timestamps -->
            <column name="created_at" type="TIMESTAMP" 
                    defaultValueComputed="CURRENT_TIMESTAMP">
                <constraints nullable="false"/>
            </column>
            <column name="updated_at" type="TIMESTAMP" 
                    defaultValueComputed="CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP">
                <constraints nullable="false"/>
            </column>
        </createTable>
        
        <!-- Indexes for performance (add after table creation) -->
        <createIndex tableName="table_name" indexName="idx_tablename_email">
            <column name="email"/>
        </createIndex>
    </changeSet>

</databaseChangeLog>
```

### DDL Key Elements

| Element | Purpose | Example |
|---------|---------|---------|
| `<preConditions>` | Check before running | Skip if table exists |
| `<createTable>` | Define table structure | Table with columns |
| `<column>` | Define column | name, type, constraints |
| `<constraints>` | Column rules | primaryKey, nullable, unique, foreignKey |
| `type="BIGINT"` | Integer column | For IDs and numbers |
| `type="VARCHAR(n)"` | String column | For text with max length |
| `type="DATE"` | Date only | YYYY-MM-DD |
| `type="TIMESTAMP"` | Date + time | Full timestamp |
| `type="BOOLEAN"` | True/false | For flags |
| `defaultValueBoolean` | Boolean default | `true` or `false` |
| `defaultValueComputed` | SQL expression | `CURRENT_TIMESTAMP` |
| `autoIncrement` | Auto-incrementing ID | For primary keys |
| `onDelete="CASCADE"` | FK delete rule | Delete child records too |
| `<createIndex>` | Add index | For query performance |

### Real Example: Creating Members Table

File: `001-create-members-table.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="a7f3b8d4-2e1c-4a5d-9f6b-8c2d3e4a5b6c" author="mosque-crm">
        <preConditions onFail="MARK_RAN">
            <not>
                <tableExists tableName="members"/>
            </not>
        </preConditions>
        
        <createTable tableName="members">
            <column name="id" type="BIGINT" autoIncrement="true">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="email" type="VARCHAR(255)">
                <constraints unique="true"/>
            </column>
            <column name="phone" type="VARCHAR(20)"/>
            <column name="membership_status" type="VARCHAR(20)">
                <constraints nullable="false"/>
            </column>
            <column name="member_since" type="DATE"/>
            <column name="created_at" type="TIMESTAMP" 
                    defaultValueComputed="CURRENT_TIMESTAMP"/>
            <column name="updated_at" type="TIMESTAMP" 
                    defaultValueComputed="CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"/>
        </createTable>
    </changeSet>

</databaseChangeLog>
```

### DDL Rules

✅ **DO:**
- Use UUID for changeset ID (consistency across all changesets)
- Add `<preConditions>` with `onFail="MARK_RAN"` to skip if table exists
- Define all constraints inline with columns (except foreign keys — see below)
- Use appropriate data types (BIGINT for IDs, VARCHAR for text, etc.)
- Add non-FK indexes in the table file (e.g., `idx_donation_date`, `idx_resettoken_token`)
- Include `created_at` and `updated_at` timestamps
- Set `nullable="false"` for required fields
- Keep unique constraints (`addUniqueConstraint`) in the table file

❌ **DON'T:**
- Don't change DDL changesets after deployment to production
- Don't use sequential IDs like "001", "002" (use UUIDs)
- Don't forget `autoIncrement="true"` on primary key IDs
- Don't create tables without preconditions (causes errors on re-run)
- **Don't add `addForeignKeyConstraint` in individual table files** — see Foreign Key Separation below

### Foreign Key Separation Convention

**CRITICAL:** All `addForeignKeyConstraint` operations MUST be placed in the dedicated file `999-add-all-foreign-keys.xml`, NOT in individual table files.

#### Principle
Table files define **structure** (columns, types, unique constraints, non-FK indexes). Referential integrity (foreign keys) is defined **centrally** in `999-add-all-foreign-keys.xml`, which is loaded **last** in `db.changelog-ddl.xml` — after all tables have been created.

#### Benefits
- **No ordering dependencies**: Tables can be created in any order since FK constraints are applied afterwards
- **Easier maintenance**: All referential integrity rules in one place
- **Cleaner table files**: Focus purely on table structure
- **Simpler debugging**: FK issues isolated to a single file

#### What goes WHERE

| Element | Location | Example |
|---------|----------|---------|
| `createTable` | Table file (e.g., `010-create-users-table.xml`) | Table structure |
| `addColumn` | Original table file (new changeset) | Adding columns later |
| `addUniqueConstraint` | Table file | `uk_user_role`, `uk_person_individual` |
| Non-FK `createIndex` | Table file | `idx_donation_date`, `idx_resettoken_token` |
| `addForeignKeyConstraint` | **`999-add-all-foreign-keys.xml`** | All FK constraints |
| FK-related `createIndex` | **`999-add-all-foreign-keys.xml`** | `idx_userprefs_user`, `idx_membership_person` |

#### FK Changeset Pattern
Each FK in `999-add-all-foreign-keys.xml` uses this pattern:
```xml
<changeSet id="UUID-GOES-HERE" author="mosque-crm">
    <preConditions onFail="MARK_RAN">
        <not>
            <foreignKeyConstraintExists foreignKeyName="fk_tablename_referencedtable"/>
        </not>
    </preConditions>
    <addForeignKeyConstraint baseTableName="table_name" baseColumnNames="column_name"
                             constraintName="fk_tablename_referencedtable"
                             referencedTableName="referenced_table" referencedColumnNames="id"/>
    <!-- Optional: index on FK column for query performance -->
    <createIndex tableName="table_name" indexName="idx_tablename_column">
        <column name="column_name"/>
    </createIndex>
</changeSet>
```

#### Organization within 999
Group FK constraints by domain with XML comments:
```xml
<!-- ========== Security Domain ========== -->
<!-- fk_userprefs_user, fk_resettoken_user, fk_userrole_user, ... -->

<!-- ========== CRM / Person Domain ========== -->
<!-- fk_membership_fees_person, fk_membership_person, ... -->

<!-- ========== GEDCOM Domain ========== -->
<!-- fk_notelink_note, ... -->

<!-- ========== Multi-Mosque Domain ========== -->
<!-- fk_user_mosque, fk_person_mosque, ... -->
```

### Common DDL Operations

#### Add Column
```xml
<changeSet id="550e8400-e29b-41d4-a716-446655440000" author="dev">
    <addColumn tableName="members">
        <column name="middle_name" type="VARCHAR(100)"/>
    </addColumn>
</changeSet>
```

#### Modify Column Type
```xml
<changeSet id="550e8400-e29b-41d4-a716-446655440001" author="dev">
    <modifyDataType tableName="members" 
                     columnName="phone" 
                     newDataType="VARCHAR(30)"/>
</changeSet>
```

#### Add Foreign Key Constraint
```xml
<changeSet id="550e8400-e29b-41d4-a716-446655440002" author="dev">
    <addForeignKeyConstraint 
        baseTableName="user_member_link"
        baseColumnNames="user_id"
        constraintName="fk_link_user"
        referencedTableName="users"
        referencedColumnNames="id"
        onDelete="CASCADE"/>
</changeSet>
```

#### Add Index
```xml
<changeSet id="550e8400-e29b-41d4-a716-446655440003" author="dev">
    <createIndex tableName="members" indexName="idx_members_email">
        <column name="email"/>
    </createIndex>
</changeSet>
```

#### Drop Column (Use with Caution!)
```xml
<changeSet id="550e8400-e29b-41d4-a716-446655440004" author="dev">
    <dropColumn tableName="members" columnName="old_field"/>
</changeSet>
```

#### Rename Column
```xml
<changeSet id="550e8400-e29b-41d4-a716-446655440005" author="dev">
    <renameColumn tableName="members"
                  oldColumnName="first_name"
                  newColumnName="given_name"
                  columnDataType="VARCHAR(255)"/>
</changeSet>
```

### Data Type Reference

| Java Type | Database Type | Example Values |
|-----------|--------------|----------------|
| Long | BIGINT | 1, 1000, 999999 |
| String | VARCHAR(n) | "text", "email@example.com" |
| String (long) | TEXT | Long text content |
| Boolean | BOOLEAN | true, false |
| LocalDate | DATE | 2024-01-15 |
| LocalDateTime | TIMESTAMP | 2024-01-15 10:30:00 |
| byte[] | BLOB | Binary data |
| enum | VARCHAR(50) | "ACTIVE", "INACTIVE" |

---

## Part 2: DML - Managing Data (Custom Java Pattern)

### Purpose
Insert and update seed/reference/test data with automatic UPSERT logic.

### Location
- **Java classes**: `src/main/java/com/mosque/crm/liquibase/`
- **XML files**: `src/main/resources/db/changelog/changes/dml/`

### File Organization Rule
**CRITICAL:** Create one DML file per entity/table. Do not bundle multiple entities in a single file.

✅ **DO:** Separate files per entity
```
020-data-roles.xml          (only roles)
021-data-users.xml          (only users)
022-data-user-roles.xml     (only user-role junction)
023-data-user-member-links.xml (only user-member links)
```

❌ **DON'T:** Bundle multiple entities together
```
020-insert-all-security-data.xml  (roles + users + user-roles + links)
```

**Rationale:**
- Easier to locate and update data for specific entities
- Cleaner git diffs when making changes
- Better separation of concerns
- Simpler to add/remove data for individual entities

## Key Concept: UUID-Based Changeset IDs

### Traditional Liquibase Problem
Standard Liquibase changesets run once and are tracked by their ID. Once executed, they never run again. This makes it difficult to update seed/test data.

### Our Solution
**Use UUID for changeset IDs instead of sequential numbers**. When data needs to be updated:
1. Change the UUID in the changeset `id` attribute
2. Liquibase sees it as a "new" changeset and runs it
3. The custom Java class checks if the record exists (by primary key)
4. If exists → UPDATE, if not → INSERT

**Example:**
```xml
<!-- Original changeset -->
<changeSet id="data_member_1" author="cxode">
  <customChange class="com.mosque.crm.liquibase.DataMember">
    <param name="id"><![CDATA[1]]></param>
    <param name="email"><![CDATA[old@example.com]]></param>
  </customChange>
</changeSet>

<!-- To update the email, generate NEW UUID -->
<changeSet id="data_member_550e8400-e29b-41d4-a716-446655440001" author="cxode">
  <customChange class="com.mosque.crm.liquibase.DataMember">
    <param name="id"><![CDATA[1]]></param>
    <param name="email"><![CDATA[new@example.com]]></param>
  </customChange>
</changeSet>
```

The record with `id=1` will be **updated** with the new email because the UUID changed.

## Architecture

### 1. Base Class: `CustomDataTaskChange`

Located at: `com.mosque.crm.liquibase.CustomDataTaskChange`

**Purpose:** Abstract base class providing common functionality for all data task changes.

**Key Features:**
- Establishes JDBC connection to database
- Provides `setData()` method for null-safe parameter binding
- Handles multiple data types (String, Long, Boolean, Date, byte[])
- Manages transaction commit

**Pattern:**
```java
public abstract class CustomDataTaskChange implements CustomTaskChange {
    protected JdbcConnection connection;
    
    @Override
    public void execute(Database database) throws CustomChangeException {
        connection = (JdbcConnection) database.getConnection();
        try {
            handleUpdate();  // Subclass implements this
            connection.commit();
        } catch (DatabaseException | SQLException e) {
            e.printStackTrace();
        }
    }
    
    // Subclasses override this
    public void handleUpdate() throws DatabaseException, SQLException {
    }
    
    // Null-safe parameter binding
    protected void setData(PreparedStatement ps, int index, Object value) {
        // Handles null values and type conversion
    }
}
```

### 2. Entity Data Class: `DataMember`

Located at: `com.mosque.crm.liquibase.DataMember`

**Purpose:** Handles member data with UPSERT logic (insert if not exists, update if exists).

**Key Features:**
- One property for each table column
- Checks if record exists by primary key
- Updates if exists, inserts if not
- Type conversion helpers (`toLong()`, `toBoolean()`)

**Pattern:**
```java
public class DataMember extends CustomDataTaskChange {
    // Properties matching table columns
    private String id;
    private String email;
    private String phone;
    // ... more fields
    
    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        // 1. Check if record exists
        String query = "select id from members where id=?";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    exists = true;
                }
            }
        }
        
        // 2. Update if exists
        if (exists) {
            String update = "update members set email=?, phone=?, ... where id=?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, email);
                setData(ps, 2, phone);
                // ... bind all parameters
                ps.executeUpdate();
            }
        } 
        // 3. Insert if not exists
        else {
            String insert = "insert into members(id, email, phone, ...) values(?,?,?,...)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(id));
                setData(ps, 2, email);
                setData(ps, 3, phone);
                // ... bind all parameters
                ps.executeUpdate();
            }
        }
    }
    
    // Getters and setters for all properties
}
```

### 3. Liquibase XML: `007-data-members.xml`

Located at: `src/main/resources/db/changelog/changes/dml/007-data-members.xml`

**Purpose:** Defines data changesets using the custom Java classes.

**Pattern:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.4.xsd">

    <changeSet id="data_member_1" author="cxode">
        <customChange class="com.mosque.crm.liquibase.DataMember">
            <param name="id"><![CDATA[1]]></param>
            <param name="email"><![CDATA[admin@mosque.local]]></param>
            <param name="phone"><![CDATA[+1234567890]]></param>
            <param name="membershipStatus"><![CDATA[ACTIVE]]></param>
            <!-- All other fields -->
        </customChange>
    </changeSet>

    <changeSet id="data_member_2" author="cxode">
        <customChange class="com.mosque.crm.liquibase.DataMember">
            <!-- Next record -->
        </customChange>
    </changeSet>
    
</databaseChangeLog>
```

**Important XML Notes:**
- Use `<![CDATA[...]]>` to avoid XML escaping issues
- Empty strings for null values: `<param name="field"><![CDATA[]]></param>`
- Boolean values: `<![CDATA[TRUE]]>` or `<![CDATA[FALSE]]>`

## How to Use This Pattern

### Creating a New Entity Data Class

**Step 1:** Create Java class extending `CustomDataTaskChange`

```java
package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import liquibase.exception.DatabaseException;

public class DataRole extends CustomDataTaskChange {
    
    // Properties for each column
    private String id;
    private String name;
    private String description;
    
    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        // 1. Check existence
        String query = "select id from roles where id=?";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            try (ResultSet rs = ps.executeQuery()) {
                exists = rs.next();
            }
        }
        
        // 2. Update or Insert
        if (exists) {
            String update = "update roles set name=?, description=? where id=?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, name);
                setData(ps, 2, description);
                setData(ps, 3, toLong(id));
                ps.executeUpdate();
            }
        } else {
            String insert = "insert into roles(id, name, description) values(?,?,?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(id));
                setData(ps, 2, name);
                setData(ps, 3, description);
                ps.executeUpdate();
            }
        }
    }
    
    // Helper methods
    private Long toLong(String value) {
        return (value == null || value.trim().isEmpty()) ? null : Long.parseLong(value.trim());
    }
    
    // Getters and setters (required for Liquibase param binding)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
```

**Step 2:** Create Liquibase XML file

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.4.xsd">

    <!-- Use simple IDs initially -->
    <changeSet id="data_role_1" author="your-name">
        <customChange class="com.mosque.crm.liquibase.DataRole">
            <param name="id"><![CDATA[1]]></param>
            <param name="name"><![CDATA[ADMIN]]></param>
            <param name="description"><![CDATA[Administrator with full access]]></param>
        </customChange>
    </changeSet>

    <changeSet id="data_role_2" author="your-name">
        <customChange class="com.mosque.crm.liquibase.DataRole">
            <param name="id"><![CDATA[2]]></param>
            <param name="name"><![CDATA[MEMBER]]></param>
            <param name="description"><![CDATA[Regular member access]]></param>
        </customChange>
    </changeSet>

</databaseChangeLog>
```

**Step 3:** Include in master changelog

```xml
<include file="db/changelog/changes/dml/025-data-roles.xml"/>
```

### Updating Existing Data

**When you need to update data, follow this pattern:**

1. **Generate a UUID** (use online generator or command)
   - Linux/Mac: `uuidgen`
   - PowerShell: `[guid]::NewGuid().ToString()`
   - Online: https://www.uuidgenerator.net/

2. **Change the changeset ID to the UUID**

```xml
<!-- OLD - ran once, never runs again -->
<changeSet id="data_role_1" author="cxode">
    <customChange class="com.mosque.crm.liquibase.DataRole">
        <param name="id"><![CDATA[1]]></param>
        <param name="name"><![CDATA[ADMIN]]></param>
        <param name="description"><![CDATA[Old description]]></param>
    </customChange>
</changeSet>

<!-- NEW - will run again and UPDATE the record -->
<changeSet id="data_role_a3f5c8e1-4b2d-4c9f-8a7e-1d2e3f4a5b6c" author="cxode">
    <customChange class="com.mosque.crm.liquibase.DataRole">
        <param name="id"><![CDATA[1]]></param>
        <param name="name"><![CDATA[ADMIN]]></param>
        <param name="description"><![CDATA[Updated description]]></param>
    </customChange>
</changeSet>
```

3. **Run Liquibase**
   - The new UUID makes Liquibase think it's a new changeset
   - The Java class checks if `id=1` exists
   - Since it exists, it runs UPDATE instead of INSERT
   - The record is updated with new data

## Benefits of This Pattern

1. **Idempotent Data Management**
   - Can run migrations multiple times safely
   - Handles both initial population and updates

2. **Type Safety**
   - Java classes provide compile-time checking
   - Strong typing prevents SQL injection

3. **Version Control Friendly**
   - All data is in source control
   - Changes are tracked via git

4. **Flexible Updates**
   - Update any field of any record
   - No need to write separate UPDATE changesets

5. **Clean Separation**
   - DDL (schema) changes use standard XML
   - DML (data) changes use custom Java classes

## When to Use This Pattern

**✅ USE for:**
- Seed data (initial roles, admin users, etc.)
- Test data for development
- Reference data that changes over time
- Configuration data

**❌ DON'T USE for:**
- Schema changes (use standard Liquibase DDL)
- Large data imports (use bulk SQL or ETL tools)
- Production data entered by users
- Frequently changing transactional data

## Common Patterns

### Pattern 1: Optional Fields (Nullable)
```java
private String optionalField;

// In handleUpdate():
setData(ps, index, optionalField); // Handles null automatically
```

### Pattern 2: Required Fields (NOT NULL)
```java
if (requiredField == null || requiredField.trim().isEmpty()) {
    throw new IllegalArgumentException("Field X is required");
}
setData(ps, index, requiredField);
```

### Pattern 3: Foreign Keys
```java
// Store as String, convert to Long
private String userId;  // Foreign key to users table

// In handleUpdate():
setData(ps, index, toLong(userId));
```

### Pattern 4: Enums
```java
private String status;  // Will be 'ACTIVE', 'INACTIVE', etc.

// In handleUpdate():
setData(ps, index, status);  // Database stores as VARCHAR or ENUM
```

### Pattern 5: Dates
```java
import java.sql.Date;

private String memberSince;  // Pass as "2024-01-15"

// In handleUpdate():
setData(ps, index, Date.valueOf(memberSince));
```

## Troubleshooting

### Issue: "Class not found" error
**Cause:** Java class not compiled or not in classpath
**Solution:** Build project with Maven: `mvn clean compile`

### Issue: Changeset runs but no data inserted/updated
**Cause:** Exception in `handleUpdate()` method
**Solution:** Check Spring Boot console for stack traces

### Issue: "Column not found" error
**Cause:** SQL column name doesn't match database schema
**Solution:** Verify column names match DDL changesets exactly

### Issue: Type conversion error
**Cause:** Invalid data format (e.g., "abc" for Long field)
**Solution:** Validate input data formats in XML

### Issue: Duplicate primary key error
**Cause:** Multiple changesets trying to insert same ID
**Solution:** Ensure each record has unique ID across all changesets

## Example: Complete Workflow

**Scenario:** Add and update a user with security role

**Step 1:** Create `DataUser.java`
```java
public class DataUser extends CustomDataTaskChange {
    private String id;
    private String username;
    private String password;
    private String email;
    // ... getters, setters, handleUpdate()
}
```

**Step 2:** Create initial data `030-data-users.xml`
```xml
<changeSet id="data_user_1" author="dev">
    <customChange class="com.mosque.crm.liquibase.DataUser">
        <param name="id"><![CDATA[1]]></param>
        <param name="username"><![CDATA[john]]></param>
        <param name="password"><![CDATA[$2a$10$...hash...]]></param>
        <param name="email"><![CDATA[john@example.com]]></param>
    </customChange>
</changeSet>
```

**Step 3:** Application runs, data inserted

**Step 4:** Need to update email, generate UUID
```bash
# PowerShell
[guid]::NewGuid().ToString()
# Output: f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Step 5:** Update changeset with new UUID
```xml
<changeSet id="data_user_f47ac10b-58cc-4372-a567-0e02b2c3d479" author="dev">
    <customChange class="com.mosque.crm.liquibase.DataUser">
        <param name="id"><![CDATA[1]]></param>
        <param name="username"><![CDATA[john]]></param>
        <param name="password"><![CDATA[$2a$10$...hash...]]></param>
        <param name="email"><![CDATA[john.doe@company.com]]></param>
    </customChange>
</changeSet>
```

**Step 6:** Restart application, email updated

## Files Reference

### Java Classes
- **Base:** `src/main/java/com/mosque/crm/liquibase/CustomDataTaskChange.java`
- **Example:** `src/main/java/com/mosque/crm/liquibase/DataMember.java`

### XML Files
- **Example:** `src/main/resources/db/changelog/changes/dml/007-data-members.xml`
- **Master:** `src/main/resources/db/changelog/db.changelog-master.xml`

### Key Locations
```
backend/
├── src/main/java/com/mosque/crm/liquibase/
│   ├── CustomDataTaskChange.java    ← Base class
│   ├── DataMember.java               ← Example implementation
│   └── Data*.java                    ← Create more as needed
└── src/main/resources/db/changelog/
    ├── db.changelog-master.xml       ← Include DML files here
    └── changes/
        └── dml/
            └── 0*-data-*.xml         ← Data changesets
```

## Best Practices

1. **Always use CDATA for params** - Prevents XML parsing issues
2. **Generate UUIDs for updates** - Makes changesets re-runnable
3. **Check for null/empty** - Use `setData()` which handles nulls
4. **One entity per Java class** - Don't mix tables
5. **Sequential numbering for inserts** - Simple IDs like `data_role_1`, `data_role_2`
6. **UUIDs for updates** - Change ID when updating existing data
7. **Include all fields** - Even if unchanged, for clarity
8. **Test locally first** - Verify UPSERTs work before committing

## Summary

This custom Liquibase pattern enables **idempotent data management** through:
- Custom Java classes that perform UPSERT operations
- UUID-based changeset IDs that allow re-running with updates
- Type-safe parameter binding via `setData()` method
- Clean separation between DDL (schema) and DML (data)

**Key Rule:** When updating data, generate a new UUID for the changeset ID. The Java class will detect the existing record and UPDATE instead of INSERT.
