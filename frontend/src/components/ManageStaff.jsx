import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

const SECTION_OPTIONS = [
  { label: 'POS Checkout', path: '/checkout' },
  { label: 'Held Bills', path: '/held-bills' },
  { label: 'Sales History', path: '/sales' },
  { label: 'Manual Orders Entry', path: '/manual-orders' },
  { label: 'Inventory Catalog', path: '/products' },
  { label: 'Wastage Logs', path: '/wastage' },
  { label: 'Suppliers Directory', path: '/suppliers' },
  { label: 'Customer Directory', path: '/customers' },
  { label: 'Other Costs', path: '/other-cost' },
  { label: 'All Transactions', path: '/all-transactions' },
  { label: 'Total Revenue', path: '/total-revenue' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Manage Staff', path: '/staff' },
  { label: 'Settings', path: '/settings' }
];

export default function ManageStaff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' or 'attendance'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Attendance state
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceStartDate, setAttendanceStartDate] = useState(new Date().toISOString().split('T')[0].slice(0, 7) + '-01');
  const [attendanceEndDate, setAttendanceEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');
  const [attendanceArchiveTab, setAttendanceArchiveTab] = useState('current'); // 'current' or 'archive'
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [deleteAttendanceConfirm, setDeleteAttendanceConfirm] = useState(null);
  const [attendanceFormData, setAttendanceFormData] = useState({
    date: '',
    status: 'present',
    check_in_time: '',
    check_out_time: '',
    notes: ''
  });

  useEffect(() => {
    if (!showAddModal) setShowAddPassword(false);
  }, [showAddModal]);

  useEffect(() => {
    if (!showEditModal) setShowEditPassword(false);
  }, [showEditModal]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'shop_staff',
    status: 'active',
    allowed_sections: []
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve staff catalog.');
      const data = await response.json();
      setStaffList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const token = localStorage.getItem('token');
      const archived = attendanceArchiveTab === 'archive' ? '1' : '0';
      let url = `${API_BASE_URL}/attendance?start_date=${attendanceStartDate}&end_date=${attendanceEndDate}&archived=${archived}`;
      if (selectedStaffFilter) {
        url += `&user_id=${selectedStaffFilter}`;
      }
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve attendance records.');
      const data = await response.json();
      setAttendanceList(data);
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab, attendanceStartDate, attendanceEndDate, selectedStaffFilter, attendanceArchiveTab]);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-';
    
    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);
    
    const inDate = new Date();
    inDate.setHours(inHours, inMinutes, 0);
    
    const outDate = new Date();
    outDate.setHours(outHours, outMinutes, 0);
    
    const diffMs = outDate - inDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0 && diffMinutes === 0) return '0h';
    if (diffHours === 0) return `${diffMinutes}m`;
    if (diffMinutes === 0) return `${diffHours}h`;
    return `${diffHours}h ${diffMinutes}m`;
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      triggerAlert('error', 'Please fill in all fields.');
      return;
    }

    if (formData.role === 'shop_staff' && (!formData.allowed_sections || formData.allowed_sections.length === 0)) {
      triggerAlert('error', 'Please select at least one allowed section for staff access control.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          allowed_sections: formData.allowed_sections
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to register staff.');

      triggerAlert('success', 'Staff account created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchStaff();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const openEdit = (staff) => {
    setCurrentStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      status: staff.status,
      password: '', // Don't preload hash password
      allowed_sections: staff.allowed_sections || []
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (formData.role === 'shop_staff' && (!formData.allowed_sections || formData.allowed_sections.length === 0)) {
      triggerAlert('error', 'Please select at least one allowed section for staff access control.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        allowed_sections: formData.allowed_sections
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(`${API_BASE_URL}/users/staff/${currentStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update account.');

      triggerAlert('success', 'Staff account updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchStaff();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff user account?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/staff/${staffId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete account.');

      triggerAlert('success', 'Staff user deleted successfully!');
      fetchStaff();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const openEditAttendance = (record) => {
    setEditingAttendance(record);
    setAttendanceFormData({
      date: record.date,
      status: record.status,
      check_in_time: record.check_in_time || '',
      check_out_time: record.check_out_time || '',
      notes: record.notes || ''
    });
    setShowEditAttendanceModal(true);
  };

  const handleAttendanceUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: editingAttendance.user_id,
          date: attendanceFormData.date,
          status: attendanceFormData.status,
          check_in_time: attendanceFormData.check_in_time,
          check_out_time: attendanceFormData.check_out_time,
          notes: attendanceFormData.notes
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update attendance.');

      triggerAlert('success', 'Attendance updated successfully!');
      setShowEditAttendanceModal(false);
      setEditingAttendance(null);
      fetchAttendance();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const handleDeleteAttendance = async (attendanceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete attendance record.');

      triggerAlert('success', 'Attendance record deleted successfully!');
      fetchAttendance();
      setDeleteAttendanceConfirm(null);
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'shop_staff',
      status: 'active',
      allowed_sections: []
    });
    setCurrentSupplier(null);
  };

  const setCurrentSupplier = (val) => {}; // placeholder

  return (
    <div className="space-y-6">
      
      {alert && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center transition-all ${
          alert.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          <span className="text-sm font-semibold">{alert.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manage Shop Staff</h2>
          <p className="text-sm text-slate-500">Provide POS terminals access permissions, roles, and status keys</p>
        </div>
        {activeTab === 'staff' && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="bg-slate-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm shadow transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Register New Staff</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'staff'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Staff Directory
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'attendance'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Attendance Records
        </button>
      </div>

      {activeTab === 'staff' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Access Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-400">
                      No staff records found. Register cashiers to start.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{staff.name}</td>
                      <td className="p-4 text-slate-600 font-mono text-xs">{staff.email}</td>
                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold w-max ${
                            staff.role === 'shop_admin'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            {staff.role === 'shop_admin' ? 'Shop Admin' : 'Shop Staff'}
                          </span>
                          {staff.role === 'shop_staff' && (
                            <div className="flex flex-wrap gap-1 max-w-xs pt-1">
                              {staff.allowed_sections && staff.allowed_sections.length > 0 ? (
                                staff.allowed_sections.map(path => {
                                  const matched = SECTION_OPTIONS.find(o => o.path === path);
                                  return (
                                    <span key={path} className="text-[9px] bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded border border-slate-205 font-medium">
                                      {matched ? matched.label : path}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">No Access</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          staff.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => openEdit(staff)}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs border border-indigo-100 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(staff.id)}
                          className="text-rose-600 hover:text-rose-900 font-semibold text-xs border border-rose-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Staff Attendance Records</h3>
              <div className="flex items-center space-x-3">
                <select
                  value={selectedStaffFilter}
                  onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Staff</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={attendanceStartDate}
                  onChange={(e) => setAttendanceStartDate(e.target.value)}
                  className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="date"
                  value={attendanceEndDate}
                  onChange={(e) => setAttendanceEndDate(e.target.value)}
                  className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* Archive Tab Navigation */}
            <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setAttendanceArchiveTab('current')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
                  attendanceArchiveTab === 'current'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Current Month
              </button>
              <button
                onClick={() => setAttendanceArchiveTab('archive')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
                  attendanceArchiveTab === 'archive'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Archive
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-4">Staff Name</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Check In</th>
                  <th className="p-4">Check Out</th>
                  <th className="p-4">Total Hours</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {attendanceLoading ? (
                  <tr>
                    <td colSpan="8" className="p-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-12 text-center text-slate-400">
                      No attendance records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{record.user_name}</td>
                      <td className="p-4 text-slate-600">{record.date}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          record.status === 'present'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : record.status === 'absent'
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : record.status === 'late'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{record.check_in_time || '-'}</td>
                      <td className="p-4 text-slate-600">{record.check_out_time || '-'}</td>
                      <td className="p-4 text-slate-600 font-semibold">{calculateWorkingHours(record.check_in_time, record.check_out_time)}</td>
                      <td className="p-4 text-slate-600 max-w-xs truncate">{record.notes || '-'}</td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => openEditAttendance(record)}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs border border-indigo-100 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteAttendanceConfirm(record)}
                          className="text-rose-600 hover:text-rose-900 font-semibold text-xs border border-rose-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Register New Staff</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Employee Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Bob Smith"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="bob@shop.com"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Password *</label>
                <div className="relative">
                  <input
                    type={showAddPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="••••••••"
                    className="w-full border border-slate-200 rounded-lg p-2.5 pr-10 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showAddPassword ? "Hide password" : "Show password"}
                  >
                    {showAddPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Access Level Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="shop_staff">Shop Staff (Custom Permissions)</option>
                  <option value="shop_admin">Shop Admin (Full catalog control)</option>
                </select>
              </div>

              {formData.role === 'shop_staff' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Allowed Sections (Access Control) *</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 max-h-48 overflow-y-auto">
                    {SECTION_OPTIONS.map((sec) => {
                      const isChecked = formData.allowed_sections?.includes(sec.path);
                      return (
                        <label key={sec.path} className="flex items-center space-x-2.5 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...(formData.allowed_sections || []), sec.path]
                                : (formData.allowed_sections || []).filter((p) => p !== sec.path);
                              setFormData({ ...formData, allowed_sections: updated });
                            }}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-700 font-medium">{sec.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex space-x-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow"
                >
                  Register Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Edit Account: {currentStaff?.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Employee Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Access Level Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="shop_staff">Shop Staff (Custom Permissions)</option>
                  <option value="shop_admin">Shop Admin (Full catalog control)</option>
                </select>
              </div>

              {formData.role === 'shop_staff' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Allowed Sections (Access Control) *</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 max-h-48 overflow-y-auto">
                    {SECTION_OPTIONS.map((sec) => {
                      const isChecked = formData.allowed_sections?.includes(sec.path);
                      return (
                        <label key={sec.path} className="flex items-center space-x-2.5 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...(formData.allowed_sections || []), sec.path]
                                : (formData.allowed_sections || []).filter((p) => p !== sec.path);
                              setFormData({ ...formData, allowed_sections: updated });
                            }}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-700 font-medium">{sec.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Code *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active (Access allowed)</option>
                  <option value="inactive">Inactive (Access suspended)</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reset Password</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave blank to keep current password"
                    className="w-full border border-slate-200 rounded-lg p-2 pr-10 text-xs bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showEditPassword ? "Hide password" : "Show password"}
                  >
                    {showEditPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex space-x-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ATTENDANCE MODAL */}
      {showEditAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Edit Attendance Record</h3>
              <button onClick={() => setShowEditAttendanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAttendanceUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Staff Member</label>
                <input
                  type="text"
                  value={editingAttendance?.user_name || ''}
                  disabled
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 text-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={attendanceFormData.date}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, date: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status *</label>
                <select
                  name="status"
                  value={attendanceFormData.status}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, status: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Check In Time</label>
                <input
                  type="time"
                  name="check_in_time"
                  value={attendanceFormData.check_in_time}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, check_in_time: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Check Out Time</label>
                <input
                  type="time"
                  name="check_out_time"
                  value={attendanceFormData.check_out_time}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, check_out_time: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={attendanceFormData.notes}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, notes: e.target.value })}
                  rows="3"
                  placeholder="Optional notes..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex space-x-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditAttendanceModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow"
                >
                  Update Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ATTENDANCE CONFIRMATION MODAL */}
      {deleteAttendanceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Delete Attendance Record</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Are you sure you want to delete the attendance record for <span className="font-semibold">{deleteAttendanceConfirm.user_name}</span> on <span className="font-semibold">{deleteAttendanceConfirm.date}</span>? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteAttendanceConfirm(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAttendance(deleteAttendanceConfirm.id)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
