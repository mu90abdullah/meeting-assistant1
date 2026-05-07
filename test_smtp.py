import smtplib

try:
    server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10)
    server.set_debuglevel(1)
    server.login("mustafakamil190@gmail.com", "xtakxenkjomxegit")
    print("\n[+] SUCCESS: Local SMTP login worked!")
    server.quit()
except Exception as e:
    print(f"\n[-] FAILED: {e}")
