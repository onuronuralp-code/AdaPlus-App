package app.adaplus.backend.service;

import app.adaplus.backend.dto.demand.DeliveryVoteRequest;
import app.adaplus.backend.entity.DeliveryDemandVote;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.AlreadyVotedException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.repository.DeliveryDemandVoteRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DemandService {

    private static final Set<String> VALID_OPTIONS = Set.of("CARGO", "SUPERMARKET", "WATER_GAS", "OTHER");

    private final DeliveryDemandVoteRepository voteRepository;
    private final UserRepository userRepository;

    @Transactional
    public void voteDelivery(DeliveryVoteRequest req) {
        UUID userId = currentUserId();

        if (voteRepository.existsByUserId(userId)) {
            throw new AlreadyVotedException();
        }

        List<String> normalised = req.options().stream()
                .map(String::toUpperCase)
                .filter(VALID_OPTIONS::contains)
                .distinct()
                .toList();

        if (normalised.isEmpty()) {
            throw new IllegalArgumentException("No valid options selected");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        DeliveryDemandVote vote = DeliveryDemandVote.builder()
                .user(user)
                .options(String.join(",", normalised))
                .otherText(req.otherText())
                .island(req.island())
                .build();

        voteRepository.save(vote);
        log.info("[DEMAND] Delivery vote recorded for user {} — options: {}", userId, normalised);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getDeliveryStats() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String opt : VALID_OPTIONS) counts.put(opt, 0L);

        voteRepository.findAll().forEach(vote -> {
            for (String opt : vote.getOptions().split(",")) {
                counts.merge(opt.trim(), 1L, Long::sum);
            }
        });

        counts.put("TOTAL_VOTERS", voteRepository.count());
        return counts;
    }

    private UUID currentUserId() {
        return UUID.fromString(
                (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    }
}
