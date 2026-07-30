import React, { useState, useEffect } from 'react';
import Investments from './Investments';

export default function InvestmentPage() {
  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = userObj.role === 'super_admin';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Set default date range to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Investment & Capital Management</h2>
          <p className="text-sm text-slate-500">Track capital injections, withdrawals, and reinvestments</p>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Investment Section */}
      <Investments startDate={startDate} endDate={endDate} />
    </div>
  );
}
