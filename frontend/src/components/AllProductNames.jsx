import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import API_BASE_URL from '../config';

export default function AllProductNames() {
  const { t, formatNumber } = useLanguage();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'shop_admin';
  
  const [suppliers, setSuppliers] = useState([]);
  const [productsBySupplier, setProductsBySupplier] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  
  // Add Product Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(null);
  
  // Form data for adding product
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    stock_quantity: '0',
    low_stock_threshold: '10',
    expiry_date: '',
    supplier_id: '',
    unit: 'piece',
    category: ''
  });

  // Fetch suppliers and their products
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all products
      const productsResponse = await fetch(`${API_BASE_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!productsResponse.ok) throw new Error('Failed to fetch products');
      const productsData = await productsResponse.json();

      // Fetch all suppliers
      const suppliersResponse = await fetch(`${API_BASE_URL}/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!suppliersResponse.ok) throw new Error('Failed to fetch suppliers');
      const suppliersData = await suppliersResponse.json();
      setSuppliers(suppliersData);

      // Group products by supplier
      const productsMap = {};
      const supplierMap = {};
      
      // Create a map of supplier ID to supplier info
      suppliersData.forEach(supplier => {
        supplierMap[supplier.id] = supplier;
      });

      // Group products by supplier_id
      productsData.forEach(product => {
        // Handle supplier_id as string or number for robust matching
        const supplierId = product.supplier_id ? String(product.supplier_id) : null;
        
        if (supplierId) {
          if (!productsMap[supplierId]) {
            productsMap[supplierId] = [];
          }
          productsMap[supplierId].push(product);
        } else {
          // Handle products without supplier_id
          if (!productsMap['no_supplier']) {
            productsMap['no_supplier'] = [];
          }
          productsMap['no_supplier'].push(product);
        }
      });
      
      console.log('Products by supplier:', productsMap);
      console.log('Total products:', productsData.length);
      console.log('Suppliers:', suppliersData);
      
      setProductsBySupplier(productsMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplier = (supplierId) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }));
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(2);
  };

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      price: '',
      cost_price: '',
      stock_quantity: '0',
      low_stock_threshold: '10',
      expiry_date: '',
      supplier_id: '',
      unit: 'piece',
      category: ''
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.cost_price) {
      triggerAlert('error', 'Please fill in all required fields.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          cost_price: parseFloat(formData.cost_price),
          stock_quantity: parseFloat(formData.stock_quantity || 0),
          low_stock_threshold: parseFloat(formData.low_stock_threshold || 10),
          expiry_date: formData.expiry_date || null,
          supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to create product.');

      triggerAlert('success', 'Product created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      triggerAlert('error', 'Please select a CSV file.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (csvFile.size > maxSize) {
      triggerAlert('error', 'CSV file is too large. Maximum size is 10MB. Please split your file into smaller batches.');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('csv_file', csvFile);

      const response = await fetch(`${API_BASE_URL}/products/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      // Handle response text first to catch JSON parsing errors
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse as JSON, if fails use the raw text
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || errorData.message || 'Failed to upload CSV.');
        } catch (parseError) {
          // If JSON parsing fails, the response might be HTML or malformed
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            throw new Error('Server returned an error response. Please check your CSV format and try again.');
          }
          throw new Error(`Upload failed: ${responseText.substring(0, 200)}...`);
        }
      }

      // Parse successful response
      let resData;
      try {
        resData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid server response. The upload may have succeeded but the response was corrupted.');
      }

      // Show detailed error messages if there are failures
      if (resData.error_count > 0 && resData.errors && resData.errors.length > 0) {
        const errorMsg = `${resData.message}\n\nErrors:\n${resData.errors.slice(0, 10).join('\n')}${resData.errors.length > 10 ? '\n...and ' + (resData.errors.length - 10) + ' more errors' : ''}`;
        triggerAlert('warning', errorMsg);
      } else {
        triggerAlert('success', resData.message || 'Products uploaded successfully!');
      }

      setShowCsvUploadModal(false);
      setCsvFile(null);
      fetchData();
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setUploading(false);
    }
  };

  // Filter suppliers and products based on search
  const filteredSuppliers = suppliers.filter(supplier => {
    if (!searchTerm) return true;
    
    const supplierMatch = supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const products = productsBySupplier[supplier.id] || [];
    const productMatch = products.some(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return supplierMatch || productMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-semibold">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center transition-all ${alert.type === 'success' ? 'bg-emerald-500 text-white' : alert.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
          }`}>
          <span className="text-sm font-semibold whitespace-pre-line">{alert.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('all_product_names', 'All Product Names')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('product_names_subtitle', 'View all products organized by supplier/company')}
          </p>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('search_products_suppliers', 'Search products or suppliers...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          {/* Action Buttons */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>{t('add_product', 'Add Product')}</span>
              </button>
              <button
                onClick={() => setShowCsvUploadModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-sm transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{t('upload_csv', 'Upload CSV')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">{t('total_suppliers', 'Total Suppliers')}</div>
          <div className="text-2xl font-bold text-slate-800">{formatNumber(suppliers.length)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">{t('total_products', 'Total Products')}</div>
          <div className="text-2xl font-bold text-slate-800">
            {formatNumber(Object.values(productsBySupplier).flat().length)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">{t('active_suppliers', 'Active Suppliers')}</div>
          <div className="text-2xl font-bold text-slate-800">
            {formatNumber(Object.keys(productsBySupplier).length)}
          </div>
        </div>
      </div>

      {/* Suppliers List */}
      <div className="space-y-4">
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500">{t('no_results_found', 'No results found')}</p>
          </div>
        ) : (
          <>
            {/* Products without supplier */}
            {productsBySupplier['no_supplier'] && productsBySupplier['no_supplier'].length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSupplier('no_supplier')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      ?
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-800">{t('no_supplier', 'No Supplier')}</h3>
                      <p className="text-sm text-slate-500">
                        {productsBySupplier['no_supplier'].length} {productsBySupplier['no_supplier'].length === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-slate-400 transition-transform ${expandedSuppliers['no_supplier'] ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedSuppliers['no_supplier'] && (
                  <div className="border-t border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Price</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {productsBySupplier['no_supplier'].map(product => (
                            <tr key={product.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                                {product.sku || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                {product.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                {formatCurrency(product.current_cost || product.cost_price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  {formatNumber(product.stock || product.stock_quantity || 0)} {product.unit || 'pcs'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700">
                                  {product.category || 'Uncategorized'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Products with suppliers */}
            {filteredSuppliers.map(supplier => {
              const supplierId = String(supplier.id);
              const products = productsBySupplier[supplierId] || [];
              const isExpanded = expandedSuppliers[supplierId];
              
              // Filter products if search term exists
              const filteredProducts = searchTerm 
                ? products.filter(p => 
                    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                : products;

              if (products.length === 0 && searchTerm) return null;

            return (
              <div key={supplier.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Supplier Header */}
                <button
                  onClick={() => toggleSupplier(supplierId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {supplier.name?.charAt(0).toUpperCase() || supplier.company?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-800">{supplier.name || supplier.company || 'Unknown Supplier'}</h3>
                      <p className="text-sm text-slate-500">
                        {supplier.company && supplier.name && `${supplier.company} • `}
                        {products.length} {products.length === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Products List */}
                {isExpanded && (
                  <div className="border-t border-slate-200">
                    {filteredProducts.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        {t('no_products_found', 'No products found for this supplier')}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Price</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map(product => (
                              <tr key={product.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                                  {product.sku || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                  {product.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {formatCurrency(product.current_cost || product.cost_price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                    {formatNumber(product.stock || product.stock_quantity || 0)} {product.unit || 'pcs'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                    {product.category || 'Uncategorized'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{t('add_new_product', 'Add New Product')}</h3>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('product_name', 'Product Name')} *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('sku', 'SKU')}</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('selling_price', 'Selling Price')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('cost_price', 'Cost Price')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('stock_quantity', 'Stock Quantity')}</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('low_stock_threshold', 'Low Stock Threshold')}</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('expiry_date', 'Expiry Date')}</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('supplier', 'Supplier')}</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('select_supplier', 'Select Supplier')}</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name || supplier.company}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('unit', 'Unit')}</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="piece">{t('piece', 'Piece')}</option>
                    <option value="kg">{t('kg', 'Kilogram')}</option>
                    <option value="liter">{t('liter', 'Liter')}</option>
                    <option value="box">{t('box', 'Box')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('category', 'Category')}</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t('add_product', 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{t('upload_products_csv', 'Upload Products CSV')}</h3>
            </div>
            <form onSubmit={handleCsvUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('select_csv_file', 'Select CSV File')}</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  {t('csv_format_note', 'CSV should contain columns: name, sku, price, cost_price, stock_quantity, supplier_name, category, unit')}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCsvUploadModal(false);
                    setCsvFile(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  disabled={uploading}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {uploading ? t('uploading', 'Uploading...') : t('upload', 'Upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
