import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

export default function Attendance({ onNavigate, user }) {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'archive'
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteAction, setNoteAction] = useState(null); // 'check-in' or 'check-out'
  const [noteText, setNoteText] = useState('');

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

  const fetchTodayAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/attendance/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(Array.isArray(data) ? data : (data ? [data] : []));
      }
    } catch (err) {
      console.error('Error fetching today attendance:', err);
    }
  };

  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const archived = activeTab === 'archive' ? '1' : '0';
      const startDate = new Date().toISOString().split('T')[0].slice(0, 7) + '-01';
      const endDate = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${API_BASE_URL}/attendance/my?start_date=${startDate}&end_date=${endDate}&archived=${archived}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch attendance records.');
      const data = await response.json();
      setMyAttendance(data);
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
    fetchMyAttendance();
  }, [activeTab]);

  const handleCheckIn = () => {
    setNoteAction('check-in');
    setNoteText('');
    setShowNoteModal(true);
  };

  const handleCheckOut = () => {
    setNoteAction('check-out');
    setNoteText('');
    setShowNoteModal(true);
  };

  const confirmCheckIn = async () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          check_in_time: timeString,
          status: 'present',
          notes: noteText || null
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to check in.');

      triggerAlert('success', 'Checked in successfully!');
      setShowNoteModal(false);
      setNoteText('');
      fetchTodayAttendance();
      fetchMyAttendance();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const confirmCheckOut = async () => {
    // Find the most recent check-in without a check-out
    const pendingCheckIn = todayAttendance.find(a => a.check_in_time && !a.check_out_time);
    
    if (!pendingCheckIn) return;

    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: pendingCheckIn.date,
          check_out_time: timeString,
          notes: noteText || null
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to check out.');

      triggerAlert('success', 'Checked out successfully!');
      setShowNoteModal(false);
      setNoteText('');
      fetchTodayAttendance();
      fetchMyAttendance();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const handleDelete = async (attendanceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete attendance record.');

      triggerAlert('success', 'Attendance record deleted successfully!');
      fetchTodayAttendance();
      fetchMyAttendance();
      setDeleteConfirm(null);
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'absent':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      case 'late':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'half_day':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

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
          <h2 className="text-2xl font-bold text-slate-800">Attendance Management</h2>
          <p className="text-sm text-slate-500">Mark your daily attendance and view history</p>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Today's Attendance</h3>
        
        {todayAttendance.length > 0 ? (
          <div className="space-y-4">
            {todayAttendance.map((record, index) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${getStatusBadge(record.status)}`}>
                    Shift {index + 1}
                  </div>
                  <div className="text-sm text-slate-600">
                    {record.date}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {record.check_in_time && (
                    <div className="text-sm">
                      <span className="text-slate-500">Check-in:</span>{' '}
                      <span className="font-semibold text-slate-800">{record.check_in_time}</span>
                    </div>
                  )}
                  {record.check_out_time && (
                    <div className="text-sm">
                      <span className="text-slate-500">Check-out:</span>{' '}
                      <span className="font-semibold text-slate-800">{record.check_out_time}</span>
                    </div>
                  )}
                  {record.check_in_time && record.check_out_time && (
                    <div className="text-sm">
                      <span className="text-slate-500">Duration:</span>{' '}
                      <span className="font-semibold text-slate-800">{calculateWorkingHours(record.check_in_time, record.check_out_time)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="flex space-x-3">
              <button
                disabled={todayAttendance.some(a => a.check_in_time && !a.check_out_time)}
                onClick={handleCheckIn}
                className={`font-semibold py-2.5 px-5 rounded-xl text-sm shadow transition-colors ${
                  todayAttendance.some(a => a.check_in_time && !a.check_out_time)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {todayAttendance.some(a => a.check_in_time && !a.check_out_time) ? 'Checked In' : 'Check In'}
              </button>
              <button
                disabled={!todayAttendance.some(a => a.check_in_time && !a.check_out_time)}
                onClick={handleCheckOut}
                className={`font-semibold py-2.5 px-5 rounded-xl text-sm shadow transition-colors ${
                  !todayAttendance.some(a => a.check_in_time && !a.check_out_time)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                Check Out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-slate-500">No attendance marked for today</div>
            <button
              onClick={handleCheckIn}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm shadow transition-colors"
            >
              Check In
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'current'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Current Month
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'archive'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Archive
        </button>
      </div>

      {/* Attendance History */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">
            {activeTab === 'current' ? 'Attendance History (This Month)' : 'Archived Attendance Records'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Check Out</th>
                <th className="p-4">Total Hours</th>
                <th className="p-4">Notes</th>
                {user?.role === 'shop_admin' && <th className="p-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={user?.role === 'shop_admin' ? 7 : 6} className="p-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : myAttendance.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'shop_admin' ? 7 : 6} className="p-12 text-center text-slate-400">
                    No attendance records found for this month.
                  </td>
                </tr>
              ) : (
                myAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{record.date}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${getStatusBadge(record.status)}`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{record.check_in_time || '-'}</td>
                    <td className="p-4 text-slate-600">{record.check_out_time || '-'}</td>
                    <td className="p-4 text-slate-600 font-semibold">{calculateWorkingHours(record.check_in_time, record.check_out_time)}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{record.notes || '-'}</td>
                    {user?.role === 'shop_admin' && (
                      <td className="p-4">
                        <button
                          onClick={() => setDeleteConfirm(record)}
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                          title="Delete attendance record"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Delete Attendance Record</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Are you sure you want to delete the attendance record for <span className="font-semibold">{deleteConfirm.date}</span>? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
              {noteAction === 'check-in' ? 'Check In' : 'Check Out'} - Add Note
            </h3>
            <p className="text-sm text-slate-600 text-center mb-4">
              Optionally add a note for your {noteAction === 'check-in' ? 'check-in' : 'check-out'}.
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note here (optional)..."
              className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              rows="3"
              maxLength="500"
            />
            <div className="flex justify-between items-center mt-2 mb-6">
              <span className="text-xs text-slate-400">{noteText.length}/500 characters</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={noteAction === 'check-in' ? confirmCheckIn : confirmCheckOut}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                {noteAction === 'check-in' ? 'Check In' : 'Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
