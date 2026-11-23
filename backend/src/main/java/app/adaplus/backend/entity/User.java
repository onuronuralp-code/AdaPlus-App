package app.adaplus.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(unique = true, length = 255)
    private String email;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserType userType = UserType.TOURIST;

    @Column(nullable = false)
    @Builder.Default
    private boolean termsAccepted = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean kvkkAccepted = true;

    @Column(nullable = false)
    private boolean emailVerified;

    @Column(nullable = false)
    @Builder.Default
    private boolean phoneVerified = false;

    @Column(nullable = false)
    @Builder.Default
    private int tokenVersion = 0;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 50)
    private String island;

    @Column(length = 500)
    private String address;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
