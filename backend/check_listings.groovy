@Grab('com.h2database:h2:2.3.232')
import java.sql.DriverManager

try {
    def conn = DriverManager.getConnection("jdbc:h2:file:./data/adaplus;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL", "sa", "")
    def stmt = conn.createStatement()
    def rs = stmt.executeQuery("SELECT id, title, status, active FROM LISTINGS")
    while(rs.next()) {
        println "ID: " + rs.getString("id") + " Title: " + rs.getString("title") + " Status: " + rs.getString("status") + " Active: " + rs.getBoolean("active")
    }
    conn.close()
} catch(Exception e) {
    println "Error: " + e.getMessage()
}
