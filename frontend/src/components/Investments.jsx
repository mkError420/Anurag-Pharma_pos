import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Investments({ startDate, endDate }) {
  const [investmentSummary, setInvestmentSummary] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingInvestment, setViewingInvestment] = useState(null);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [formData, setFormData] = useState({
    investment_type: 'capital_injection',
    amount: '',
    description: '',
    investor_name: '',
    investment_date: new Date().toISOString().split('T')[0]
  });

  const fetchInvestmentData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch summary
      let summaryUrl = `${API_BASE_URL}/investments/summary`;
      const summaryParams = [];
      if (startDate) summaryParams.push(`start_date=${startDate}`);
      if (endDate) summaryParams.push(`end_date=${endDate}`);
      if (summaryParams.length > 0) {
        summaryUrl += `?${summaryParams.join('&')}`;
      }

      const summaryResponse = await fetch(summaryUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setInvestmentSummary(summaryData);
      }

      // Fetch investments list
      let listUrl = `${API_BASE_URL}/investments`;
      const listParams = [];
      if (startDate) listParams.push(`start_date=${startDate}`);
      if (endDate) listParams.push(`end_date=${endDate}`);
      if (listParams.length > 0) {
        listUrl += `?${listParams.join('&')}`;
      }

      const listResponse = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (listResponse.ok) {
        const listData = await listResponse.json();
        setInvestments(listData);
      }
    } catch (err) {
      console.error('Failed to fetch investment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentData();
  }, [startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingInvestment 
        ? `${API_BASE_URL}/investments/${editingInvestment.id}`
        : `${API_BASE_URL}/investments`;
      
      const method = editingInvestment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setEditingInvestment(null);
        setFormData({
          investment_type: 'capital_injection',
          amount: '',
          description: '',
          investor_name: '',
          investment_date: new Date().toISOString().split('T')[0]
        });
        fetchInvestmentData();
      }
    } catch (err) {
      console.error('Failed to save investment:', err);
    }
  };

  const handleView = (investment) => {
    setViewingInvestment(investment);
    setShowViewModal(true);
  };

  const handleEdit = (investment) => {
    setEditingInvestment(investment);
    setFormData({
      investment_type: investment.investment_type,
      amount: investment.amount,
      description: investment.description || '',
      investor_name: investment.investor_name || '',
      investment_date: investment.investment_date
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/investments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchInvestmentData();
      }
    } catch (err) {
      console.error('Failed to delete investment:', err);
    }
  };

  const formatCurrency = (val) => {
    const numericVal = parseFloat(val || 0);
    return `৳${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getInvestmentTypeLabel = (type) => {
    const labels = {
      'capital_injection': 'Capital Injection',
      'capital_withdrawal': 'Capital Withdrawal',
      'profit_reinvestment': 'Profit Reinvestment',
      'external_investment': 'External Investment'
    };
    return labels[type] || type;
  };

  const getInvestmentTypeColor = (type) => {
    const colors = {
      'capital_injection': 'bg-emerald-50 text-emerald-600 border-emerald-200',
      'capital_withdrawal': 'bg-rose-50 text-rose-600 border-rose-200',
      'profit_reinvestment': 'bg-indigo-50 text-indigo-600 border-indigo-200',
      'external_investment': 'bg-amber-50 text-amber-600 border-amber-200'
    };
    return colors[type] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const printInvestmentDetails = (investment) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Investment Details', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(investment.investment_date)}`, 14, 22);
    doc.text(`Type: ${getInvestmentTypeLabel(investment.investment_type)}`, 14, 28);
    
    // Investment Details
    doc.setFontSize(12);
    doc.text('Amount: ' + formatCurrency(investment.amount), 14, 38);
    
    if (investment.investor_name) {
      doc.text('Investor: ' + investment.investor_name, 14, 44);
    }
    
    if (investment.description) {
      doc.text('Description: ' + investment.description, 14, 50);
    }
    
    // Additional Information
    doc.setFontSize(10);
    doc.text('Created At: ' + new Date(investment.created_at).toLocaleString(), 14, 58);
    
    // Save the PDF
    doc.save(`investment_${investment.id}_${investment.investment_date}.pdf`);
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div id="investment" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => {
            setEditingInvestment(null);
            setFormData({
              investment_type: 'capital_injection',
              amount: '',
              description: '',
              investor_name: '',
              investment_date: new Date().toISOString().split('T')[0]
            });
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm shadow-xs transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Investment</span>
        </button>
      </div>

      {/* Investment Summary Cards */}
      {investmentSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Capital Injected */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capital Injected</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-slate-800">{formatCurrency(investmentSummary.total_capital_injected)}</span>
            </div>
          </div>

          {/* Total Capital Withdrawn */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capital Withdrawn</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-rose-600">{formatCurrency(investmentSummary.total_capital_withdrawn)}</span>
            </div>
          </div>

          {/* Profit Reinvested */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profit Reinvested</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-slate-800">{formatCurrency(investmentSummary.total_profit_reinvested)}</span>
            </div>
          </div>

          {/* Net Capital Position */}
          <div className={`border rounded-2xl p-4 shadow-xs ${investmentSummary.net_capital_position >= 0
            ? 'bg-emerald-50/40 border-emerald-200'
            : 'bg-rose-50/40 border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Capital Position</span>
              <div className={`p-2 rounded-lg ${investmentSummary.net_capital_position >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className={`block text-2xl font-black ${investmentSummary.net_capital_position >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatCurrency(investmentSummary.net_capital_position)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Investment Trend Chart */}
      {investmentSummary && investmentSummary.trend && investmentSummary.trend.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-slate-800">Investment Flow Trend (7 Days)</h4>
          </div>
          <div className="relative w-full h-[180px]">
            <svg
              viewBox="0 0 600 180"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {(() => {
                const trend = investmentSummary.trend;
                const vals = trend.map(t => Math.abs(t.net_flow));
                const maxVal = Math.max(...vals, 1000);
                const minVal = Math.min(...trend.map(t => t.net_flow), 0);
                const valRange = maxVal - minVal || 1;

                const svgWidth = 600;
                const svgHeight = 180;
                const paddingLeft = 50;
                const paddingRight = 25;
                const paddingTop = 20;
                const paddingBottom = 30;

                const zeroY = svgHeight - paddingBottom - (((0 - minVal) / valRange) * (svgHeight - paddingTop - paddingBottom));
                const availableWidth = svgWidth - paddingLeft - paddingRight;
                const colWidth = availableWidth / trend.length;
                const barWidth = 20;

                const chartBars = trend.map((t, index) => {
                  const val = t.net_flow;
                  const x = paddingLeft + (index * colWidth) + (colWidth - barWidth) / 2;
                  const yVal = svgHeight - paddingBottom - (((val - minVal) / valRange) * (svgHeight - paddingTop - paddingBottom));

                  let y, height, isPositive;
                  if (val >= 0) {
                    y = yVal;
                    height = zeroY - yVal;
                    isPositive = true;
                  } else {
                    y = zeroY;
                    height = yVal - zeroY;
                    isPositive = false;
                  }

                  return { x, y, height, val, date: t.date, isPositive };
                });

                return (
                  <>
                    {/* Zero Line */}
                    <line
                      x1={paddingLeft}
                      y1={zeroY}
                      x2={svgWidth - paddingRight}
                      y2={zeroY}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />

                    {/* Grid Lines */}
                    {[0, 0.5, 1].map((ratio, idx) => {
                      const y = paddingTop + (1 - ratio) * (svgHeight - paddingTop - paddingBottom);
                      const labelVal = minVal + ratio * valRange;
                      return (
                        <g key={idx}>
                          <line
                            x1={paddingLeft}
                            y1={y}
                            x2={svgWidth - paddingRight}
                            y2={y}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                          />
                          <text
                            x={paddingLeft - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="text-[8px] font-bold text-slate-400 fill-current font-sans"
                          >
                            ৳{Math.round(labelVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars */}
                    {chartBars.map((bar, idx) => (
                      <g key={idx}>
                        <rect
                          x={bar.x}
                          y={bar.y}
                          width={barWidth}
                          height={Math.max(bar.height, 2)}
                          rx="2"
                          fill={bar.isPositive ? "#10b981" : "#f43f5e"}
                          className="pointer-events-none transition-all duration-150"
                          opacity="0.75"
                        />
                        <text
                          x={bar.x + barWidth / 2}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          className="text-[8px] font-bold text-slate-400 fill-current font-sans"
                        >
                          {new Date(bar.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Investments Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-4">Investment History</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Investor</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {investments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No investments recorded yet.
                  </td>
                </tr>
              ) : (
                investments.map((investment) => (
                  <tr key={investment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 text-slate-600">{formatDate(investment.investment_date)}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getInvestmentTypeColor(investment.investment_type)}`}>
                        {getInvestmentTypeLabel(investment.investment_type)}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{investment.investor_name || '-'}</td>
                    <td className="py-3 text-slate-600 truncate max-w-xs">{investment.description || '-'}</td>
                    <td className={`py-3 text-right font-bold ${investment.investment_type === 'capital_withdrawal' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {investment.investment_type === 'capital_withdrawal' ? '-' : '+'}{formatCurrency(investment.amount)}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleView(investment)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(investment)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(investment.id)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingInvestment ? 'Edit Investment' : 'Add Investment'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingInvestment(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Investment Type</label>
                <select
                  value={formData.investment_type}
                  onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                >
                  <option value="capital_injection">Capital Injection</option>
                  <option value="capital_withdrawal">Capital Withdrawal</option>
                  <option value="profit_reinvestment">Profit Reinvestment</option>
                  <option value="external_investment">External Investment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Investor Name</label>
                <input
                  type="text"
                  value={formData.investor_name}
                  onChange={(e) => setFormData({ ...formData, investor_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Investment Date</label>
                <input
                  type="date"
                  value={formData.investment_date}
                  onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  rows="3"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingInvestment(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  {editingInvestment ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Investment Modal */}
      {showViewModal && viewingInvestment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Investment Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingInvestment(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4" id="investment-details">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Investment Type</span>
                <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getInvestmentTypeColor(viewingInvestment.investment_type)}`}>
                  {getInvestmentTypeLabel(viewingInvestment.investment_type)}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Amount</span>
                <span className={`text-lg font-black ${viewingInvestment.investment_type === 'capital_withdrawal' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {viewingInvestment.investment_type === 'capital_withdrawal' ? '-' : '+'}{formatCurrency(viewingInvestment.amount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Date</span>
                <span className="text-sm font-semibold text-slate-800">{formatDate(viewingInvestment.investment_date)}</span>
              </div>
              
              {viewingInvestment.investor_name && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Investor</span>
                  <span className="text-sm font-semibold text-slate-800">{viewingInvestment.investor_name}</span>
                </div>
              )}
              
              {viewingInvestment.description && (
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 block mb-1">Description</span>
                  <p className="text-sm text-slate-800">{viewingInvestment.description}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Created By</span>
                <span className="text-sm font-semibold text-slate-800">{viewingInvestment.created_by_name || 'Unknown'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Created At</span>
                <span className="text-sm font-semibold text-slate-800">{new Date(viewingInvestment.created_at).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingInvestment(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => printInvestmentDetails(viewingInvestment)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
