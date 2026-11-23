import com.fasterxml.jackson.databind.ObjectMapper;

public class TestRecord {
    public record PollOptionDto(String id, boolean isVoted) {}

    public static void main(String[] args) throws Exception {
        PollOptionDto dto = new PollOptionDto("1", true);
        ObjectMapper mapper = new ObjectMapper();
        System.out.println(mapper.writeValueAsString(dto));
    }
}
