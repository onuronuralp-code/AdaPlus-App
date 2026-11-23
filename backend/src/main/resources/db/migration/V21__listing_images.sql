CREATE TABLE IF NOT EXISTS listing_images (
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    image_url  VARCHAR(500) NOT NULL,
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (listing_id, sort_order)
);

-- Seed from legacy single-image column so existing listings don't lose their photo
INSERT INTO listing_images (listing_id, image_url, sort_order)
SELECT id, image_url, 0
FROM listings
WHERE image_url IS NOT NULL AND image_url <> '';
