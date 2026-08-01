@echo off
echo Generating clean tar.gz file for cPanel...
if exist "cpanel_upload_ready.tar.gz" del "cpanel_upload_ready.tar.gz"

tar -czvf cpanel_upload_ready.tar.gz backend frontend/dist .htaccess

echo.
echo =======================================================
echo SUCCESS! Created 'cpanel_upload_ready.tar.gz'
echo Upload THIS file to your cPanel /public_html folder.
echo =======================================================
pause
