package app.adaplus.backend.service;

import app.adaplus.backend.dto.banner.BannerDto;
import app.adaplus.backend.dto.banner.SaveBannerRequest;
import app.adaplus.backend.entity.Banner;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.repository.BannerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class BannerService {

    private final BannerRepository bannerRepository;

    @Transactional(readOnly = true)
    public Optional<BannerDto> getActiveBanner() {
        return bannerRepository.findFirstByActiveTrueOrderByCreatedAtDesc()
                .map(BannerDto::from);
    }

    @Transactional(readOnly = true)
    public List<BannerDto> getAllBanners() {
        return bannerRepository.findAll().stream().map(BannerDto::from).toList();
    }

    public BannerDto create(SaveBannerRequest req) {
        Banner banner = Banner.builder()
                .title(req.title().trim())
                .body(req.body())
                .imageUrl(req.imageUrl())
                .actionUrl(req.actionUrl())
                .actionLabel(req.actionLabel())
                .active(req.active())
                .build();
        return BannerDto.from(bannerRepository.save(banner));
    }

    public BannerDto update(UUID id, SaveBannerRequest req) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner not found"));
        banner.setTitle(req.title().trim());
        banner.setBody(req.body());
        banner.setImageUrl(req.imageUrl());
        banner.setActionUrl(req.actionUrl());
        banner.setActionLabel(req.actionLabel());
        banner.setActive(req.active());
        return BannerDto.from(bannerRepository.save(banner));
    }

    public void delete(UUID id) {
        if (!bannerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Banner not found");
        }
        bannerRepository.deleteById(id);
    }
}
