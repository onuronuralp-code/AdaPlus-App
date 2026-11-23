package app.adaplus.backend.repository;

import app.adaplus.backend.entity.DeviceToken;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {
    List<DeviceToken> findByUserId(UUID userId);
    Optional<DeviceToken> findByToken(String token);
    void deleteByToken(String token);

    // Pageable variants used by broadcast to avoid loading all tokens into heap at once
    @Query("SELECT dt FROM DeviceToken dt JOIN FETCH dt.user")
    Slice<DeviceToken> findAllWithUser(Pageable pageable);

    @Query("SELECT dt FROM DeviceToken dt JOIN FETCH dt.user u WHERE u.island = :island")
    Slice<DeviceToken> findByUserIsland(@Param("island") String island, Pageable pageable);
}
