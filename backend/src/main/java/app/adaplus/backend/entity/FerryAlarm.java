package app.adaplus.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "ferry_alarms",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_ferry_alarm",
        columnNames = {"user_id", "route_from", "route_to", "departure_time", "minutes_before"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FerryAlarm {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "route_from", nullable = false, length = 100)
    private String routeFrom;

    @Column(name = "route_to", nullable = false, length = 100)
    private String routeTo;

    /** HH:mm format — departure time to remind about. */
    @Column(name = "departure_time", nullable = false, length = 5)
    private String departureTime;

    /** How many minutes before departure to send the notification (15, 30, or 60). */
    @Column(name = "minutes_before", nullable = false)
    private int minutesBefore;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /** Last date (Europe/Istanbul) this alarm was fired — prevents same-day double-fire. */
    @Column(name = "last_fired_date")
    private LocalDate lastFiredDate;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
