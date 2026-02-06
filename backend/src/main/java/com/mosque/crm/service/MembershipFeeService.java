package com.mosque.crm.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MembershipFeeDTO;
import com.mosque.crm.dto.MonthlyFeeStatsDTO;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.repository.MembershipFeeRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
@Transactional
public class MembershipFeeService {


    @Autowired
    private MembershipFeeRepository feeRepository;

    @Autowired
    private PersonRepository personRepository;

    public List<MembershipFeeDTO> getAllFees() {
        return List.of();
    }

    public List<MembershipFeeDTO> getFeesByPersonId(String personId) {
        return List.of();
    }

    @Deprecated
    public List<MembershipFeeDTO> getFeesByMemberId(Long memberId) {
        return List.of();
    }

    public MembershipFeeDTO getFeeById(Long id) {
        throw new UnsupportedOperationException("Member fees pending person-centric rework.");
    }

    public MembershipFeeDTO createFee(MembershipFeeDTO feeDTO) {
        throw new UnsupportedOperationException("Member fees pending person-centric rework.");
    }

    public MembershipFeeDTO updateFee(Long id, MembershipFeeDTO feeDTO) {
        throw new UnsupportedOperationException("Member fees pending person-centric rework.");
    }

    public void deleteFee(Long id) {
        throw new UnsupportedOperationException("Member fees pending person-centric rework.");
    }

    public List<MembershipFeeDTO> getOverdueFees() {
        return List.of();
    }

    // Fee conversion helpers removed while migrating off members table

    /**
     * Returns monthly expected and realized fee income for the current year.
     * Eligibility: Person is ACTIVE, not deceased, age 18-60 inclusive.
     * Expected: eligible count * 35 SRD. Realized: sum of PAID fees per month.
     */
    public List<MonthlyFeeStatsDTO> getMonthlyFeeStatsForCurrentYear() {
        int year = java.time.LocalDate.now().getYear();
        // 1. Find eligible persons (ACTIVE, not deceased, age 18-60)
        List<Person> eligible = personRepository.findAllActivePersons().stream()
            .filter(p -> {
                if (p.getDateOfBirth() == null) return false;
                if (p.getStatus() != PersonStatus.ACTIVE) return false;
                if (p.isDeceased()) return false;
                int age = java.time.Period.between(p.getDateOfBirth(), java.time.LocalDate.now()).getYears();
                return age >= 18 && age <= 60;
            })
            .toList();
        int eligibleCount = eligible.size();
        java.math.BigDecimal expectedPerMonth = java.math.BigDecimal.valueOf(eligibleCount).multiply(java.math.BigDecimal.valueOf(35));

        // 2. Get realized income per month
        List<Object[]> realizedRaw = feeRepository.getMonthlyRealizedIncome(year);
        java.util.Map<Integer, java.math.BigDecimal> realizedMap = new java.util.HashMap<>();
        for (Object[] row : realizedRaw) {
            Integer month = (Integer) row[0];
            java.math.BigDecimal sum = (java.math.BigDecimal) row[1];
            realizedMap.put(month, sum != null ? sum : java.math.BigDecimal.ZERO);
        }

        // 3. Build DTOs for all 12 months
        List<MonthlyFeeStatsDTO> result = new java.util.ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            java.math.BigDecimal realized = realizedMap.getOrDefault(m, java.math.BigDecimal.ZERO);
            result.add(new MonthlyFeeStatsDTO(m, expectedPerMonth, realized));
        }
        return result;
    }
}
