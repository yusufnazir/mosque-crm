package com.mosque.crm.dto.report;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO for the member directory export report (all members with profile fields).
 */
public class MemberDirectoryReportDTO {

    private long totalMembers;
    private int totalFamilies;
    private long aliveMembers;
    private long deceasedMembers;
    private List<MemberDirectoryRow> rows;
    private List<MemberDirectoryFamilyGroup> families;

    public MemberDirectoryReportDTO() {
    }

    public MemberDirectoryReportDTO(long totalMembers, List<MemberDirectoryRow> rows) {
        this.totalMembers = totalMembers;
        this.rows = rows;
        this.totalFamilies = 0;
    }

    public MemberDirectoryReportDTO(long totalMembers, int totalFamilies, long aliveMembers, long deceasedMembers,
                                    List<MemberDirectoryFamilyGroup> families, List<MemberDirectoryRow> rows) {
        this.totalMembers = totalMembers;
        this.totalFamilies = totalFamilies;
        this.aliveMembers = aliveMembers;
        this.deceasedMembers = deceasedMembers;
        this.families = families;
        this.rows = rows;
    }

    public long getTotalMembers() {
        return totalMembers;
    }

    public void setTotalMembers(long totalMembers) {
        this.totalMembers = totalMembers;
    }

    public List<MemberDirectoryRow> getRows() {
        return rows;
    }

    public void setRows(List<MemberDirectoryRow> rows) {
        this.rows = rows;
    }

    public int getTotalFamilies() {
        return totalFamilies;
    }

    public void setTotalFamilies(int totalFamilies) {
        this.totalFamilies = totalFamilies;
    }

    public List<MemberDirectoryFamilyGroup> getFamilies() {
        return families;
    }

    public void setFamilies(List<MemberDirectoryFamilyGroup> families) {
        this.families = families;
    }

    public long getAliveMembers() {
        return aliveMembers;
    }

    public void setAliveMembers(long aliveMembers) {
        this.aliveMembers = aliveMembers;
    }

    public long getDeceasedMembers() {
        return deceasedMembers;
    }

    public void setDeceasedMembers(long deceasedMembers) {
        this.deceasedMembers = deceasedMembers;
    }

    public static class MemberDirectoryFamilyGroup {
        private String groupKey;
        private String familyNumber;
        private String familyLabel;
        private int memberCount;
        private List<MemberDirectoryRow> members;

        public MemberDirectoryFamilyGroup() {
        }

        public MemberDirectoryFamilyGroup(String groupKey, String familyNumber, String familyLabel,
                                          List<MemberDirectoryRow> members) {
            this.groupKey = groupKey;
            this.familyNumber = familyNumber;
            this.familyLabel = familyLabel;
            this.members = members;
            this.memberCount = members != null ? members.size() : 0;
        }

        public String getGroupKey() {
            return groupKey;
        }

        public void setGroupKey(String groupKey) {
            this.groupKey = groupKey;
        }

        public String getFamilyNumber() {
            return familyNumber;
        }

        public void setFamilyNumber(String familyNumber) {
            this.familyNumber = familyNumber;
        }

        public String getFamilyLabel() {
            return familyLabel;
        }

        public void setFamilyLabel(String familyLabel) {
            this.familyLabel = familyLabel;
        }

        public int getMemberCount() {
            return memberCount;
        }

        public void setMemberCount(int memberCount) {
            this.memberCount = memberCount;
        }

        public List<MemberDirectoryRow> getMembers() {
            return members;
        }

        public void setMembers(List<MemberDirectoryRow> members) {
            this.members = members;
            this.memberCount = members != null ? members.size() : 0;
        }
    }

    public static class MemberDirectoryRow {
        private Long personId;
        private String firstName;
        private String lastName;
        private String familyNumber;
        private LocalDate dateOfBirth;
        private LocalDate dateOfDeath;
        private Integer age;
        private String address;
        private String phone;
        private String idNumber;
        private String email;
        private String civilState;
        private String gender;

        public MemberDirectoryRow() {
        }

        public Long getPersonId() {
            return personId;
        }

        public void setPersonId(Long personId) {
            this.personId = personId;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getFamilyNumber() {
            return familyNumber;
        }

        public void setFamilyNumber(String familyNumber) {
            this.familyNumber = familyNumber;
        }

        public LocalDate getDateOfBirth() {
            return dateOfBirth;
        }

        public void setDateOfBirth(LocalDate dateOfBirth) {
            this.dateOfBirth = dateOfBirth;
        }

        public LocalDate getDateOfDeath() {
            return dateOfDeath;
        }

        public void setDateOfDeath(LocalDate dateOfDeath) {
            this.dateOfDeath = dateOfDeath;
        }

        public Integer getAge() {
            return age;
        }

        public void setAge(Integer age) {
            this.age = age;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getIdNumber() {
            return idNumber;
        }

        public void setIdNumber(String idNumber) {
            this.idNumber = idNumber;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getCivilState() {
            return civilState;
        }

        public void setCivilState(String civilState) {
            this.civilState = civilState;
        }

        public String getGender() {
            return gender;
        }

        public void setGender(String gender) {
            this.gender = gender;
        }
    }
}
