@Grab('com.h2database:h2:2.3.232')
import java.sql.DriverManager

try {
    def conn = DriverManager.getConnection("jdbc:h2:file:./data/adaplus;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL", "sa", "")
    def stmt = conn.createStatement()
    def rs = stmt.executeQuery("SELECT email, email_verified FROM users")
    while (rs.next()) {
        println "Email: " + rs.getString("email") + " Verified: " + rs.getBoolean("email_verified")
    }
    conn.close()
} catch(Exception e) {
    println "Error: " + e.getMessage()
}
