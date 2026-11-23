package app.adaplus.backend.dto.listing;

import app.adaplus.backend.entity.Island;
import app.adaplus.backend.entity.ListingCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record SaveListingRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title must not exceed 255 characters")
        String title,

        @NotBlank(message = "Description is required")
        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        @NotNull(message = "Category is required")
        ListingCategory category,

        @NotNull(message = "Island is required")
        Island island,

        @DecimalMin(value = "0.0", message = "Price must be 0 or greater")
        BigDecimal price,

        /** e.g. "₺/gün", "₺/ay" — optional, for admin use */
        @Size(max = 50)
        String priceLabel,

        @Size(max = 5, message = "A listing can have at most 5 photos")
        List<String> imageUrls,

        @NotBlank(message = "Contact info is required")
        @Pattern(regexp = "^(\\d{11}|[^@\\s]+@[^@\\s]+\\.[^@\\s]+)$", message = "contactInfo must be an 11-digit phone number or a valid email address")
        @Size(max = 255)
        String contactInfo,

        @Size(max = 255, message = "Seller name must not exceed 255 characters")
        String sellerName,

        boolean active
) {}
