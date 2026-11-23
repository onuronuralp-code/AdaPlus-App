package app.adaplus.backend.service;

import app.adaplus.backend.dto.popup.PopupDto;
import app.adaplus.backend.dto.popup.SavePopupRequest;
import app.adaplus.backend.entity.Popup;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.repository.PopupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PopupService {

    private final PopupRepository popupRepository;

    @Transactional(readOnly = true)
    public Optional<PopupDto> getActivePopup() {
        return popupRepository.findFirstByActiveTrueOrderByCreatedAtDesc()
                .map(PopupDto::from);
    }

    @Transactional(readOnly = true)
    public List<PopupDto> getAllPopups() {
        return popupRepository.findAll().stream().map(PopupDto::from).toList();
    }

    public PopupDto create(SavePopupRequest req) {
        Popup popup = Popup.builder()
                .title(req.title().trim())
                .body(req.body())
                .imageUrl(req.imageUrl())
                .actionUrl(req.actionUrl())
                .actionLabel(req.actionLabel())
                .active(req.active())
                .build();
        return PopupDto.from(popupRepository.save(popup));
    }

    public PopupDto update(UUID id, SavePopupRequest req) {
        Popup popup = popupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Popup not found"));
        popup.setTitle(req.title().trim());
        popup.setBody(req.body());
        popup.setImageUrl(req.imageUrl());
        popup.setActionUrl(req.actionUrl());
        popup.setActionLabel(req.actionLabel());
        popup.setActive(req.active());
        return PopupDto.from(popupRepository.save(popup));
    }

    public void delete(UUID id) {
        if (!popupRepository.existsById(id)) {
            throw new ResourceNotFoundException("Popup not found");
        }
        popupRepository.deleteById(id);
    }
}
