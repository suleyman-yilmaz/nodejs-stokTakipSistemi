Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c ""C:\nodejs-stokTakipSistemi\server_start.bat""", 0, False
Set WshShell = Nothing