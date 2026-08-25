import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import ElectronicCashDrawerModal from './ElectronicCashDrawerModal';
import { useLanguage } from '../contexts/LanguageContext';

export default function Settings({ onNavigate = () => {} }) {
  const { t } = useLanguage();
  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = userObj.role === 'super_admin';

  // Active tab: 'shop' (Store Profile & POS) or 'account' (Admin Login & Security)
  const [activeTab, setActiveTab] = useState(
    isSuperAdmin ? 'account' : (window.location.hash === '#account' ? 'account' : 'shop')
  );

  // Shop Settings State (for shops table)
  const [shopFormData, setShopFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_rate: '10.00',
    logo: '',
    loyalty_enabled: false,
    loyalty_point_earn_rate: '100.00',
    loyalty_point_value: '1.00'
  });

  // Admin Account & Security State (for users table)
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    logo: ''
  });

  const [loading, setLoading] = useState(true);
  const [savingShop, setSavingShop] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDrawerModal, setShowDrawerModal] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Fetch Account info (/auth/me) for all users (Super Admin & Shop Admin)
      const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setAccountFormData({
          name: userData.name || '',
          email: userData.email || '',
          password: '',
          confirmPassword: '',
          logo: userData.logo || ''
        });
      }

      // If not super admin, also fetch shop details (/shops/my-shop)
      if (!isSuperAdmin) {
        const shopRes = await fetch(`${API_BASE_URL}/shops/my-shop`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (shopRes.ok) {
          const shopData = await shopRes.json();
          setShopFormData({
            name: shopData.name || '',
            email: shopData.email || '',
            phone: shopData.phone || '',
            address: shopData.address || '',
            tax_rate: shopData.tax_rate !== undefined ? String(shopData.tax_rate) : '10.00',
            logo: shopData.logo || '',
            loyalty_enabled: shopData.loyalty_enabled === 1 || shopData.loyalty_enabled === true,
            loyalty_point_earn_rate: shopData.loyalty_point_earn_rate !== undefined ? String(shopData.loyalty_point_earn_rate) : '100.00',
            loyalty_point_value: shopData.loyalty_point_value !== undefined ? String(shopData.loyalty_point_value) : '1.00'
          });
        }
      }
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleShopInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setShopFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAccountInputChange = (e) => {
    const { name, value } = e.target;
    setAccountFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e, target = 'shop') => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      triggerAlert('error', 'Source image must be less than 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/png');
        if (target === 'shop') {
          setShopFormData(prev => ({ ...prev, logo: compressedBase64 }));
        } else {
          setAccountFormData(prev => ({ ...prev, logo: compressedBase64 }));
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (target = 'shop') => {
    if (target === 'shop') {
      setShopFormData(prev => ({ ...prev, logo: '' }));
    } else {
      setAccountFormData(prev => ({ ...prev, logo: '' }));
    }
  };

  // Submit Shop Settings (shops table)
  const handleShopSubmit = async (e) => {
    e.preventDefault();
    if (!shopFormData.name || !shopFormData.email) {
      triggerAlert('error', 'Shop display name and store email are required.');
      return;
    }

    setSavingShop(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shops/my-shop`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: shopFormData.name,
          email: shopFormData.email,
          phone: shopFormData.phone,
          address: shopFormData.address,
          tax_rate: shopFormData.tax_rate,
          logo: shopFormData.logo,
          loyalty_enabled: shopFormData.loyalty_enabled ? 1 : 0,
          loyalty_point_earn_rate: shopFormData.loyalty_point_earn_rate,
          loyalty_point_value: shopFormData.loyalty_point_value
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update shop settings.');

      triggerAlert('success', 'Shop settings saved successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setSavingShop(false);
    }
  };

  // Submit Account & Login Security Settings (users table / auth/me)
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    if (!accountFormData.name || !accountFormData.email) {
      triggerAlert('error', 'Admin name and login email are required.');
      return;
    }

    if (accountFormData.password) {
      if (accountFormData.password.length < 6) {
        triggerAlert('error', 'Password must be at least 6 characters long.');
        return;
      }
      if (accountFormData.password !== accountFormData.confirmPassword) {
        triggerAlert('error', 'Passwords do not match.');
        return;
      }
    }

    setSavingAccount(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: accountFormData.name,
          email: accountFormData.email,
          password: accountFormData.password || undefined,
          logo: accountFormData.logo || undefined
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update admin account credentials.');

      // Update stored session token and user info
      if (resData.token && resData.user) {
        localStorage.setItem('token', resData.token);
        localStorage.setItem('user', JSON.stringify(resData.user));
      }

      setAccountFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));

      triggerAlert('success', 'Admin login email and credentials updated successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setSavingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {alert && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center transition-all ${
          alert.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          <span className="text-sm font-semibold">{alert.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isSuperAdmin ? 'Account & System Settings' : t('settings', 'Settings & Configuration')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isSuperAdmin
            ? 'Configure super administrator credentials and system branding'
            : 'Manage your store profile, POS hardware, and admin dashboard login credentials'}
        </p>
      </div>

      {/* Tab Navigation for Shop Admin */}
      {!isSuperAdmin && (
        <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'shop'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>🏬</span>
            <span>{t('store_settings', 'Store & POS Settings')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'account'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>🔐</span>
            <span>{t('admin_credentials', 'Admin Login & Security')}</span>
          </button>
        </div>
      )}

      {/* TAB 1: Store & POS Configuration */}
      {!isSuperAdmin && activeTab === 'shop' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs">
          <div className="mb-5 pb-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Store Profile & Invoice Details</h3>
            <p className="text-xs text-slate-400">These details appear on printed invoices, customer receipts, and store listings.</p>
          </div>

          <form onSubmit={handleShopSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Shop Display Name *
              </label>
              <input
                type="text"
                name="name"
                value={shopFormData.name}
                onChange={handleShopInputChange}
                required
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Metro Super Store"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Official Store Contact Email *
              </label>
              <input
                type="email"
                name="email"
                value={shopFormData.email}
                onChange={handleShopInputChange}
                required
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                placeholder="store@example.com"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Displayed on customer receipts & invoice headers.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={shopFormData.phone}
                onChange={handleShopInputChange}
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. +880 1700-000000"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Store Physical Address
              </label>
              <textarea
                name="address"
                rows="3"
                value={shopFormData.address}
                onChange={handleShopInputChange}
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. 123 Main Street, Suite 400, Dhaka"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Sales Tax Rate (%) *
              </label>
              <input
                type="number"
                name="tax_rate"
                step="0.01"
                min="0"
                max="100"
                required
                value={shopFormData.tax_rate}
                onChange={handleShopInputChange}
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. 10.00"
              />
            </div>

            {/* Loyalty Program Settings Section */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-5 mt-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Customer Loyalty Points Program</h3>
              <p className="text-xs text-slate-400 mb-4">Configure custom loyalty points for customer spending and redemption.</p>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="loyalty_enabled"
                    name="loyalty_enabled"
                    checked={shopFormData.loyalty_enabled || false}
                    onChange={handleShopInputChange}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="loyalty_enabled" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Enable Loyalty Points Program
                  </label>
                </div>

                {shopFormData.loyalty_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Earn Rate (Spent per Point) *
                      </label>
                      <input
                        type="number"
                        name="loyalty_point_earn_rate"
                        step="0.01"
                        min="1"
                        required={shopFormData.loyalty_enabled}
                        value={shopFormData.loyalty_point_earn_rate}
                        onChange={handleShopInputChange}
                        className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. 100.00"
                      />
                      <span className="text-[10px] text-slate-400">Customer earns 1 point for every N spent.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Redemption Value (per Point) *
                      </label>
                      <input
                        type="number"
                        name="loyalty_point_value"
                        step="0.01"
                        min="0.01"
                        required={shopFormData.loyalty_enabled}
                        value={shopFormData.loyalty_point_value}
                        onChange={handleShopInputChange}
                        className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. 1.00"
                      />
                      <span className="text-[10px] text-slate-400">Monetary discount value of 1 loyalty point.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Electronic Cash Drawer Section */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-50/70 via-slate-50 to-amber-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Electronic Cash Drawer & Hardware Solenoid</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ESC/POS Auto-kick pulse on cash receipt print, 3-position lock & float management.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDrawerModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <span>⚡ Configure & Test Drawer</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            {/* Store Brand Logo */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Store Brand Logo
              </label>
              <div className="mt-2 flex items-center space-x-5">
                {shopFormData.logo ? (
                  <img
                    src={shopFormData.logo}
                    alt="Brand Logo Preview"
                    className="w-16 h-16 rounded-xl object-contain bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs uppercase shrink-0">
                    No Logo
                  </div>
                )}
                <div className="flex flex-col space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="shop-logo-upload-input"
                    onChange={(e) => handleLogoChange(e, 'shop')}
                    className="hidden"
                  />
                  <div className="flex space-x-2">
                    <label
                      htmlFor="shop-logo-upload-input"
                      className="cursor-pointer bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-xs shadow-xs transition-colors"
                    >
                      Choose Image
                    </label>
                    {shopFormData.logo && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLogo('shop')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2 px-4 border border-rose-200 rounded-xl text-xs transition-colors"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">PNG, JPG, or SVG. Max size 15MB (automatically compressed).</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                type="submit"
                disabled={savingShop}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-colors flex items-center space-x-2"
              >
                {savingShop ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <span>Save Store Settings</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Admin Account & Security (Available for Shop Admin & Super Admin) */}
      {(isSuperAdmin || activeTab === 'account') && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs">
          <div className="mb-5 pb-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isSuperAdmin ? 'Super Administrator Credentials' : 'Shop Admin Login & Password'}
            </h3>
            <p className="text-xs text-slate-400">
              {isSuperAdmin
                ? 'Update your master system administrator profile and login password.'
                : 'Change your shop admin login email address, name, and login password for this POS dashboard.'}
            </p>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Admin Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={accountFormData.name}
                onChange={handleAccountInputChange}
                required
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Shop Manager"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Your personal display name shown on your dashboard.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Dashboard Login Email *
              </label>
              <input
                type="email"
                name="email"
                value={accountFormData.email}
                onChange={handleAccountInputChange}
                required
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                placeholder="admin@yourshop.com"
              />
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 block font-medium">
                🔑 This email is used to log in to the shop admin dashboard.
              </span>
            </div>

            {/* Change Password Section */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-5 mt-5">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Change Password</h4>
              <p className="text-xs text-slate-400 mb-4">Leave password fields blank if you only want to update your name or login email.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={accountFormData.password}
                      onChange={handleAccountInputChange}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="At least 6 characters (leave empty to keep unchanged)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={accountFormData.confirmPassword}
                      onChange={handleAccountInputChange}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Must match new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Avatar / Logo for Super Admin */}
            {isSuperAdmin && (
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Brand Logo / Avatar
                </label>
                <div className="mt-2 flex items-center space-x-5">
                  {accountFormData.logo ? (
                    <img
                      src={accountFormData.logo}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-xl object-contain bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs uppercase shrink-0">
                      No Logo
                    </div>
                  )}
                  <div className="flex flex-col space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="account-logo-upload-input"
                      onChange={(e) => handleLogoChange(e, 'account')}
                      className="hidden"
                    />
                    <div className="flex space-x-2">
                      <label
                        htmlFor="account-logo-upload-input"
                        className="cursor-pointer bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-xs shadow-xs transition-colors"
                      >
                        Choose Image
                      </label>
                      {accountFormData.logo && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLogo('account')}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2 px-4 border border-rose-200 rounded-xl text-xs transition-colors"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                type="submit"
                disabled={savingAccount}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-colors flex items-center space-x-2"
              >
                {savingAccount ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <span>Update Admin Credentials</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Electronic Cash Drawer Configuration & Simulator Modal */}
      <ElectronicCashDrawerModal
        isOpen={showDrawerModal}
        onClose={() => setShowDrawerModal(false)}
        initialTab="settings"
      />
    </div>
  );
}