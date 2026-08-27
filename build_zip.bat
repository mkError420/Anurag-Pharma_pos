@echo off
echo =======================================================
echo Preparing Production Packages for cPanel Deployment...
echo Domain: https://anuragpharma.top/
echo =======================================================

if exist "cpanel_upload_ready.tar.gz" del "cpanel_upload_ready.tar.gz"
if exist "cpanel_upload_ready.zip" del "cpanel_upload_ready.zip"

echo Creating cpanel_upload_ready.tar.gz...
tar -czvf cpanel_upload_ready.tar.gz backend frontend/dist uploads database .htaccess index.php

echo Creating cpanel_upload_ready.zip...
tar -a -cf cpanel_upload_ready.zip backend frontend/dist uploads database .htaccess index.php

echo.
echo =======================================================
echo SUCCESS! Created:
echo  1. cpanel_upload_ready.zip
echo  2. cpanel_upload_ready.tar.gz
echo Upload either archive to your cPanel /public_html folder.
echo =======================================================
pause

