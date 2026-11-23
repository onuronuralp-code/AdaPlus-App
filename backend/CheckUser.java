import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckUser {
    public static void main(String[] args) {
        try {
            Connection conn = DriverManager.getConnection("jdbc:h2:file:./data/adaplus;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL", "sa", "");
            Statement stmt = conn.createStatement();
            
            // Set user to verified
            int updated = stmt.executeUpdate("UPDATE users SET email_verified = true WHERE email = 'onur.onuralp@gmail.com'");
            System.out.println("Updated rows: " + updated);
            
            ResultSet rs = stmt.executeQuery("SELECT email, email_verified FROM users");
            while (rs.next()) {
                System.out.println("Email: " + rs.getString("email") + " Verified: " + rs.getBoolean("email_verified"));
            }
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
