package com.mosque.crm.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Donation;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.DonationType;

@Repository
public interface DonationRepository extends JpaRepository<Donation, Long> {

    List<Donation> findByPerson(Person person);

    List<Donation> findByDonationType(DonationType donationType);

    List<Donation> findByDonationDateBetween(LocalDate startDate, LocalDate endDate);

    @Query("SELECT SUM(d.amount) FROM Donation d WHERE d.person = :person")
    BigDecimal getTotalDonationsByPerson(Person person);

    @Query("SELECT SUM(d.amount) FROM Donation d WHERE d.donationType = :type")
    BigDecimal getTotalDonationsByType(DonationType type);
}
