package app.adaplus.backend.exception;

public class AlreadyVotedException extends RuntimeException {
    public AlreadyVotedException() {
        super("already_voted");
    }
}
