@echo off
title Run Customer Due Balance Migration
echo ==========================================
echo Running migration to recalculate customer due_balance...
echo ==========================================
C:\xampp\php\php.exe run_migration.php
echo.
echo Migration completed. Press any key to exit...
pause
