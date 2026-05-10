import smtplib

import os
from config.settings import Settings

try:
    settings = Settings.load()
    server = smtplib.SMTP_SSL(settings.smtp_server, settings.smtp_port, timeout=15)
    server.set_debuglevel(1)
    server.login(settings.smtp_user, settings.smtp_password)
    print("\n[+] SUCCESS: Local SMTP login worked!")
    server.quit()
except Exception as e:
    print(f"\n[-] FAILED: {e}")
