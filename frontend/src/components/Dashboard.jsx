import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { useLanguage } from '../contexts/LanguageContext';

export default function Dashboard({ onNavigate = () => { } }) {
  const { t, language, formatNumber } = useLanguage();
  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = userObj.role === 'super_admin';

  const [metrics, setMetrics] = useState({
    total_sales: 0,
    revenue: '0.00',
    total_products: 0,
    low_stock_alerts: 0,
    expiry_alerts: 0,
    total_customers: 0,
    total_shops: 0,
    active_shops: 0,
    total_users: 0,
    global_revenue: '0.00'
  });
  const [recentSales, setRecentSales] = useState([]);
  const [tenantBreakdown, setTenantBreakdown] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [deadStock, setDeadStock] = useState([]);
  const [chartType, setChartType] = useState('revenue'); // 'revenue' or 'sales'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [shopsList, setShopsList] = useState([]);
  const [backupShopId, setBackupShopId] = useState('');
  const [backupStats, setBackupStats] = useState(null);
  const [backupStatsLoading, setBackupStatsLoading] = useState(false);
  const [downloadingShopId, setDownloadingShopId] = useState(null);
  const [backupAlert, setBackupAlert] = useState(null);

  const triggerBackupAlert = (type, message) => {
    setBackupAlert({ type, message });
    setTimeout(() => setBackupAlert(null), 4500);
  };

  const fetchShopsList = async () => {
    if (!isSuperAdmin) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/shops`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShopsList(data || []);
        if (data && data.length > 0 && !backupShopId) {
          setBackupShopId(data[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Failed to fetch shops list:', err);
    }
  };

  const fetchBackupStats = async (shopId) => {
    if (!isSuperAdmin || !shopId) return;
    setBackupStatsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/shops/${shopId}/backup-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackupStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch backup stats:', err);
    } finally {
      setBackupStatsLoading(false);
    }
  };

  const handleDownloadDatabase = async (targetShopId, targetShopName = '') => {
    const sId = targetShopId || backupShopId;
    if (!sId) return;

    setDownloadingShopId(sId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/shops/${sId}/database-backup`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        let errMsg = 'Failed to download database backup.';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // Extract filename from header or formulate clean default
      const disposition = res.headers.get('content-disposition') || '';
      let filename = `shop_${sId}_database_backup.sql`;
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = match[1];
      } else if (targetShopName) {
        const clean = targetShopName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        filename = `shop_${sId}_${clean}_database.sql`;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      triggerBackupAlert('success', `Database backup for ${targetShopName || (sId === 'all' ? 'All Shops' : `Shop #${sId}`)} downloaded successfully!`);
    } catch (err) {
      console.error('Download database error:', err);
      triggerBackupAlert('error', err.message || 'Error downloading database backup.');
    } finally {
      setDownloadingShopId(null);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch analytics.');
      const data = await response.json();

      if (data.metrics) {
        setMetrics(data.metrics);
      }
      if (data.recent_sales) {
        setRecentSales(data.recent_sales);
      }
      if (data.tenant_breakdown) {
        setTenantBreakdown(data.tenant_breakdown);
      }
      if (data.sales_trend) {
        setSalesTrend(data.sales_trend);
      }
      if (data.payment_method_breakdown) {
        setPaymentBreakdown(data.payment_method_breakdown);
      }
      if (data.top_selling) {
        setTopSelling(data.top_selling);
      }
      if (data.dead_stock) {
        setDeadStock(data.dead_stock);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (isSuperAdmin) {
      fetchShopsList();
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin && backupShopId) {
      fetchBackupStats(backupShopId);
    }
  }, [backupShopId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 text-rose-600 border border-rose-100 rounded-xl p-4 text-center">
        Error loading analytics: {error}
      </div>
    );
  }

  if (isSuperAdmin) {
    const selectedShopObj = shopsList.find(s => s.id.toString() === backupShopId.toString()) || null;

    return (
      <div className="space-y-6">

        {/* Backup Alert Toast */}
        {backupAlert && (
          <div className={`fixed top-5 right-5 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold transition-all animate-bounce ${
            backupAlert.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {backupAlert.type === 'success' ? (
              <svg className="w-5 h-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="max-w-xs">{backupAlert.message}</span>
            <button onClick={() => setBackupAlert(null)} className="ml-2 opacity-70 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 1. Header Row */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Global System Analytics</h2>
          <p className="text-sm text-slate-500">Real-time cross-tenant metrics and shop performance indicators</p>
        </div>

        {/* 2. Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Global Revenue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gross System Revenue</p>
              <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">৳{parseFloat(metrics.global_revenue || 0).toFixed(2)}</h3>
            </div>
          </div>

          {/* Active Shops */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Tenant Shops</p>
              <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">{metrics.active_shops} / {metrics.total_shops}</h3>
            </div>
          </div>

          {/* Sales Count */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Sales Count</p>
              <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">{metrics.total_sales}</h3>
            </div>
          </div>

          {/* System Users */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.0 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total System Users</p>
              <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">{metrics.total_users}</h3>
            </div>
          </div>

        </div>

        {/* Super Admin Global Breakdown Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Shop Performance Breakdown</h3>
                <p className="text-[10px] text-slate-500">Comparing transaction counts and gross revenues across all tenant shops</p>
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 self-end sm:self-auto">
                <button
                  onClick={() => setChartType('revenue')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${chartType === 'revenue'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Revenue (৳)
                </button>
                <button
                  onClick={() => setChartType('sales')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${chartType === 'sales'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Transactions
                </button>
              </div>
            </div>

            {tenantBreakdown.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-400 text-xs">
                No tenant breakdown data available.
              </div>
            ) : (
              <div className="relative w-full h-[160px]">
                {/* SVG Plot */}
                <svg
                  viewBox="0 0 600 160"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const svgHeight = 160;
                    const paddingTop = 15;
                    const paddingBottom = 30;
                    const paddingLeft = 65;
                    const paddingRight = 25;
                    const y = paddingTop + (1 - ratio) * (svgHeight - paddingTop - paddingBottom);
                    const chartValues = tenantBreakdown.map(d => chartType === 'revenue' ? parseFloat(d.shop_revenue || 0) : parseInt(d.sales_count || 0));
                    const maxVal = Math.max(...chartValues, 10);
                    const labelVal = ratio * maxVal;

                    return (
                      <g key={idx}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={600 - paddingRight}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1.5"
                        />
                        <text
                          x={paddingLeft - 12}
                          y={y + 4}
                          textAnchor="end"
                          className="text-[10px] font-bold text-slate-400 fill-current font-sans"
                        >
                          {chartType === 'revenue' ? `৳${Math.round(labelVal)}` : Math.round(labelVal)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {(() => {
                    const svgWidth = 600;
                    const svgHeight = 160;
                    const paddingLeft = 65;
                    const paddingRight = 25;
                    const paddingTop = 15;
                    const paddingBottom = 30;

                    const chartValues = tenantBreakdown.map(d => chartType === 'revenue' ? parseFloat(d.shop_revenue || 0) : parseInt(d.sales_count || 0));
                    const maxVal = Math.max(...chartValues, 10);

                    const totalSum = chartValues.reduce((a, b) => a + b, 0);

                    const barWidth = Math.min(40, ((svgWidth - paddingLeft - paddingRight) / tenantBreakdown.length) * 0.5);
                    const gap = ((svgWidth - paddingLeft - paddingRight) / tenantBreakdown.length);

                    return tenantBreakdown.map((d, index) => {
                      const val = chartType === 'revenue' ? parseFloat(d.shop_revenue || 0) : parseInt(d.sales_count || 0);
                      const barHeight = (val / maxVal) * (svgHeight - paddingTop - paddingBottom);

                      const x = paddingLeft + (index * gap) + (gap - barWidth) / 2;
                      const y = svgHeight - paddingBottom - barHeight;

                      const percent = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : 0;

                      return (
                        <g key={index}>
                          {/* Bar Background shadow catch */}
                          <rect
                            x={paddingLeft + index * gap}
                            y={paddingTop}
                            width={gap}
                            height={svgHeight - paddingTop - paddingBottom}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint({ x: x + barWidth / 2, y, val, name: d.shop_name, percent, index })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {/* Visual Bar */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="4"
                            className={`transition-all duration-200 fill-indigo-600 ${hoveredPoint?.index === index ? 'fill-indigo-500 filter drop-shadow-md' : 'opacity-85'}`}
                          />
                          {/* Label under X axis */}
                          <text
                            x={x + barWidth / 2}
                            y={svgHeight - 12}
                            textAnchor="middle"
                            className="text-[9px] font-bold text-slate-400 fill-current font-sans truncate"
                            style={{ maxWidth: gap - 4 }}
                          >
                            {d.shop_name.length > 8 ? d.shop_name.slice(0, 7) + '..' : d.shop_name}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredPoint && (
                  <div
                    className="absolute bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-2 shadow-xl border border-slate-700 pointer-events-none text-[10px] flex flex-col space-y-0.5 transition-all duration-75 z-10"
                    style={{
                      left: `${(hoveredPoint.x / 600) * 100}%`,
                      top: `${(hoveredPoint.y / 160) * 100 - 10}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <span className="font-semibold text-slate-400">
                      {hoveredPoint.name}
                    </span>
                    <span className="font-extrabold text-white text-xs">
                      {chartType === 'revenue' ? `৳${parseFloat(hoveredPoint.val).toFixed(2)}` : `${hoveredPoint.val} Transactions`}
                    </span>
                    <span className="text-[9px] text-indigo-400 font-bold">
                      {hoveredPoint.percent}% of total
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Doughnut and Pie Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Doughnut Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
              <div className="mb-2">
                <h3 className="text-xs font-bold text-slate-800">Revenue Distribution</h3>
                <p className="text-[9px] text-slate-500">Shop revenue share</p>
              </div>
              {tenantBreakdown.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-slate-400 text-[10px]">
                  No data available.
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {/* Doughnut Chart SVG */}
                  <div className="relative w-20 h-20 aspect-square">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      {(() => {
                        const totalValue = tenantBreakdown.reduce((sum, item) => sum + parseFloat(item.shop_revenue || 0), 0);
                        let accumulated = 0;
                        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

                        return tenantBreakdown.map((item, index) => {
                          const value = parseFloat(item.shop_revenue || 0);
                          const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                          const strokeDasharray = `${percentage} ${100 - percentage}`;
                          const strokeDashoffset = 25 - accumulated;
                          accumulated += percentage;

                          return (
                            <circle
                              key={index}
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke={colors[index % colors.length]}
                              strokeWidth="3.2"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[8px] text-slate-400 font-semibold">Total</span>
                      <span className="text-[10px] font-extrabold text-slate-800">৳{parseFloat(metrics.global_revenue || 0).toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="w-full mt-2 space-y-0.5 text-[9px] max-h-[100px] overflow-y-auto">
                    {(() => {
                      const colors = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                      const totalValue = tenantBreakdown.reduce((sum, item) => sum + parseFloat(item.shop_revenue || 0), 0);
                      
                      return tenantBreakdown.map((item, index) => {
                        const value = parseFloat(item.shop_revenue || 0);
                        const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
                        
                        return (
                          <div key={index} className="flex items-center">
                            <span className="w-1 h-1 rounded-full mr-1 flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></span>
                            <span className="font-semibold text-slate-700 truncate mr-1" title={item.shop_name}>{item.shop_name}</span>
                            <span className="ml-auto font-bold text-slate-500 whitespace-nowrap">{percentage}%</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Pie Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
              <div className="mb-2">
                <h3 className="text-xs font-bold text-slate-800">Transaction Distribution</h3>
                <p className="text-[9px] text-slate-500">Shop transaction count</p>
              </div>
              {tenantBreakdown.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-slate-400 text-[10px]">
                  No data available.
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {/* Pie Chart SVG */}
                  <div className="relative w-20 h-20 aspect-square">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      {(() => {
                        const totalValue = tenantBreakdown.reduce((sum, item) => sum + parseInt(item.sales_count || 0), 0);
                        let accumulated = 0;
                        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

                        return tenantBreakdown.map((item, index) => {
                          const value = parseInt(item.sales_count || 0);
                          const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                          const strokeDasharray = `${percentage} ${100 - percentage}`;
                          const strokeDashoffset = 25 - accumulated;
                          accumulated += percentage;

                          return (
                            <circle
                              key={index}
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke={colors[index % colors.length]}
                              strokeWidth="3.2"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="butt"
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>

                  {/* Legend */}
                  <div className="w-full mt-2 space-y-0.5 text-[9px] max-h-[100px] overflow-y-auto">
                    {(() => {
                      const colors = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                      const totalValue = tenantBreakdown.reduce((sum, item) => sum + parseInt(item.sales_count || 0), 0);
                      
                      return tenantBreakdown.map((item, index) => {
                        const value = parseInt(item.sales_count || 0);
                        const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
                        
                        return (
                          <div key={index} className="flex items-center">
                            <span className="w-1 h-1 rounded-full mr-1 flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></span>
                            <span className="font-semibold text-slate-700 truncate mr-1" title={item.shop_name}>{item.shop_name}</span>
                            <span className="ml-auto font-bold text-slate-500 whitespace-nowrap">{percentage}%</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. NEW: Shop Database Backup & Export Panel */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-700/40 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{t('database_backup', 'Shop-Wise Database Backup')}</h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                      {t('super_admin_tool', 'Super Admin Tool')}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    {t('db_backup_subtitle', 'Download complete, standalone MySQL SQL dump files partitioned by tenant shop or export the entire multi-tenant database.')}
                  </p>
                </div>
              </div>

              {/* Quick action: Download all */}
              <button
                onClick={() => handleDownloadDatabase('all', 'All Tenant Shops')}
                disabled={downloadingShopId !== null}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all hover:shadow-lg disabled:opacity-50 shrink-0"
              >
                {downloadingShopId === 'all' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                <span>{t('export_full_db', 'Export Full System DB (.sql)')}</span>
              </button>
            </div>

            {/* Selection & Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Selector (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200">
                  {t('select_shop', 'Select Target Tenant Shop')}
                </label>

                <div className="relative">
                  <select
                    value={backupShopId}
                    onChange={(e) => setBackupShopId(e.target.value)}
                    className="w-full bg-slate-800/90 text-white border border-indigo-500/40 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="" disabled>Choose a tenant shop...</option>
                    <option value="all">⚡ All Tenant Shops (Complete Database Backup)</option>
                    {shopsList.map((shop) => (
                      <option key={shop.id} value={shop.id.toString()}>
                        #{shop.id} — {shop.name} ({shop.status === 'active' ? 'Active' : 'Suspended'})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleDownloadDatabase(backupShopId, selectedShopObj?.name || (backupShopId === 'all' ? 'All Shops' : `Shop #${backupShopId}`))}
                    disabled={!backupShopId || downloadingShopId !== null}
                    className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm shadow-xl shadow-indigo-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {downloadingShopId === backupShopId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t('generating_sql', 'Generating SQL Dump...')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>{t('download_shop_db', 'Download Shop Database (.sql)')}</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-indigo-300/70 text-center leading-relaxed">
                  Export includes complete DDL table creation, transactional statements, foreign-key safe structures, and UTF-8 encoded row records.
                </p>
              </div>

              {/* Right Column: Selected Shop Stats Preview (7 cols) */}
              <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{t('preview_scope', 'Database Backup Preview')}</h4>
                    <p className="text-[11px] text-indigo-200/70">
                      {backupShopId === 'all' ? 'System-wide Multi-Tenant Scope' : (selectedShopObj ? `Scope: ${selectedShopObj.name}` : 'Select a shop to inspect')}
                    </p>
                  </div>
                  {backupShopId && (
                    <button
                      onClick={() => fetchBackupStats(backupShopId)}
                      disabled={backupStatsLoading}
                      className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                      title="Refresh statistics"
                    >
                      <svg className={`w-3.5 h-3.5 ${backupStatsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{t('refresh', 'Refresh')}</span>
                    </button>
                  )}
                </div>

                {backupStatsLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-indigo-300">
                    <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">{t('loading', 'Loading live database statistics...')}</span>
                  </div>
                ) : backupStats ? (
                  <div className="space-y-4">
                    {/* Top 4 mini stat badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-indigo-300/80 block">{t('total_records', 'Total Records')}</span>
                        <span className="text-lg font-extrabold text-white mt-0.5 block">{formatNumber(backupStats.total_records || 0)}</span>
                      </div>
                      <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-indigo-300/80 block">{t('products', 'Products')}</span>
                        <span className="text-lg font-extrabold text-white mt-0.5 block">{formatNumber(backupStats.products_count || 0)}</span>
                      </div>
                      <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-indigo-300/80 block">{t('sales_done', 'Sales Done')}</span>
                        <span className="text-lg font-extrabold text-white mt-0.5 block">{formatNumber(backupStats.sales_count || 0)}</span>
                      </div>
                      <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-indigo-300/80 block">{t('est_size', 'Est. Size')}</span>
                        <span className="text-lg font-extrabold text-emerald-400 mt-0.5 block">{backupStats.estimated_size_formatted}</span>
                      </div>
                    </div>

                    {/* Breakdown table list badges */}
                    {backupStats.table_breakdown && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300/80 block">
                          {t('itemized_records', 'Itemized Table Records:')}
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {Object.entries(backupStats.table_breakdown).map(([table, count]) => (
                            <span key={table} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-indigo-100 text-xs px-2.5 py-1 rounded-lg">
                              <span className="font-mono text-[11px] text-indigo-300">{table}:</span>
                              <strong className="text-white">{formatNumber(count)}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-indigo-300/70">
                    Select a shop from the left dropdown to preview backup size and record statistics.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Detailed Data Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Col: Shop Breakdown (Span 2) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tenant Shops Breakdown</h3>
                <p className="text-xs text-slate-500">Shop performance overview with direct database backup options</p>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Shop Name</th>
                    <th className="pb-3 text-center">Transactions</th>
                    <th className="pb-3 text-right">Gross Revenue</th>
                    <th className="pb-3 text-center">Database Backup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {tenantBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400">
                        No active shops recorded.
                      </td>
                    </tr>
                  ) : (
                    tenantBreakdown.map((shop, index) => {
                      const sId = shop.shop_id || (shopsList.find(s => s.name === shop.shop_name)?.id) || (index + 1);
                      const isDownloadingThis = downloadingShopId === sId || downloadingShopId === sId.toString();

                      return (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{shop.shop_name}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">#{sId}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-center text-slate-600 font-medium">{shop.sales_count || 0}</td>
                          <td className="py-3.5 text-right font-extrabold text-indigo-600">
                            ৳{parseFloat(shop.shop_revenue || 0).toFixed(2)}
                          </td>
                          <td className="py-3.5 text-center">
                            <button
                              onClick={() => handleDownloadDatabase(sId, shop.shop_name)}
                              disabled={downloadingShopId !== null}
                              title={`Download database for ${shop.shop_name}`}
                              className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:shadow-xs disabled:opacity-50"
                            >
                              {isDownloadingThis ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                  <span>Exporting...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  <span>Download DB</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Col: Quick Links */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Quick Administrator Links</h3>
            <div className="space-y-3">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate('/shops'); }}
                className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-sm shadow transition-colors text-center"
              >
                <span>Manage Tenant Shops</span>
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate('/users'); }}
                className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-sm shadow transition-colors text-center"
              >
                <span>Manage System Users</span>
              </a>
              <button
                type="button"
                onClick={() => handleDownloadDatabase('all', 'Complete Multi-Tenant System')}
                disabled={downloadingShopId !== null}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 px-4 rounded-xl text-sm border border-indigo-200 transition-colors text-center"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download All DB Backup</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* 1. Header Row */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Shop Overview</h2>
        <p className="text-sm text-slate-500">Real-time performance indicators and inventory state</p>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'bn' ? 'মোট আয় / রাজস্ব' : 'Gross Revenue'}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">৳{formatNumber(parseFloat(metrics.revenue || 0).toFixed(2))}</h3>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'bn' ? 'মোট বিক্রয় সংখ্যা' : 'Sales Count'}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{formatNumber(metrics.total_sales || 0)}</h3>
          </div>
        </div>

        {/* Low Stock Warning level */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${metrics.low_stock_alerts > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'bn' ? 'কম স্টক সতর্কতা' : 'Low Stock Warnings'}</p>
            <h3 className={`text-2xl font-extrabold mt-0.5 ${metrics.low_stock_alerts > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatNumber(metrics.low_stock_alerts || 0)}</h3>
          </div>
        </div>

        {/* Expiry Alerts level */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${metrics.expiry_alerts > 0 ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'bn' ? 'মেয়াদ শেষ সতর্কতা' : 'Expiry Alerts'}</p>
            <h3 className={`text-2xl font-extrabold mt-0.5 ${metrics.expiry_alerts > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{formatNumber(metrics.expiry_alerts || 0)}</h3>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language === 'bn' ? 'গ্রাহক সংখ্যা' : 'Customer Count'}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{formatNumber(metrics.total_customers || 0)}</h3>
          </div>
        </div>

      </div>

      {/* Sales Performance Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{language === 'bn' ? 'বিক্রয় কর্মক্ষমতার ধারা' : 'Sales Performance Trend'}</h3>
            <p className="text-xs text-slate-500">{language === 'bn' ? 'গত ৭ দিনের দৈনিক বিক্রয় ও লেনদেন বিবরণী' : 'Daily business transaction volume and gross revenues over the last 7 days'}</p>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 self-end sm:self-auto">
            <button
              onClick={() => setChartType('revenue')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${chartType === 'revenue'
                ? 'bg-white text-indigo-650 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {language === 'bn' ? 'আয় (৳)' : 'Revenue (৳)'}
            </button>
            <button
              onClick={() => setChartType('sales')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${chartType === 'sales'
                ? 'bg-white text-indigo-650 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {language === 'bn' ? 'লেনদেন' : 'Transactions'}
            </button>
          </div>
        </div>

        {salesTrend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            No sales trend data available.
          </div>
        ) : (
          <div className="relative w-full h-[220px]">
            {/* SVG Plot */}
            <svg
              viewBox="0 0 600 220"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const svgHeight = 220;
                const paddingTop = 20;
                const paddingBottom = 40;
                const paddingLeft = 55;
                const paddingRight = 25;
                const y = paddingTop + (1 - ratio) * (svgHeight - paddingTop - paddingBottom);
                const chartValues = salesTrend.map(d => chartType === 'revenue' ? parseFloat(d.revenue) : parseInt(d.sales_count));
                const maxVal = Math.max(...chartValues, 10);
                const labelVal = ratio * maxVal;

                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={600 - paddingRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1.5"
                    />
                    <text
                      x={paddingLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] font-bold text-slate-400 fill-current font-sans"
                    >
                      {chartType === 'revenue' ? `৳${Math.round(labelVal)}` : Math.round(labelVal)}
                    </text>
                  </g>
                );
              })}

              {/* Paths and Dots */}
              {(() => {
                const svgWidth = 600;
                const svgHeight = 220;
                const paddingLeft = 55;
                const paddingRight = 25;
                const paddingTop = 20;
                const paddingBottom = 40;

                const chartValues = salesTrend.map(d => chartType === 'revenue' ? parseFloat(d.revenue) : parseInt(d.sales_count));
                const maxVal = Math.max(...chartValues, 10);

                const chartPoints = salesTrend.map((d, index) => {
                  const val = chartType === 'revenue' ? parseFloat(d.revenue) : parseInt(d.sales_count);
                  const x = paddingLeft + (index * (svgWidth - paddingLeft - paddingRight) / (salesTrend.length - 1 || 1));
                  const y = svgHeight - paddingBottom - ((val / maxVal) * (svgHeight - paddingTop - paddingBottom));
                  return { x, y, val, date: d.date };
                });

                const linePath = chartPoints.reduce((path, pt, i) => {
                  return path + (i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
                }, '');

                const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${svgHeight - paddingBottom} L ${chartPoints[0].x} ${svgHeight - paddingBottom} Z`;

                return (
                  <>
                    {/* Area fill */}
                    <path d={areaPath} fill="url(#chartAreaGradient)" />

                    {/* Stroke line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Interactive points */}
                    {chartPoints.map((pt, idx) => (
                      <g key={idx}>
                        {/* Large pointer catcher */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="18"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint({ ...pt, index: idx })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        {/* Styled visual dot */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint?.index === idx ? "6" : "4.5"}
                          fill={hoveredPoint?.index === idx ? "#4f46e5" : "#ffffff"}
                          stroke="#4f46e5"
                          strokeWidth={hoveredPoint?.index === idx ? "3" : "2"}
                          className="pointer-events-none transition-all duration-150"
                        />
                      </g>
                    ))}

                    {/* X-Axis labels */}
                    {chartPoints.map((pt, idx) => {
                      const dateObj = new Date(pt.date);
                      const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <text
                          key={idx}
                          x={pt.x}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          className="text-[10px] font-bold text-slate-400 fill-current font-sans"
                        >
                          {label}
                        </text>
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            {/* Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="absolute bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 shadow-xl border border-slate-700 pointer-events-none text-xs flex flex-col space-y-1 transition-all duration-75 z-10"
                style={{
                  left: `${(hoveredPoint.x / 600) * 100}%`,
                  top: `${(hoveredPoint.y / 220) * 100 - 10}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <span className="font-semibold text-slate-400">
                  {new Date(hoveredPoint.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="font-extrabold text-white text-sm">
                  {chartType === 'revenue' ? `৳${parseFloat(hoveredPoint.val).toFixed(2)}` : `${hoveredPoint.val} Sales`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Detailed Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left Col: Recent Transactions (Span 2) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Transactions</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Sale ID</th>
                  <th className="pb-3">Cashier</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-semibold text-slate-600">#{sale.id}</td>
                      <td className="py-3.5 text-slate-700">{sale.staff_name}</td>
                      <td className="py-3.5">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                          {sale.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right font-extrabold text-indigo-600">
                        ৳{parseFloat(sale.final_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Charts & Actions (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Methods Donut Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Sales by Payment Method</h3>
            {paymentBreakdown.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Donut Chart SVG */}
                <div className="relative w-full aspect-square">
                  <svg viewBox="0 0 36 36" className="w-full h-full">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    {(() => {
                      const totalValue = paymentBreakdown.reduce((sum, item) => sum + parseFloat(item.total), 0);
                      let accumulated = 0;
                      const colors = ['#eb2276ff', '#10b981', '#f59e0b', '#8b5cf6'];

                      return paymentBreakdown.map((item, index) => {
                        const percentage = (item.total / totalValue) * 100;
                        const strokeDasharray = `${percentage} ${100 - percentage}`;
                        const strokeDashoffset = 25 - accumulated;
                        accumulated += percentage;

                        return (
                          <circle
                            key={index}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke={colors[index % colors.length]}
                            strokeWidth="3.2"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-400 font-semibold">Total</span>
                    <span className="text-xl font-extrabold text-slate-800">৳{parseFloat(metrics.revenue).toFixed(0)}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2.5 text-sm">
                  {(() => {
                    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6'];
                    return paymentBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: colors[index % colors.length] }}></span>
                        <span className="font-semibold text-slate-700 capitalize">{item.payment_method.replace('_', ' ')}:</span>
                        <span className="ml-auto font-bold text-slate-500">{item.count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                No payment data available.
              </div>
            )}
          </div>

          {/* Quick Actions & Inventory Alert */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Quick Inventory Status</h3>
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catalog Health</h4>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-600">Total Products listed:</span>
                <span className="text-slate-800">{metrics.total_products}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-600">Low stock alert count:</span>
                <span className={metrics.low_stock_alerts > 0 ? 'text-rose-600' : 'text-slate-800'}>
                  {metrics.low_stock_alerts}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h4>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate('/checkout'); }}
                className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-sm shadow transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Launch POS Checkout</span>
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Product Performance Section */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Top Selling Products */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Top-Selling Products</h3>
                <p className="text-xs text-slate-500">Products with the highest sales volume</p>
              </div>
              <span className="bg-yellow-50 text-yellow-750 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-yellow-100 uppercase tracking-wider">
                Fast Moving
              </span>
            </div>

            <div className="flex-1">
              {topSelling.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm bg-yellow-50/50 rounded-xl border border-dashed border-yellow-200">
                  <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>No sales data recorded yet.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {topSelling.map((prod, idx) => {
                    const maxSold = topSelling[0]?.total_sold || 1;
                    const pct = (prod.total_sold / maxSold) * 100;

                    return (
                      <div key={prod.id} className="space-y-1">
                        <div className="flex justify-between text-sm font-semibold text-slate-800">
                          <div className="flex items-center space-x-2 truncate pr-4">
                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-650 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="truncate text-slate-700 font-semibold" title={prod.name}>{prod.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({prod.sku})</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-bold text-slate-800">{prod.total_sold} {prod.unit || 'pcs'}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">৳{parseFloat(prod.total_revenue).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dead Stock / Unsold Items */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Dead Stock (Unsold Items)</h3>
                <p className="text-xs text-slate-500">Products with stock but no transaction sales</p>
              </div>
              <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-rose-100 uppercase tracking-wider">
                Unsold Stock
              </span>
            </div>

            <div className="flex-1">
              {deadStock.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <svg className="w-8 h-8 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>No dead stock found. All inventory is moving!</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="p-2 pl-3">Product Name</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2 text-center">Available Stock</th>
                        <th className="p-2 text-right">Unit Price</th>
                        <th className="p-2 text-right pr-3">Value Tied Up</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deadStock.map((prod) => {
                        const tiedUpValue = prod.stock_quantity * parseFloat(prod.price);

                        return (
                          <tr key={prod.id} className="hover:bg-rose-50/20 transition-colors">
                            <td className="p-2.5 pl-3 font-semibold text-slate-700 max-w-[130px] truncate" title={prod.name}>
                              {prod.name}
                            </td>
                            <td className="p-2.5 text-slate-550 font-mono text-[10px]">{prod.sku}</td>
                            <td className="p-2.5 text-center font-bold text-slate-800">
                              {prod.stock_quantity} {prod.unit || 'pcs'}
                            </td>
                            <td className="p-2.5 text-right text-slate-600 font-medium">
                              ৳{parseFloat(prod.price).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right pr-3 font-extrabold text-rose-650">
                              ৳{tiedUpValue.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
