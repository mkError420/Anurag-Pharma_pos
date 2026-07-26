import React, { useState, useEffect, useMemo } from 'react';
import API_BASE_URL from '../config';

export default function AllTransactions() {
  const userObj = JSON.parse(localStorage.getItem('user') || '{}');

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_sales: 0,
    total_purchase: 0,
    total_due: 0,
    total_wastage: 0,
    total_other_cost: 0,
    total_other_sales: 0,
    count: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('all'); // all, purchase, sales, due, wastage, other_cost, other_sales
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Selected Transaction for Modal
  const [selectedTx, setSelectedTx] = useState(null);
  // Detailed data fetched for modal
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/transactions?type=${activeTab}&search=${encodeURIComponent(search)}`;

      let start = '';
      let end = '';

      const now = new Date();
      if (dateFilter === 'today') {
        start = now.toISOString().split('T')[0];
        end = start;
      } else if (dateFilter === 'week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        start = firstDay.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'custom') {
        start = customStartDate;
        end = customEndDate;
      }

      if (start) url += `&start_date=${start}`;
      if (end) url += `&end_date=${end}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to load transactions');
      }

      const data = await res.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || {
        total_sales: 0,
        total_purchase: 0,
        total_due: 0,
        total_wastage: 0,
        total_other_cost: 0,
        total_other_sales: 0,
        count: 0
      });
      setCurrentPage(1); // Reset to first page on fetch
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, dateFilter, customStartDate, customEndDate]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Pagination calculation
  const totalPages = Math.ceil(transactions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, transactions.length);
  const currentTransactions = useMemo(() => {
    return transactions.slice(startIndex, startIndex + itemsPerPage);
  }, [transactions, currentPage]);

  // Generate 20-page window list
  const getPageNumbers = () => {
    const maxVisiblePages = 20;
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let windowIndex = Math.floor((currentPage - 1) / maxVisiblePages);
    let startPage = windowIndex * maxVisiblePages + 1;
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Format currency
  const formatMoney = (val) => {
    const num = parseFloat(val) || 0;
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fetch detailed data when a transaction is selected
  const openTransactionDetail = async (tx) => {
    setSelectedTx(tx);
    setDetailData(null);
    const token = localStorage.getItem('token');

    try {
      setDetailLoading(true);
      if (tx.type === 'sales' || tx.type === 'due') {
        // Fetch sale details with line items
        const res = await fetch(`${API_BASE_URL}/sales/${tx.raw_id}?i=1`, {
          headers: { Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (res.ok) {
          const data = await res.json();
          setDetailData({ kind: 'sale', ...data });
        }
      } else if (tx.type === 'purchase') {
        // Fetch purchase order details with line items
        const res = await fetch(`${API_BASE_URL}/suppliers/purchase-orders/${tx.raw_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDetailData({ kind: 'purchase', ...data });
        }
      } else {
        // For wastage, other_cost, other_sales — all info already in tx object
        setDetailData({ kind: tx.type });
      }
    } catch (e) {
      console.error('Failed to fetch detail', e);
      setDetailData({ kind: tx.type }); // fall back to basic display
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper for Badge Styles by Type
  const getTypeBadge = (type) => {
    switch (type) {
      case 'sales':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Sales</span>;
      case 'purchase':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Purchase</span>;
      case 'due':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">Due</span>;
      case 'wastage':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">Wastage</span>;
      case 'other_cost':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">Other Cost</span>;
      case 'other_sales':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">Other Sales</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 border border-slate-500/20">{type}</span>;
    }
  };

  // Export CSV Function (All filtered transactions with UTF-8 BOM)
  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) {
      alert('No transaction data available to export.');
      return;
    }

    const headers = [
      'Reference ID',
      'Transaction Type',
      'Date & Time',
      'Party / Title',
      'Description',
      'Payment Method',
      'Total Amount (BDT)',
      'Paid Amount (BDT)',
      'Due Amount (BDT)',
      'Status'
    ];

    const rows = transactions.map(t => [
      `"${(t.ref_id || '').replace(/"/g, '""')}"`,
      `"${(t.category || t.type || '').replace(/"/g, '""')}"`,
      `"${(t.date || '').replace(/"/g, '""')}"`,
      `"${(t.party_name || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.payment_method || '').replace(/"/g, '""')}"`,
      parseFloat(t.amount || 0).toFixed(2),
      parseFloat(t.paid_amount || 0).toFixed(2),
      parseFloat(t.due_amount || 0).toFixed(2),
      `"${(t.status || '').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');

    // UTF-8 BOM prefix for Excel symbol support
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const shopSlug = (userObj.shop_name || 'Shop').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `All_Transactions_${shopSlug}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print Statement Function (Dedicated formatted print document)
  const handlePrintStatement = () => {
    if (!transactions || transactions.length === 0) {
      alert('No transaction data available to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow popups to view the printable statement.');
      return;
    }

    const shopName = userObj.shop_name || 'Business POS System';
    const shopAddress = userObj.shop_address || '';
    const shopPhone = userObj.shop_phone || '';
    const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    const rowsHtml = transactions.map((t, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 10px; font-weight: 700; font-size: 11px;">${t.ref_id}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-transform: capitalize;">${t.category || t.type}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #64748b;">${t.date}</td>
        <td style="padding: 8px 10px; font-size: 11px; font-weight: 600; color: #1e293b;">${t.party_name || '-'}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #475569;">${t.description || '-'}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569;">${t.payment_method}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 700;">৳${parseFloat(t.amount || 0).toFixed(2)}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-align: right; color: #059669; font-weight: 600;">৳${parseFloat(t.paid_amount || 0).toFixed(2)}</td>
        <td style="padding: 8px 10px; font-size: 11px; text-align: right; color: ${t.due_amount > 0 ? '#d97706' : '#64748b'}; font-weight: 700;">৳${parseFloat(t.due_amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaction Statement - ${shopName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
          .shop-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
          .shop-meta { font-size: 11px; color: #64748b; margin: 0; }
          .statement-title { font-size: 18px; font-weight: 800; text-align: right; color: #4f46e5; margin: 0 0 4px 0; text-transform: uppercase; }
          .summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; }
          .summary-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .summary-val { font-size: 13px; font-weight: 800; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; padding: 8px 10px; text-align: left; }
          th.right { text-align: right; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          @media print {
            body { padding: 0; }
            @page { size: auto; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="shop-title">${shopName}</h1>
            ${shopAddress ? `<p class="shop-meta">${shopAddress}</p>` : ''}
            ${shopPhone ? `<p class="shop-meta">Tel: ${shopPhone}</p>` : ''}
          </div>
          <div>
            <h2 class="statement-title">Transaction Statement</h2>
            <p class="shop-meta" style="text-align: right;">Date: ${generatedAt}</p>
            <p class="shop-meta" style="text-align: right;">Records Included: ${transactions.length}</p>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card"><div class="summary-label">Sales</div><div class="summary-val">৳${summary.total_sales.toFixed(2)}</div></div>
          <div class="summary-card"><div class="summary-label">Purchases</div><div class="summary-val">৳${summary.total_purchase.toFixed(2)}</div></div>
          <div class="summary-card"><div class="summary-label">Total Due</div><div class="summary-val">৳${summary.total_due.toFixed(2)}</div></div>
          <div class="summary-card"><div class="summary-label">Wastage</div><div class="summary-val">৳${summary.total_wastage.toFixed(2)}</div></div>
          <div class="summary-card"><div class="summary-label">Other Cost</div><div class="summary-val">৳${summary.total_other_cost.toFixed(2)}</div></div>
          <div class="summary-card"><div class="summary-label">Other Sales</div><div class="summary-val">৳${summary.total_other_sales.toFixed(2)}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ref ID</th>
              <th>Type</th>
              <th>Date</th>
              <th>Party / Title</th>
              <th>Description</th>
              <th>Method</th>
              <th class="right">Total</th>
              <th class="right">Paid</th>
              <th class="right">Due</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Multi-Tenant POS System - Official Transaction Statement</div>
          <div>Generated by: ${userObj.name || 'Shop Admin'}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            {/*    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div> */}
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">All Transactions</h1>
              <p className="text-sm text-slate-500">Comprehensive transaction history including sales, purchases, dues, wastage, and other cashflows.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={handlePrintStatement}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Statement
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Sales</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(summary.total_sales)}</div>
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        {/* Purchases */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">Purchases</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(summary.total_purchase)}</div>
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        </div>

        {/* Due */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">Total Due</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(summary.total_due)}</div>
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Wastage */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">Wastage Loss</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(summary.total_wastage)}</div>
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        </div>

        {/* Other Cost */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">Other Cost</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(summary.total_other_cost)}</div>
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Other Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-cyan-600 mb-1">Other Sales</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(summary.total_other_sales)}</div>
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-cyan-50 text-cyan-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 no-scrollbar">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'purchase', label: 'Purchase' },
            { id: 'sales', label: 'Sales' },
            { id: 'due', label: 'Due' },
            { id: 'wastage', label: 'Wastage' },
            { id: 'other_cost', label: 'Other Cost' },
            { id: 'other_sales', label: 'Other Sales' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls Bar: Search & Date Filters — inline */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80 flex-shrink-0">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by Ref ID, party name, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
            {/* Custom Date — inline date pickers shown when active */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => { setCustomStartDate(e.target.value); setDateFilter('custom'); }}
                className={`px-3 py-2 border rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-all ${dateFilter === 'custom' && customStartDate ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                placeholder="From"
              />
              <span className="text-slate-400 text-xs font-medium">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => { setCustomEndDate(e.target.value); setDateFilter('custom'); }}
                className={`px-3 py-2 border rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-all ${dateFilter === 'custom' && customEndDate ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                placeholder="To"
              />
              {dateFilter === 'custom' && (customStartDate || customEndDate) && (
                <button
                  onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setDateFilter('all'); }}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                  title="Clear custom date"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

          {/* Date Filter Buttons — inline beside search */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
            ].map(df => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${dateFilter === df.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {df.label}
              </button>
            ))}

          
          </div>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">Loading transaction records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchTransactions}
              className="mt-3 px-4 py-2 bg-rose-50 text-rose-600 text-sm font-semibold rounded-xl border border-rose-200 hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">No Transactions Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">There are no records matching your current filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Ref ID</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Party / Title</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Due</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {currentTransactions.map((t) => (
                    <tr key={t.ref_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {t.ref_id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getTypeBadge(t.type)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-xs">
                        {t.date}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {t.party_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 capitalize whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {t.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(t.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-600 whitespace-nowrap">
                        {formatMoney(t.paid_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium whitespace-nowrap">
                        {t.due_amount > 0 ? (
                          <span className="text-amber-600 font-bold">{formatMoney(t.due_amount)}</span>
                        ) : (
                          <span className="text-slate-400">৳0.00</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => openTransactionDetail(t)}
                          className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          title="View Details"
                        >
                          {/* <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg> */}
                          <p>Show Details</p>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-800">{transactions.length > 0 ? startIndex + 1 : 0}</span> to{' '}
                <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
                <span className="font-semibold text-slate-800">{transactions.length}</span> entries (25 per page)
              </div>

              <div className="flex items-center flex-wrap gap-1 justify-center sm:justify-end overflow-x-auto no-scrollbar py-1">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                {/* Page Number Buttons (20 per window) */}
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${currentPage === page
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
                >
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setSelectedTx(null); setDetailData(null); } }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Modal Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-100 ${selectedTx.type === 'sales' ? 'bg-emerald-50' :
              selectedTx.type === 'purchase' ? 'bg-indigo-50' :
                selectedTx.type === 'due' ? 'bg-amber-50' :
                  selectedTx.type === 'wastage' ? 'bg-rose-50' :
                    selectedTx.type === 'other_cost' ? 'bg-purple-50' :
                      selectedTx.type === 'other_sales' ? 'bg-cyan-50' : 'bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTx.type === 'sales' ? 'bg-emerald-100 text-emerald-600' :
                  selectedTx.type === 'purchase' ? 'bg-indigo-100 text-indigo-600' :
                    selectedTx.type === 'due' ? 'bg-amber-100 text-amber-600' :
                      selectedTx.type === 'wastage' ? 'bg-rose-100 text-rose-600' :
                        selectedTx.type === 'other_cost' ? 'bg-purple-100 text-purple-600' :
                          selectedTx.type === 'other_sales' ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {selectedTx.type === 'sales' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
                  {selectedTx.type === 'purchase' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                  {selectedTx.type === 'due' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  {selectedTx.type === 'wastage' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                  {(selectedTx.type === 'other_cost' || selectedTx.type === 'other_sales') && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">{selectedTx.ref_id}</h3>
                    {getTypeBadge(selectedTx.type)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedTx.date}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedTx(null); setDetailData(null); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Loading spinner */}
              {detailLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading transaction details...</p>
                </div>
              )}

              {!detailLoading && (
                <>
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-xl p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Party / Title</p>
                      <p className="font-semibold text-slate-800">{selectedTx.party_name || '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Category</p>
                      <p className="font-semibold text-slate-800">{selectedTx.category || '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Payment Method</p>
                      <p className="font-semibold text-slate-800 capitalize">{selectedTx.payment_method || '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                      <p className={`font-semibold capitalize ${selectedTx.status === 'completed' || selectedTx.status === 'income' ? 'text-emerald-600' :
                        selectedTx.status === 'due' ? 'text-amber-600' :
                          selectedTx.status === 'loss' || selectedTx.status === 'expense' ? 'text-rose-600' : 'text-slate-700'
                        }`}>{selectedTx.status || '—'}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedTx.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description / Notes</p>
                      <p className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm text-slate-700 leading-relaxed">{selectedTx.description}</p>
                    </div>
                  )}

                  {/* Sale-specific extra info */}
                  {detailData?.kind === 'sale' && (
                    <>
                      {/* Customer Info */}
                      {(detailData.customer_name || detailData.customer_phone) && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">Customer Info</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {detailData.customer_name && <span className="font-semibold text-slate-800">Name: {detailData.customer_name}</span>}
                            {detailData.customer_phone && <span className="text-slate-600">Call: {detailData.customer_phone}</span>}
                            {detailData.customer_address && <span className="text-slate-600">Location: {detailData.customer_address}</span>}
                          </div>
                        </div>
                      )}

                      {/* Sale Line Items */}
                      {detailData.items && detailData.items.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Items Purchased</p>
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">#</th>
                                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">Product</th>
                                  <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500">Qty</th>
                                  <th className="py-2.5 px-3 text-right text-xs font-semibold text-slate-500">Unit Price</th>
                                  <th className="py-2.5 px-3 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {detailData.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/60">
                                    <td className="py-2.5 px-3 text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="py-2.5 px-3 font-medium text-slate-800">{item.product_name || item.name}</td>
                                    <td className="py-2.5 px-3 text-center text-slate-600">{parseFloat(item.quantity)}</td>
                                    <td className="py-2.5 px-3 text-right text-slate-600">{formatMoney(item.unit_price || item.price)}</td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{formatMoney((item.unit_price || item.price) * item.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Sale Financial Breakdown */}
                      <div className="bg-gradient-to-br from-emerald-50 to-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Financial Breakdown</p>
                        {parseFloat(detailData.subtotal || 0) > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{formatMoney(detailData.subtotal)}</span>
                          </div>
                        )}
                        {parseFloat(detailData.discount || 0) > 0 && (
                          <div className="flex justify-between text-rose-500">
                            <span>Discount</span>
                            <span className="font-medium">- {formatMoney(detailData.discount)}</span>
                          </div>
                        )}
                        {parseFloat(detailData.tax || 0) > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>Tax</span>
                            <span className="font-medium">+ {formatMoney(detailData.tax)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-800 font-bold text-base pt-2 border-t border-slate-200">
                          <span>Total</span>
                          <span>{formatMoney(detailData.final_amount || selectedTx.amount)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                          <span>Paid</span>
                          <span className="font-semibold">{formatMoney(detailData.paid_amount ?? selectedTx.paid_amount)}</span>
                        </div>
                        {parseFloat(detailData.due_amount ?? selectedTx.due_amount) > 0 && (
                          <div className="flex justify-between text-amber-600 font-bold pt-1 border-t border-dashed border-slate-200">
                            <span>Due Balance</span>
                            <span>{formatMoney(detailData.due_amount ?? selectedTx.due_amount)}</span>
                          </div>
                        )}
                      </div>

                      {detailData.staff_name && (
                        <p className="text-xs text-slate-500 text-right">Processed by: <span className="font-semibold text-slate-700">{detailData.staff_name}</span></p>
                      )}
                    </>
                  )}

                  {/* Purchase-specific extra info */}
                  {detailData?.kind === 'purchase' && (
                    <>
                      {/* PO Line Items */}
                      {detailData.items && detailData.items.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Items Ordered</p>
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">#</th>
                                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500">Product</th>
                                  <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500">Qty</th>
                                  <th className="py-2.5 px-3 text-right text-xs font-semibold text-slate-500">Unit Cost</th>
                                  <th className="py-2.5 px-3 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {detailData.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/60">
                                    <td className="py-2.5 px-3 text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="py-2.5 px-3">
                                      <span className="font-medium text-slate-800">{item.product_name || item.name}</span>
                                      {item.product_sku && <span className="text-xs text-slate-400 ml-1">({item.product_sku})</span>}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-slate-600">{parseFloat(item.quantity)}</td>
                                    <td className="py-2.5 px-3 text-right text-slate-600">{formatMoney(item.unit_cost || item.cost_price)}</td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{formatMoney((item.unit_cost || item.cost_price) * item.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* PO Financial Summary */}
                      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Financial Summary</p>
                        <div className="flex justify-between text-slate-800 font-bold text-base">
                          <span>Total Amount</span>
                          <span>{formatMoney(detailData.total_amount || selectedTx.amount)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                          <span>Paid</span>
                          <span className="font-semibold">{formatMoney(detailData.paid_amount ?? selectedTx.paid_amount)}</span>
                        </div>
                        {parseFloat(detailData.due_amount ?? selectedTx.due_amount) > 0 && (
                          <div className="flex justify-between text-amber-600 font-bold pt-1 border-t border-dashed border-slate-200">
                            <span>Due Balance</span>
                            <span>{formatMoney(detailData.due_amount ?? selectedTx.due_amount)}</span>
                          </div>
                        )}
                      </div>

                      {(detailData.status || detailData.payment_basis) && (
                        <div className="flex gap-4 text-xs text-slate-500">
                          {detailData.status && <span>Status: <span className="font-semibold text-slate-700 capitalize">{detailData.status}</span></span>}
                          {detailData.payment_basis && <span>Payment Basis: <span className="font-semibold text-slate-700 capitalize">{detailData.payment_basis}</span></span>}
                          {detailData.order_date && <span>Order Date: <span className="font-semibold text-slate-700">{detailData.order_date}</span></span>}
                        </div>
                      )}
                    </>
                  )}

                  {/* Fallback Financial Summary (for wastage, other_cost, other_sales and all non-detail types) */}
                  {(!detailData || (detailData.kind !== 'sale' && detailData.kind !== 'purchase')) && !detailLoading && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Financial Summary</p>
                      <div className="flex justify-between text-slate-800 font-bold text-base">
                        <span>Total Amount</span>
                        <span>{formatMoney(selectedTx.amount)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Paid Amount</span>
                        <span className="font-semibold">{formatMoney(selectedTx.paid_amount)}</span>
                      </div>
                      {parseFloat(selectedTx.due_amount) > 0 && (
                        <div className="flex justify-between text-amber-600 font-bold pt-1 border-t border-dashed border-slate-200">
                          <span>Due Balance</span>
                          <span>{formatMoney(selectedTx.due_amount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => { setSelectedTx(null); setDetailData(null); }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
