# cPanel Deployment Guide for https://anuragpharma.top/

This guide outlines the exact step-by-step process to deploy your application to your cPanel hosting at `https://anuragpharma.top/`.

---

## 📋 Credentials Summary

- **Live URL:** `https://anuragpharma.top/`
- **Database Server / Host:** `sdb-96.hosting.stackcp.net`
- **Database Name:** `anuragpos-353134317baa`
- **Database Username:** `anuragpos-353134317baa`
- **Database Password:** `anurag123456@#$`
- **Default POS Admin Login:**
  - **Username / Email:** `pos_user` (or `pos_user@anuragpharma.top`)
  - **Password:** `anurag@#$`

---

## 🚀 Step 1: Upload Files to cPanel

1. Log into your **cPanel** (or StackCP dashboard).
2. Go to **File Manager**.
3. Open your root web directory:
   - For main domain `anuragpharma.top`, open `/public_html/` (or `htdocs`).
   - If there are default placeholder files (like `default.html` or `index.html` from the host), delete them.
4. Click **Upload** at the top bar.
5. Select and upload the ready-made archive:
   - **`cpanel_upload_ready.zip`** (or `cpanel_upload_ready.tar.gz`)
6. Once uploaded, right-click `cpanel_upload_ready.zip` in File Manager and click **Extract**.
7. Confirm that the extracted structure in `public_html` looks like this:
   ```text
   public_html/
   ├── backend/
   │   ├── config/
   │   │   └── db.php
   │   ├── controllers/
   │   ├── middleware/
   │   └── index.php
   ├── frontend/
   │   └── dist/
   │       ├── assets/
   │       └── index.html
   ├── uploads/
   ├── database/
   ├── .htaccess
   └── index.php
   ```

---

## 🗄️ Step 2: Database Setup (phpMyAdmin)

1. In your cPanel dashboard, open **phpMyAdmin**.
2. Select your database: `anuragpos-353134317baa`.
3. Click on the **Import** tab at the top.
4. Click **Choose File** and select either:
   - `database/schema.sql` (for fresh database with default super admin and pos_user)
   - OR `database/if0_42333746_mk_pos.sql` (if you want to restore full existing data)
5. Click **Import** (or **Go**) at the bottom.
6. *Note:* The backend automatically performs any missing table/column migrations and ensures admin access on the first API request!

---

## ⚙️ Step 3: PHP Version & Extensions Check

1. In cPanel, go to **Select PHP Version** or **MultiPHP Manager**.
2. Ensure **PHP 7.4, 8.0, 8.1, 8.2, or 8.3** is active.
3. Ensure these standard extensions are enabled:
   - `pdo_mysql`
   - `json`
   - `mbstring`
   - `fileinfo`

---

## 🔒 Step 4: SSL Certificate (HTTPS)

1. In cPanel, go to **SSL/TLS Status** or **Let's Encrypt SSL**.
2. Run **AutoSSL** or issue a free SSL certificate for `anuragpharma.top` and `www.anuragpharma.top`.
3. Ensure "Force HTTPS Redirect" is enabled.

---

## ✅ Step 5: Test Your Live Site

1. Open your browser and visit: **[https://anuragpharma.top/](https://anuragpharma.top/)**
2. You should see the login interface.
3. Log in with:
   - **Email / Username:** `pos_user` (or `pos_user@anuragpharma.top`)
   - **Password:** `anurag@#$`
4. You can also test the backend API health check directly at:
   - `https://anuragpharma.top/backend/index.php` or `https://anuragpharma.top/backend/api/settings`
