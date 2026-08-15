import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

const PAYMENT_METHODS = ['bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Card', 'Cash'];

export default function ContactInformation() {
  const [contactInfo, setContactInfo] = useState({
    email_addresses: [],
    phone_numbers: [],
    payment_numbers: [],
    address: '',
    business_hours: {
      saturday_thursday: '',
      friday: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchContactInformation();
  }, []);

  const fetchContactInformation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/contact-information`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setContactInfo({
          ...data,
          payment_numbers: data.payment_numbers || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch contact information:', err);
      setError('Failed to load contact information');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    setContactInfo({ ...contactInfo, email_addresses: [...contactInfo.email_addresses, ''] });
  };
  const handleRemoveEmail = (index) => {
    setContactInfo({ ...contactInfo, email_addresses: contactInfo.email_addresses.filter((_, i) => i !== index) });
  };
  const handleEmailChange = (index, value) => {
    const newEmails = [...contactInfo.email_addresses];
    newEmails[index] = value;
    setContactInfo({ ...contactInfo, email_addresses: newEmails });
  };

  const handleAddPhone = () => {
    setContactInfo({ ...contactInfo, phone_numbers: [...contactInfo.phone_numbers, ''] });
  };
  const handleRemovePhone = (index) => {
    setContactInfo({ ...contactInfo, phone_numbers: contactInfo.phone_numbers.filter((_, i) => i !== index) });
  };
  const handlePhoneChange = (index, value) => {
    const newPhones = [...contactInfo.phone_numbers];
    newPhones[index] = value;
    setContactInfo({ ...contactInfo, phone_numbers: newPhones });
  };

  // Payment Numbers
  const handleAddPayment = () => {
    setContactInfo({
      ...contactInfo,
      payment_numbers: [...contactInfo.payment_numbers, { method: 'bKash', number: '', account_name: '' }]
    });
  };
  const handleRemovePayment = (index) => {
    setContactInfo({ ...contactInfo, payment_numbers: contactInfo.payment_numbers.filter((_, i) => i !== index) });
  };
  const handlePaymentChange = (index, field, value) => {
    const updated = [...contactInfo.payment_numbers];
    updated[index] = { ...updated[index], [field]: value };
    setContactInfo({ ...contactInfo, payment_numbers: updated });
  };

  const handleBusinessHoursChange = (field, value) => {
    setContactInfo({
      ...contactInfo,
      business_hours: { ...contactInfo.business_hours, [field]: value }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contact-information`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(contactInfo)
      });
      if (response.ok) {
        setSuccess('Contact information updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update contact information');
      }
    } catch (err) {
      setError('Failed to update contact information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
      </div>
    );
  }

  const sectionCard = "bg-white p-6 rounded-xl border border-gray-200 shadow-sm";
  const inputCls = "flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900";
  const removeBtnCls = "px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors font-medium";
  const addBtnCls = "px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors font-medium";

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contact Information Management</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage contact details and payment numbers displayed on the website's subscription modal.</p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">{error}</p></div>}
      {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg"><p className="text-green-700 text-sm">{success}</p></div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Email Addresses */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Email Addresses</h2>
            <button type="button" onClick={handleAddEmail} className={addBtnCls}>+ Add Email</button>
          </div>
          <div className="space-y-2">
            {contactInfo.email_addresses.map((email, index) => (
              <div key={index} className="flex gap-2">
                <input type="email" value={email} onChange={(e) => handleEmailChange(index, e.target.value)}
                  className={inputCls} placeholder="email@example.com" />
                {contactInfo.email_addresses.length > 1 && (
                  <button type="button" onClick={() => handleRemoveEmail(index)} className={removeBtnCls}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Phone Numbers */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Phone Numbers</h2>
            <button type="button" onClick={handleAddPhone} className={addBtnCls}>+ Add Phone</button>
          </div>
          <div className="space-y-2">
            {contactInfo.phone_numbers.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <input type="tel" value={phone} onChange={(e) => handlePhoneChange(index, e.target.value)}
                  className={inputCls} placeholder="+880 1700-000000" />
                {contactInfo.phone_numbers.length > 1 && (
                  <button type="button" onClick={() => handleRemovePhone(index)} className={removeBtnCls}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Numbers — shown in subscription modal */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-base font-semibold text-gray-900">💳 Payment Numbers</h2>
              <p className="text-xs text-gray-500 mt-0.5">These will appear in the subscription form so users know where to send payment.</p>
            </div>
            <button type="button" onClick={handleAddPayment} className={addBtnCls}>+ Add</button>
          </div>
          <div className="space-y-3 mt-4">
            {contactInfo.payment_numbers.length === 0 && (
              <p className="text-sm text-gray-400 italic">No payment numbers added yet. Click "+ Add" to add one.</p>
            )}
            {contactInfo.payment_numbers.map((pn, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <select
                  value={pn.method}
                  onChange={(e) => handlePaymentChange(index, 'method', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900 bg-white w-full sm:w-36"
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="text"
                  value={pn.number || ''}
                  onChange={(e) => handlePaymentChange(index, 'number', e.target.value)}
                  placeholder="Account / Phone Number"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={pn.account_name || ''}
                  onChange={(e) => handlePaymentChange(index, 'account_name', e.target.value)}
                  placeholder="Account Name (optional)"
                  className={inputCls}
                />
                <button type="button" onClick={() => handleRemovePayment(index)} className={removeBtnCls}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        <div className={sectionCard}>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Address</h2>
          <textarea value={contactInfo.address} onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900 resize-none"
            rows={3} placeholder="123 Business Ave, Suite 100&#10;City, Country" />
        </div>

        {/* Business Hours */}
        <div className={sectionCard}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Business Hours</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saturday – Thursday</label>
              <input type="text" value={contactInfo.business_hours.saturday_thursday}
                onChange={(e) => handleBusinessHoursChange('saturday_thursday', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900"
                placeholder="9:00 AM – 6:00 PM" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Friday</label>
              <input type="text" value={contactInfo.business_hours.friday}
                onChange={(e) => handleBusinessHoursChange('friday', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900"
                placeholder="Closed" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

