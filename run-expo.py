import pty
import os
import sys
import select
import time

def auto_answer_yes(cmd):
    master, slave = pty.openpty()
    
    pid = os.fork()
    if pid == 0:
        # Child process
        os.setsid()
        os.dup2(slave, 0)
        os.dup2(slave, 1)
        os.dup2(slave, 2)
        if slave > 2:
            os.close(slave)
        os.close(master)
        os.execvp(cmd[0], cmd)
    else:
        # Parent process
        os.close(slave)
        try:
            while True:
                r, w, e = select.select([master], [], [], 0.5)
                if master in r:
                    output = os.read(master, 1024)
                    if not output:
                        break
                    out_str = output.decode('utf-8', errors='replace')
                    sys.stdout.write(out_str)
                    sys.stdout.flush()
                    if "Install the recommended Expo Go version?" in out_str:
                        os.write(master, b"y\n")
                else:
                    pass
        except OSError:
            pass
        finally:
            os.waitpid(pid, 0)

if __name__ == '__main__':
    auto_answer_yes(["npx", "expo", "start", "--ios", "--port", "8082"])
