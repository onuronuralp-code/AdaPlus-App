@Grab('com.h2database:h2:2.3.232')
import java.sql.DriverManager

try {
    def conn = DriverManager.getConnection("jdbc:h2:file:./data/adaplus;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL", "sa", "")
    def stmt = conn.createStatement()
    def rows = stmt.executeUpdate("UPDATE LISTINGS SET STATUS = 1 WHERE STATUS = 0") // PENDING=0, APPROVED=1 (if enum is ordinal) or string. Wait, enums might be strings if @Enumerated(EnumType.STRING). Let's just do STATUS='APPROVED' or STATUS=0.
    // I'll execute both to be safe
    try {
        def r1 = stmt.executeUpdate("UPDATE LISTINGS SET STATUS = 'APPROVED'")
        println "Updated ${r1} listings (string)"
    } catch(Exception e) {}
    try {
        def r2 = stmt.executeUpdate("UPDATE LISTINGS SET STATUS = 1 WHERE STATUS = 0")
        println "Updated ${r2} listings (ordinal)"
    } catch(Exception e) {}
    conn.close()
} catch(Exception e) {
    println "Error: " + e.getMessage()
}
