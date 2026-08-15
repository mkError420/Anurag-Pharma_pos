import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [formData, setFormData] = useState({
    plan_id: '',
    plan_name: '',
    price: '',
    currency: 'BDT',
    billing_period: 'month',
    subscriber_name: '',
    shop_name: '',
    email: '',
    phone: '',
    payment_method: 'bKash',
    transaction_id: '',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    admin_notes: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, [statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all' 
        ? `${API_BASE_URL}/subscriptions`
        : `${API_BASE_URL}/subscriptions?status=${statusFilter}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      } else {
        setError('Failed to load subscriptions');
      }
    } catch (err) {
      console.error('Fetch subscriptions error:', err);
      setError('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/public/pricing-plans`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (err) {
      console.error('Failed to fetch plans for dropdown:', err);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedSubscription(null);
    setIsEditing(false);
    setFormData({
      plan_id: plans[0]?.id || '',
      plan_name: plans[0]?.name || 'Standard Plan',
      price: plans[0]?.price || 1500,
      currency: plans[0]?.currency || 'BDT',
      billing_period: plans[0]?.billing_period || 'month',
      subscriber_name: '',
      shop_name: '',
      email: '',
      phone: '',
      payment_method: 'bKash',
      transaction_id: '',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      admin_notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (sub) => {
    setSelectedSubscription(sub);
    setIsEditing(true);
    setFormData({
      plan_id: sub.plan_id || '',
      plan_name: sub.plan_name || '',
      price: sub.price || 0,
      currency: sub.currency || 'BDT',
      billing_period: sub.billing_period || 'month',
      subscriber_name: sub.subscriber_name || '',
      shop_name: sub.shop_name || '',
      email: sub.email || '',
      phone: sub.phone || '',
      payment_method: sub.payment_method || 'bKash',
      transaction_id: sub.transaction_id || '',
      status: sub.status || 'pending',
      start_date: sub.start_date || new Date().toISOString().split('T')[0],
      end_date: sub.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: sub.notes || '',
      admin_notes: sub.admin_notes || ''
    });
    setShowModal(true);
  };

  const handlePlanChange = (e) => {
    const selectedPlanId = e.target.value;
    const foundPlan = plans.find(p => p.id === parseInt(selectedPlanId));
    if (foundPlan) {
      setFormData({
        ...formData,
        plan_id: foundPlan.id,
        plan_name: foundPlan.name,
        price: foundPlan.price,
        currency: foundPlan.currency,
        billing_period: foundPlan.billing_period
      });
    } else {
      setFormData({ ...formData, plan_id: selectedPlanId });
    }
  };

  const handleQuickStatusChange = async (sub, newStatus) => {
    try {
      setError('');
      setSuccess('');
      
      const payload = {
        ...sub,
        status: newStatus
      };

      if (newStatus === 'active') {
        const today = new Date();
        payload.start_date = today.toISOString().split('T')[0];
        const addDays = sub.billing_period === 'year' ? 365 : (sub.billing_period === 'week' ? 7 : 30);
        const endDateObj = new Date(today.getTime() + addDays * 24 * 60 * 60 * 1000);
        payload.end_date = endDateObj.toISOString().split('T')[0];
      }

      const response = await fetch(`${API_BASE_URL}/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess(`Subscription status changed to ${newStatus}`);
        setTimeout(() => setSuccess(''), 3000);
        fetchSubscriptions();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update subscription status');
      }
    } catch (err) {
      setError('Failed to update subscription');
    }
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = isEditing
        ? `${API_BASE_URL}/subscriptions/${selectedSubscription.id}`
        : `${API_BASE_URL}/subscriptions`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess(isEditing ? 'Subscription updated successfully' : 'Subscription created successfully');
        setTimeout(() => setSuccess(''), 3000);
        setShowModal(false);
        fetchSubscriptions();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save subscription');
      }
    } catch (err) {
      setError('Error saving subscription record');
    }
  };

  const handleDeleteSubscription = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription record?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Subscription deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
        setSubscriptions(subscriptions.filter(s => s.id !== id));
      } else {
        setError('Failed to delete subscription');
      }
    } catch (err) {
      setError('Error deleting subscription');
    }
  };

  // Filter subscriptions based on search term
  const filteredSubscriptions = subscriptions.filter(sub => {
    const term = searchTerm.toLowerCase();
    return (
      (sub.subscriber_name && sub.subscriber_name.toLowerCase().includes(term)) ||
      (sub.shop_name && sub.shop_name.toLowerCase().includes(term)) ||
      (sub.email && sub.email.toLowerCase().includes(term)) ||
      (sub.phone && sub.phone.toLowerCase().includes(term)) ||
      (sub.plan_name && sub.plan_name.toLowerCase().includes(term)) ||
      (sub.transaction_id && sub.transaction_id.toLowerCase().includes(term))
    );
  });

  // Calculate statistics
  const stats = {
    total: subscriptions.length,
    pending: subscriptions.filter(s => s.status === 'pending').length,
    active: subscriptions.filter(s => s.status === 'active' || s.status === 'approved').length,
    rejectedExpired: subscriptions.filter(s => s.status === 'rejected' || s.status === 'expired').length,
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Pending Review</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
      case 'expired':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">Expired</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Management</h1>
          <p className="text-slate-500 text-sm">Monitor user plan subscriptions, pending requests, and manage activations</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Manual Subscription
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Subscriptions</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        <div className="p-5 bg-amber-50/70 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-700/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Pending Requests</div>
            <div className="text-3xl font-extrabold text-amber-900 dark:text-amber-300">{stats.pending}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="p-5 bg-emerald-50/70 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-700/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Active Subscriptions</div>
            <div className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-300">{stats.active}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="p-5 bg-rose-50/70 dark:bg-rose-900/20 rounded-2xl border border-rose-200 dark:border-rose-700/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">Rejected / Expired</div>
            <div className="text-3xl font-extrabold text-rose-900 dark:text-rose-300">{stats.rejectedExpired}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-800/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by subscriber, shop name, email, phone, or TRX ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase shrink-0">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800"></div>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Subscriptions Found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">There are no subscription records matching your filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Subscriber & Shop</th>
                  <th className="px-6 py-4">Plan & Price</th>
                  <th className="px-6 py-4">Payment & Trx</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Validity</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    
                    {/* Subscriber & Shop */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{sub.subscriber_name}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">{sub.shop_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{sub.email} • {sub.phone}</div>
                    </td>

                    {/* Plan & Price */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{sub.plan_name}</div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {sub.currency} {parseFloat(sub.price).toLocaleString()} <span className="text-slate-400 font-normal">/{sub.billing_period}</span>
                      </div>
                    </td>

                    {/* Payment & Trx */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{sub.payment_method || 'bKash'}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {sub.transaction_id ? (
                          <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                            TRX: {sub.transaction_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No Trx ID</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(sub.status)}
                    </td>

                    {/* Validity / Dates */}
                    <td className="px-6 py-4 text-xs">
                      {sub.start_date ? (
                        <div>
                          <div><span className="text-slate-400">Start:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{sub.start_date}</span></div>
                          <div><span className="text-slate-400">End:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{sub.end_date || 'N/A'}</span></div>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Pending Activation</span>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">
                        Req: {new Date(sub.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.status === 'pending' && (
                          <button
                            onClick={() => handleQuickStatusChange(sub, 'active')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                            title="Approve and activate subscription"
                          >
                            Approve
                          </button>
                        )}

                        {sub.status === 'pending' && (
                          <button
                            onClick={() => handleQuickStatusChange(sub, 'rejected')}
                            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
                            title="Reject request"
                          >
                            Reject
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDeleteSubscription(sub.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Create / Edit Subscription */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 my-8 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Subscription Details' : 'Create New Subscription'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Select Plan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Subscription Plan</label>
                  <select
                    value={formData.plan_id}
                    onChange={handlePlanChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.currency} {p.price}/{p.billing_period})
                      </option>
                    ))}
                    <option value="">Custom Plan</option>
                  </select>
                </div>

                {/* Custom Plan Name if needed */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                {/* Billing Period */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Billing Period</label>
                  <select
                    value={formData.billing_period}
                    onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                    <option value="week">Weekly</option>
                  </select>
                </div>

                {/* Subscriber Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Subscriber Full Name</label>
                  <input
                    type="text"
                    value={formData.subscriber_name}
                    onChange={(e) => setFormData({ ...formData, subscriber_name: e.target.value })}
                    required
                    placeholder="e.g. Tanvir Hasan"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                {/* Shop Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Shop / Business Name</label>
                  <input
                    type="text"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    required
                    placeholder="e.g. MK Fashion House"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="e.g. subscriber@example.com"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="e.g. +8801700000000"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                {/* Transaction ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Transaction ID / Reference</label>
                  <input
                    type="text"
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    placeholder="e.g. TRX98234123"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Subscription Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-semibold"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="active">Active</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Super Admin Notes</label>
                <textarea
                  rows="2"
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                  placeholder="Private internal notes for super admin..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
                >
                  {isEditing ? 'Save Changes' : 'Create Subscription'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
