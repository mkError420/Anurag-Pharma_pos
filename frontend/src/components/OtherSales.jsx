import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function OtherSales() {
  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = userObj.role === 'super_admin';

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
 
  // View Details Modal
  const [viewSale, setViewSale] = useState(null);
 
  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    sale_date: new Date().toBDISODateString(),
    notes: '',
    items: [ { category: 'Miscellaneous', item_name: '', quantity: 1, unit: 'qty', unit_price: '' } ]
  });
  
  const [submitting, setSubmitting] = useState(false);
 
  // Pagination & Filters for Recent History
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
 
  const fetchSales = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/other-sales?`;
      if (isSuperAdmin && selectedShopId) {
        url += `shop_id=${selectedShopId}&`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve sale records.');
      const data = await response.json();

      // Filter by date and search term client-side for better control
      let filteredData = data;

      // Filter by start date
      if (filterStartDate) {
        filteredData = filteredData.filter(sale => {
          const saleDate = sale.sale_date ? sale.sale_date.split('T')[0] : '';
          return saleDate >= filterStartDate;
        });
      }

      // Filter by end date
      if (filterEndDate) {
        filteredData = filteredData.filter(sale => {
          const saleDate = sale.sale_date ? sale.sale_date.split('T')[0] : '';
          return saleDate <= filterEndDate;
        });
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(sale => {
          const title = (sale.title || '').toLowerCase();
          const customerName = (sale.customer_name || '').toLowerCase();
          const items = parseItems(sale.items);
          const itemNames = items.map(item => (item.item_name || '').toLowerCase()).join(' ');
          const categories = items.map(item => (item.category || '').toLowerCase()).join(' ');

          return title.includes(searchLower) ||
                 customerName.includes(searchLower) ||
                 itemNames.includes(searchLower) ||
                 categories.includes(searchLower);
        });
      }

      setSales(filteredData);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total amount by category
  const getCategoryTotal = (category) => {
    return sales.reduce((total, sale) => {
      const items = parseItems(sale.items);
      const categoryItems = items.filter(item => {
        const itemCategory = item.category || '';
        return itemCategory.trim() === category.trim();
      });
      const categoryTotal = categoryItems.reduce((sum, item) => {
        if (category === 'Mobile Banking Services' || category === 'Banking Transaction') {
          return sum + (parseFloat(item.unit_price) || 0);
        } else {
          return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
        }
      }, 0);
      return total + categoryTotal;
    }, 0);
  };
 
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchShops = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/shops`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setShops(data);
          }
        } catch (err) {
          console.error('Failed to fetch shops:', err);
        }
      };
      fetchShops();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchSales();
  }, [selectedShopId]);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = (defaultCategory = 'Miscellaneous', defaultName = '') => {
    setFormData({
      ...formData,
      items: [...formData.items, { category: defaultCategory, item_name: defaultName, quantity: 1, unit: 'qty', unit_price: '' }]
    });
  };

  const handleQuickCategoryClick = (category, defaultName) => {
    // If the first item is completely empty, replace it
    if (formData.items.length === 1 && !formData.items[0].item_name && !formData.items[0].unit_price) {
      const newItems = [...formData.items];
      newItems[0].category = category;
      newItems[0].item_name = defaultName;
      setFormData({ ...formData, items: newItems });
    } else {
      // Otherwise add a new item
      addItem(category, defaultName);
    }
    // Open the entry form when a quick category is clicked
    setShowEntryForm(true);
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const formatCurrencyPDF = (val) => {
    const numericVal = parseFloat(val || 0);
    return `Tk ${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Other Sales History', 14, 15);
    
    if (filterStartDate || filterEndDate) {
      doc.setFontSize(10);
      doc.text(`Date Range: ${filterStartDate || '...'} to ${filterEndDate || '...'}`, 14, 22);
    }
    
    const tableData = sales.map(sale => {
       const items = parseItems(sale.items).map(i => `${i.item_name} (${i.category})`).join(', ');
       return [
         formatDate(sale.sale_date),
         sale.title || 'Other Sale',
         sale.customer_name || 'Walk-in',
         formatCurrencyPDF(sale.amount),
         items
       ];
    });

    autoTable(doc, {
      head: [['Date', 'Title', 'Customer', 'Amount', 'Items']],
      body: tableData,
      startY: (filterStartDate || filterEndDate) ? 28 : 22,
      styles: { fontSize: 8 },
    });
    
    doc.save('OtherSales_History.pdf');
  };

  const calculateGrandTotal = () => {
    return formData.items.reduce((total, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return total + (item.category === 'Mobile Banking Services' || item.category === 'Banking Transaction' ? price : (qty * price));
    }, 0);
  };

  const handleEdit = (sale) => {
    const items = parseItems(sale.items);
    setEditingSale(sale);
    setFormData({
      customer_name: sale.customer_name || '',
      customer_phone: sale.customer_phone || '',
      sale_date: sale.sale_date ? sale.sale_date.split('T')[0] : new Date().toBDISODateString(),
      notes: sale.notes || '',
      items: items.length > 0 ? items.map(i => ({
        category: i.category || 'Miscellaneous',
        item_name: i.item_name || '',
        quantity: i.quantity || 1,
        unit: i.unit || 'qty',
        unit_price: i.unit_price || ''
      })) : [{ category: 'Miscellaneous', item_name: '', quantity: 1, unit: 'qty', unit_price: '' }]
    });
    setViewSale(null);
    setShowEntryForm(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sale_date) {
      triggerAlert('error', 'Please provide a sale date.');
      return;
    }
    
    // Validate items
    const validItems = formData.items.filter(i => i.item_name.trim() !== '' && parseFloat(i.unit_price) > 0);
    if (validItems.length === 0) {
      triggerAlert('error', 'Please add at least one valid item with a price.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingSale
        ? `${API_BASE_URL}/other-sales/${editingSale.id}`
        : `${API_BASE_URL}/other-sales`;
      const method = editingSale ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          sale_date: formData.sale_date,
          notes: formData.notes,
          items: validItems
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || (editingSale ? 'Failed to update sale entry.' : 'Failed to record sale entry.'));

      triggerAlert('success', editingSale ? 'Sale entry updated successfully!' : 'Sale entry recorded successfully!');
      resetForm();
      setShowEntryForm(false);
      fetchSales();
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale record?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/other-sales/${saleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete sale record.');

      triggerAlert('success', 'Sale record deleted successfully!');
      if (viewSale && viewSale.id === saleId) setViewSale(null);
      fetchSales();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const resetForm = () => {
    setEditingSale(null);
    setFormData({
      customer_name: '',
      customer_phone: '',
      sale_date: new Date().toBDISODateString(),
      notes: '',
      items: [ { category: 'Miscellaneous', item_name: '', quantity: 1, unit: 'qty', unit_price: '' } ]
    });
  };

  const formatCurrency = (val) => `৳${parseFloat(val).toFixed(2)}`;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }
    return new Date(dateStr).toLocaleDateString();
  };

  const parseItems = (itemsStr) => {
    if (!itemsStr) return [];
    if (Array.isArray(itemsStr)) return itemsStr;
    if (typeof itemsStr === 'object') return [itemsStr];
    try {
      return JSON.parse(itemsStr);
    } catch (e) {
      return [];
    }
  };

  const CATEGORIES = [
    'Wastage / Scrap',
    'Mobile Banking Services',
    'Banking Transaction',
    'Miscellaneous'
  ];

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center transition-all ${
          alert.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          <span className="text-sm font-semibold">{alert.message}</span>
        </div>
      )}
 
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inflow & Transactions</h2>
          <p className="text-sm text-slate-500">Record sales of miscellaneous goods, scrap, or services</p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant Shop:</span>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-700 font-medium text-sm bg-white"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
 
      {/* Quick Category Shortcuts + Cart Button */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Quick Entry Shortcuts</h3>
          {/* Cart Button — opens Quick Entry Form modal */}
          <button
            onClick={() => setShowEntryForm(true)}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm shadow-xs transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span>New Entry</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => handleQuickCategoryClick('Wastage / Scrap', '')}
            className="flex flex-col items-start p-4 bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200 rounded-2xl hover:shadow-md hover:border-rose-300 transition-all text-left"
          >
            <div className="bg-rose-100 text-rose-600 p-2 rounded-lg mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">Wastage / Scrap</span>
            <span className="text-xs text-slate-500 mt-1">Damaged goods, expired items</span>
            <span className="text-xs font-bold text-rose-600 mt-2">{formatCurrency(getCategoryTotal('Wastage / Scrap'))}</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleQuickCategoryClick('Mobile Banking Services', 'Cash-In/Out: ')}
            className="flex flex-col items-start p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl hover:shadow-md hover:border-blue-300 transition-all text-left"
          >
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">Mobile Banking</span>
            <span className="text-xs text-slate-500 mt-1">bKash, Nagad, Recharge</span>
            <span className="text-xs font-bold text-blue-600 mt-2">{formatCurrency(getCategoryTotal('Mobile Banking Services'))}</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCategoryClick('Banking Transaction', 'Transaction: ')}
            className="flex flex-col items-start p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-2xl hover:shadow-md hover:border-purple-300 transition-all text-left"
          >
            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">Banking Transaction</span>
            <span className="text-xs text-slate-500 mt-1">Bank Deposits, Withdrawals, Transfers</span>
            <span className="text-xs font-bold text-purple-600 mt-2">{formatCurrency(getCategoryTotal('Banking Transaction'))}</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCategoryClick('Miscellaneous', '')}
            className="flex flex-col items-start p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl hover:shadow-md hover:border-emerald-300 transition-all text-left"
          >
            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">Miscellaneous</span>
            <span className="text-xs text-slate-500 mt-1">Pallets, Bags, Fees</span>
            <span className="text-xs font-bold text-emerald-600 mt-2">{formatCurrency(getCategoryTotal('Miscellaneous'))}</span>
          </button>
        </div>
      </div>

      {/* Recent History — now full-width, in main content area */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent History</h3>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg">
                {sales.length}
              </span>
              <button onClick={exportPDF} className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-1 px-2.5 rounded-lg transition-colors flex items-center shadow-sm">
                PDF Export
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); fetchSales(); }}
              placeholder="Search by title, customer, item, or category..."
              className="border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none flex-1"
            />
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => { setFilterStartDate(e.target.value); fetchSales(); }}
              className="border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none flex-1"
            />
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => { setFilterEndDate(e.target.value); fetchSales(); }}
              className="border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none flex-1"
            />
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStartDate('');
                setFilterEndDate('');
                fetchSales();
              }}
              className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="p-3">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">Loading history...</div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
              <svg className="w-12 h-12 mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">No recent entries found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {(() => {
                    const totalPages = Math.ceil(sales.length / itemsPerPage) || 1;
                    const currentSales = sales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                    return currentSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-semibold text-slate-700">{formatDate(sale.sale_date)}</td>
                        <td className="p-4 font-bold text-slate-800">{sale.title || 'Custom Sale'}</td>
                        <td className="p-4 text-slate-600 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {sale.customer_name || 'Walk-in'}
                        </td>
                        <td className="p-4 font-black text-emerald-600">{formatCurrency(sale.amount)}</td>
                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setViewSale(sale)}
                            className="text-emerald-600 hover:text-emerald-900 font-semibold text-xs border border-emerald-100 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(sale)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs border border-indigo-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="text-rose-600 hover:text-rose-900 font-semibold text-xs border border-rose-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {sales.length > 0 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex flex-wrap justify-center items-center gap-3 text-xs font-bold text-slate-500 mt-auto">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            <span>Page {currentPage} of {Math.ceil(sales.length / itemsPerPage) || 1}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(sales.length / itemsPerPage) || 1, p + 1))}
              disabled={currentPage === (Math.ceil(sales.length / itemsPerPage) || 1)}
              className="px-3 py-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* QUICK ENTRY FORM MODAL */}
      {showEntryForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {editingSale ? `Edit Sale #${editingSale.id}` : 'Quick Entry Form'}
              </h3>
              <button
                onClick={() => setShowEntryForm(false)}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleAddSubmit} className="space-y-5" id="quick-entry-form">
                {/* Customer & Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Name</label>
                      <input
                        type="text"
                        name="customer_name"
                        value={formData.customer_name}
                        onChange={handleInputChange}
                        placeholder="Optional"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                      <input
                        type="text"
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleInputChange}
                        placeholder="Optional"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sale Date *</label>
                    <input
                      type="date"
                      name="sale_date"
                      value={formData.sale_date}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Items / Services
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Add products, services, or transactions to this entry</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="group relative bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 overflow-hidden">
                        {/* Item Header with Index and Remove Button */}
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                              {index + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Line Item</span>
                          </div>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="flex items-center space-x-1 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors"
                              title="Remove Item"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        
                        {/* Item Content */}
                        <div className="p-4 space-y-4">
                          {/* All Fields in Single Row */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-3 space-y-1.5">
                              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Sale Category
                              </label>
                              <select
                                value={item.category}
                                onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white shadow-sm transition-all"
                              >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Item / Description
                              </label>
                              <input
                                type="text"
                                value={item.item_name}
                                onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                placeholder='e.g., "50kg Old Cartons" or "Mobile Cash-In Fee"'
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white shadow-sm transition-all placeholder:text-slate-400"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                {item.category === 'Mobile Banking Services' || item.category === 'Banking Transaction' ? 'Amount' : 'Qty'}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                  required
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white shadow-sm transition-all pr-14"
                                />
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                  placeholder="unit"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-600 focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-100"
                                />
                              </div>
                            </div>
                            <div className="md:col-span-3 space-y-1.5">
                              <label className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Unit Price (৳)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                required
                                placeholder="Price"
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white shadow-sm transition-all"
                              />
                            </div>
                          </div>

                          {/* Subtotal Row */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-200/50">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider">Line Subtotal</span>
                              <span className="text-xs text-emerald-600/60 font-medium">
                                {item.category === 'Mobile Banking Services' || item.category === 'Banking Transaction' ? 'Commission Amount' : 'Quantity × Price'}
                              </span>
                            </div>
                            <span className="font-black text-emerald-600 text-xl">
                              {formatCurrency(
                                item.category === 'Mobile Banking Services' || item.category === 'Banking Transaction'
                                  ? (parseFloat(item.unit_price) || 0) 
                                  : ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => addItem()}
                      className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-50 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-200/50 text-emerald-700 border-2 border-dashed border-emerald-300 hover:border-emerald-400 rounded-xl py-3 text-sm font-bold transition-all duration-200 group"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add Another Item / Service</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Reference</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Payment receipt ref, paid by cash, etc."
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-50/50"
                    />
                  </div>
                  <div className="flex flex-col justify-end items-end space-y-3 bg-gradient-to-br from-emerald-50 to-emerald-100/30 p-5 rounded-2xl border border-emerald-100">
                    <div className="flex justify-between w-full text-emerald-800/70 text-sm">
                      <span className="font-semibold uppercase tracking-wider">
                        {formData.items.every(i => i.category === 'Mobile Banking Services' || i.category === 'Banking Transaction') ? 'Total Transactions:' : 'Total Items/Rows:'}
                      </span>
                      <span className="font-bold">{formData.items.length}</span>
                    </div>
                    <div className="w-full h-px bg-emerald-200/50"></div>
                    <div className="flex justify-between items-center w-full text-emerald-800">
                      <span className="font-black text-sm uppercase tracking-wider">Grand Total:</span>
                      <span className="font-black text-2xl drop-shadow-sm">{formatCurrency(calculateGrandTotal())}</span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end items-center space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Clear Form
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowEntryForm(false);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="quick-entry-form"
                disabled={submitting}
                className="px-8 py-2.5 bg-slate-500 hover:bg-slate-600 text-white rounded-xl text-sm font-black tracking-wide transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? 'Processing...' : (editingSale ? 'Update Transaction' : 'Complete Transaction')}
                {!submitting && (
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SALE MODAL */}
      {viewSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Sale Details <span className="ml-2 text-sm font-semibold text-slate-400 font-mono">#{viewSale.id}</span>
              </h3>
              <button onClick={() => setViewSale(null)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</div>
                  <div className="font-bold text-slate-700">{formatDate(viewSale.sale_date)}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 md:col-span-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer</div>
                  <div className="font-bold text-slate-700">{viewSale.customer_name || 'Walk-in'}</div>
                  {viewSale.customer_phone && <div className="text-sm font-medium text-slate-500 mt-0.5">{viewSale.customer_phone}</div>}
                </div>
                {isSuperAdmin && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 md:col-span-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tenant Shop</div>
                    <div className="font-bold text-slate-700">{viewSale.shop_name}</div>
                  </div>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Itemized Breakdown</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Category / Item</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parseItems(viewSale.items).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-700">{item.item_name}</div>
                          {item.category && <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{item.category}</div>}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-slate-600">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-800">
                          {formatCurrency(item.subtotal || (item.quantity * item.unit_price))}
                        </td>
                      </tr>
                    ))}
                    {parseItems(viewSale.items).length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-6 text-center text-slate-400 text-sm font-medium">
                          No itemized details for this legacy record.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-emerald-50/50 border-t-2 border-emerald-100">
                    <tr>
                      <td colSpan="3" className="px-4 py-4 text-right font-bold text-emerald-800 uppercase text-xs tracking-wider">Total Amount:</td>
                      <td className="px-4 py-4 text-right font-black text-emerald-600 text-xl">{formatCurrency(viewSale.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {viewSale.notes && (
                <div className="bg-amber-50/50 text-amber-800 p-4 rounded-xl text-sm border border-amber-100/50 shadow-sm">
                  <span className="font-bold uppercase text-[10px] tracking-wider block mb-1.5 opacity-70">Notes / Reference</span>
                  <p className="font-medium">{viewSale.notes}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => handleDelete(viewSale.id)}
                className="px-4 py-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleEdit(viewSale)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center space-x-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setViewSale(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
