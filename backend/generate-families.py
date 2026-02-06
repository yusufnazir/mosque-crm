#!/usr/bin/env python3
"""
Generate comprehensive multi-generational family data for the mosque CRM system.
Creates 20+ interconnected families showing sibling and in-law relationships.
"""

# Family structure:
# - 4 grandparent couples (Generation 0) - IDs 100-107 (already created)
# - 20+ parent couples (Generation 1) - IDs starting from 15
# - ~60 children (Generation 2)

# Existing data:
# - Admin: ID 1
# - Family 1 (Ibrahim & Fatima): IDs 2-6 (parents + 3 children) - parents: 100, 102
# - Family 2 (Ahmed & Zahra): IDs 7-10 (parents + 2 children) - parents: 100, 104
# - Family 3 (Abdullah & Amina): IDs 11-14 (parents + 2 children) - parents: 106, 100
# - Grandparents: IDs 100-107

first_names_male = [
    "Mohammad", "Ali", "Omar", "Bilal", "Yusuf", "Tariq", "Hamza", "Saleh",
    "Karim", "Nasir", "Zaid", "Malik", "Rashid", "Jamal", "Fahad", "Samir",
    "Walid", "Nabil", "Rami", "Imran", "Haroun", "Ilyas"
]

first_names_female = [
    "Layla", "Yasmin", "Hiba", "Nadia", "Samira", "Rania", "Dina", "Muna",
    "Salma", "Noor", "Zara", "Leena", "Hana", "Rana", "Safa", "Iman",
    "Noura", "Jana", "Lina", "Marwa", "Soraya"
]

last_names = [
    "Hassan", "Abbas", "Farouk", "Nasser", "Rahman", "Aziz", "Siddiqui",
    "Hashmi", "Qureshi", "Ahmad", "Ansari", "Sheikh", "Hussain", "Iqbal"
]

child_first_names_male = [
    "Adam", "Ibrahim", "Ismael", "Musa", "Isa", "Idris", "Dawud", "Sulaiman",
    "Zakariya", "Yahya", "Ayub", "Yunus", "Nuh", "Hood", "Salih"
]

child_first_names_female = [
    "Maryam", "Khadija", "Aisha", "Fatima", "Hafsa", "Zainab", "Ruqayya",
    "Safiya", "Sumaya", "Asma", "Kulthum", "Sawda", "Maymuna"
]

