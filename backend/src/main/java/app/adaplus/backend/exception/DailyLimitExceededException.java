package app.adaplus.backend.exception;

public class DailyLimitExceededException extends RuntimeException {
    public DailyLimitExceededException() {
        super("daily_limit_reached");
    }

    public DailyLimitExceededException(String message) {
        super(message);
    }
}
