package app.adaplus.backend.repository;

import app.adaplus.backend.entity.FerryAlarm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FerryAlarmRepository extends JpaRepository<FerryAlarm, UUID> {

    List<FerryAlarm> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<FerryAlarm> findByActiveTrue();

    @Query("SELECT a FROM FerryAlarm a WHERE a.user.id = :userId AND a.routeFrom = :from AND a.routeTo = :to AND a.departureTime = :depTime AND a.minutesBefore = :mins")
    Optional<FerryAlarm> findDuplicate(
            @Param("userId") UUID userId,
            @Param("from") String routeFrom,
            @Param("to") String routeTo,
            @Param("depTime") String departureTime,
            @Param("mins") int minutesBefore);
}