addresses = [
    ("241 Crescent Avenue", "Springfield", "12345"),
    ("532 Harmony Lane", "Riverside", "12346"),
    ("873 Peace Street", "Lakeside", "12347"),
    ("164 Unity Drive", "Springfield", "12345"),
    ("695 Faith Road", "Riverside", "12346"),
    ("327 Hope Boulevard", "Lakeside", "12347"),
    ("458 Grace Circle", "Springfield", "12345"),
    ("

789 Mercy Way", "Riverside", "12346"),
    ("912 Blessing Court", "Lakeside", "12347"),
    ("135 Wisdom Path", "Springfield", "12345"),
    ("246 Light Avenue", "Riverside", "12346"),
    ("357 Truth Lane", "Lakeside", "12347"),
    ("468 Justice Street", "Springfield", "12345"),
    ("579 Patience Drive", "Riverside", "12346"),
    ("681 Kindness Road", "Lakeside", "12347")
]

# Generate XML for a family (parents + children)
def generate_family(family_num, husband_id, wife_id, husband_name, wife_name, 
                   husband_parent_id, wife_parent_id, num_children=3):
    """Generate XML changeSets for a complete family unit."""
    output = []
    
    # Husband
    husband_last = last_names[(family_num - 1) % len(last_names)]
    addr, city, postal = addresses[(family_num - 1) % len(addresses)]
    phone_base = f"+12345678{husband_id:02d}"
    email = f"{husband_name.lower()}.{husband_last.lower()}@example.com"
    dob_year = 1970 + ((family_num - 1) % 15)  # Ages 39-54
    
    output.append(f'''
	<!-- FAMILY {family_num}: {husband_name} & {wife_name} (parent IDs: {husband_parent_id}/{wife_parent_id}) -->
	<changeSet id="data_member_{husband_id}" author="cxode">
		<customChange class="com.mosque.crm.liquibase.DataMember">
			<param name="id"><![CDATA[{husband_id}]]></param>
			<param name="firstName"><![CDATA[{husband_name}]]></param>
			<param name="lastName"><![CDATA[{husband_last}]]></param>
			<param name="email"><![CDATA[{email}]]></param>
			<param name="phone"><![CDATA[{phone_base}]]></param>
			<param name="dateOfBirth"><![CDATA[{dob_year}-{(family_num % 12) + 1:02d}-{((family_num * 3) % 28) + 1:02d}]]></param>
			<param name="gender"><![CDATA[MALE]]></param>
			<param name="address"><![CDATA[{addr}]]></param>
			<param name="city"><![CDATA[{city}]]></param>
			<param name="country"><![CDATA[USA]]></param>
			<param name="postalCode"><![CDATA[{postal}]]></param>
			<param name="membershipStatus"><![CDATA[ACTIVE]]></param>
			<param name="memberSince"><![CDATA[{2015 + (family_num % 10)}-{((family_num % 12) + 1):02d}-01]]></param>
			<param name="partnerId"><![CDATA[{wife_id}]]></param>
			<param name="parentId"><![CDATA[{husband_parent_id}]]></param>
			<param name="username"><![CDATA[]]></param>
			<param name="password"><![CDATA[]]></param>
			<param name="role"><![CDATA[MEMBER]]></param>
			<param name="accountEnabled"><![CDATA[TRUE]]></param>
		</customChange>
	</changeSet>
''')
    
    # Wife
    wife_email = f"{wife_name.lower()}.{husband_last.lower()}@example.com"
    wife_dob_year = dob_year + 2  # Typically 2 years younger
    
    output.append(f'''
	<changeSet id="data_member_{wife_id}" author="cxode">
		<customChange class="com.mosque.crm.liquibase.DataMember">
			<param name="id"><![CDATA[{wife_id}]]></param>
			<param name="firstName"><![CDATA[{wife_name}]]></param>
			<param name="lastName"><![CDATA[{husband_last}]]></param>
			<param name="email"><![CDATA[{wife_email}]]></param>
			<param name="phone"><![CDATA[{phone_base}1]]></param>
			<param name="dateOfBirth"><![CDATA[{wife_dob_year}-{((family_num + 3) % 12) + 1:02d}-{((family_num * 5) % 28) + 1:02d}]]></param>
			<param name="gender"><![CDATA[FEMALE]]></param>
			<param name="address"><![CDATA[{addr}]]></param>
			<param name="city"><![CDATA[{city}]]></param>
			<param name="country"><![CDATA[USA]]></param>
			<param name="postalCode"><![CDATA[{postal}]]></param>
			<param name="membershipStatus"><![CDATA[ACTIVE]]></param>
			<param name="memberSince"><![CDATA[{2015 + (family_num % 10)}-{((family_num % 12) + 1):02d}-01]]></param>
			<param name="partnerId"><![CDATA[{husband_id}]]></param>
			<param name="parentId"><![CDATA[{wife_parent_id}]]></param>
			<param name="username"><![CDATA[]]></param>
			<param name="password"><![CDATA[]]></param>
			<param name="role"><![CDATA[MEMBER]]></param>
			<param name="accountEnabled"><![CDATA[TRUE]]></param>
		</customChange>
	</changeSet>
''')
    
    # Children
    child_id = wife_id + 1
    for i in range(num_children):
        is_male = (i % 2 == 0)
        child_name = child_first_names_male[i % len(child_first_names_male)] if is_male else child_first_names_female[i % len(child_first_names_female)]
        child_dob_year = 2000 + (i * 4) + (family_num % 5)  # Ages 4-24
        
        output.append(f'''
	<changeSet id="data_member_{child_id}" author="cxode">
		<customChange class="com.mosque.crm.liquibase.DataMember">
			<param name="id"><![CDATA[{child_id}]]></param>
			<param name="firstName"><![CDATA[{child_name}]]></param>
			<param name="lastName"><![CDATA[{husband_last}]]></param>
			<param name="email"><![CDATA[]]></param>
			<param name="phone"><![CDATA[]]></param>
			<param name="dateOfBirth"><![CDATA[{child_dob_year}-{((i * 4 + family_num) % 12) + 1:02d}-{((i * 7 + family_num) % 28) + 1:02d}]]></param>
			<param name="gender"><![CDATA[{"MALE" if is_male else "FEMALE"}]]></param>
			<param name="address"><![CDATA[{addr}]]></param>
			<param name="city"><![CDATA[{city}]]></param>
			<param name="country"><![CDATA[USA]]></param>
			<param name="postalCode"><![CDATA[{postal}]]></param>
			<param name="membershipStatus"><![CDATA[ACTIVE]]></param>
			<param name="memberSince"><![CDATA[{2015 + (family_num % 10)}-{((family_num % 12) + 1):02d}-01]]></param>
			<param name="partnerId"><![CDATA[]]></param>
			<param name="parentId"><![CDATA[{husband_id}]]></param>
			<param name="username"><![CDATA[]]></param>
			<param name="password"><![CDATA[]]></param>
			<param name="role"><![CDATA[MEMBER]]></param>
			<param name="accountEnabled"><![CDATA[FALSE]]></param>
		</customChange>
	</changeSet>
''')
        child_id += 1
    
    return ''.join(output), child_id

# Main generation logic
def main():
    output = []
    current_id = 15  # Start after existing family 3's children (up to ID 14)
    
    # Generate 17 more families to reach 20 total (we already have 3 families: Ibrahim, Ahmed, Abdullah)
    # These will be siblings of existing family heads or their in-laws
    
    # Strategy: Create families where parents are children of the 4 grandparent couples (100-107)
    # Grandparent couple 1 (Hassan #100): Ibrahim(2), Ahmed(7), Amina(12) - add 2 more children heading families
    # Grandparent couple 2 (Mahmoud #102): Fatima(3) - add 3 more children heading families
    # Grandparent couple 3 (Omar #104): Zahra(8) - add 3 more children heading families
    # Grandparent couple 4 (Idris #106): Abdullah(11) - add 3 more children heading families
    
    families_data = []
    
    # From Grandparent Couple 1 (Hassan #100) - add 2 more families
    families_data.append((4, current_id, current_id + 1, first_names_male[0], first_names_female[0], "100", "102", 3))
    current_id += 5
    families_data.append((5, current_id, current_id + 1, first_names_male[1], first_names_female[1], "100", "104", 2))
    current_id += 4
    
    # From Grandparent Couple 2 (Mahmoud #102) - add 3 more families
    families_data.append((6, current_id, current_id + 1, first_names_male[2], first_names_female[2], "106", "102", 3))
    current_id += 5
    families_data.append((7, current_id, current_id + 1, first_names_male[3], first_names_female[3], "100", "102", 2))
    current_id += 4
    families_data.append((8, current_id, current_id + 1, first_names_male[4], first_names_female[4], "104", "102", 4))
    current_id += 6
    
    # From Grandparent Couple 3 (Omar #104) - add 3 more families
    families_data.append((9, current_id, current_id + 1, first_names_male[5], first_names_female[5], "104", "106", 3))
    current_id += 5
    families_data.append((10, current_id, current_id + 1, first_names_male[6], first_names_female[6], "104", "100", 2))
    current_id += 4
    families_data.append((11, current_id, current_id + 1, first_names_male[7], first_names_female[7], "104", "102", 3))
    current_id += 5
    
    # From Grandparent Couple 4 (Idris #106) - add 3 more families
    families_data.append((12, current_id, current_id + 1, first_names_male[8], first_names_female[8], "106", "104", 2))
    current_id += 4
    families_data.append((13, current_id, current_id + 1, first_names_male[9], first_names_female[9], "106", "100", 3))
    current_id += 5
    families_data.append((14, current_id, current_id + 1, first_names_male[10], first_names_female[10], "106", "102", 2))
    current_id += 4
    
    # Add 6 more diverse families to reach 20 total
    families_data.append((15, current_id, current_id + 1, first_names_male[11], first_names_female[11], "100", "106", 3))
    current_id += 5
    families_data.append((16, current_id, current_id + 1, first_names_male[12], first_names_female[12], "102", "104", 2))
    current_id += 4
    families_data.append((17, current_id, current_id + 1, first_names_male[13], first_names_female[13], "104", "106", 3))
    current_id += 5
    families_data.append((18, current_id, current_id + 1, first_names_male[14], first_names_female[14], "106", "100", 2))
    current_id += 4
    families_data.append((19, current_id, current_id + 1, first_names_male[15], first_names_female[15], "100", "102", 3))
    current_id += 5
    families_data.append((20, current_id, current_id + 1, first_names_male[16], first_names_female[16], "102", "106", 2))
    current_id += 4
    
    # Generate all families
    for family_data in families_data:
        family_xml, next_id = generate_family(*family_data)
        output.append(family_xml)
        current_id = next_id
    
    # Write to file
    with open('additional-families.xml', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    
    print(f"Generated {len(families_data)} additional families (families 4-20)")
    print(f"Total members generated: {current_id - 15}")
    print(f"Last ID used: {current_id - 1}")
    print("Output written to: additional-families.xml")

if __name__ == "__main__":
    main()
