package app.adaplus.backend.exception;

import app.adaplus.backend.entity.ReviewStatus;

public class AlreadyReviewedException extends RuntimeException {

    private final ReviewStatus currentStatus;

    public AlreadyReviewedException(ReviewStatus currentStatus) {
        super("Already reviewed: " + currentStatus);
        this.currentStatus = currentStatus;
    }

    public ReviewStatus getCurrentStatus() {
        return currentStatus;
    }
}
