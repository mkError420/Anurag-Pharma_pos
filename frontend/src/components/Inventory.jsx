import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Adjustments from './Adjustments';
import API_BASE_URL from '../config';

export default function Inventory() {
  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = userObj.role === 'super_admin';

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('inventory');

  // Stock & Sales History state
  const [selectedHistoryProductId, setSelectedHistoryProductId] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [historyViewTab, setHistoryViewTab] = useState('detailed');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const [historySearchFocusedIndex, setHistorySearchFocusedIndex] = useState(-1);

  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocusedIndex, setSearchFocusedIndex] = useState(-1);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyInputValue, setCompanyInputValue] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');

  // Selected letter for alphabetical filtering
  const [selectedLetter, setSelectedLetter] = useState('');
  const [showStockDistribution, setShowStockDistribution] = useState(false);

  // Available unique companies/suppliers from suppliers and products list
  const availableCompanies = useMemo(() => {
    const compMap = new Map();
    suppliers.forEach(s => {
      if (s && s.name && s.name.trim()) {
        compMap.set(s.name.trim().toLowerCase(), { id: s.id, name: s.name.trim() });
      }
    });
    products.forEach(p => {
      if (p.supplier_name && p.supplier_name.trim()) {
        const name = p.supplier_name.trim();
        const key = name.toLowerCase();
        if (!compMap.has(key)) {
          compMap.set(key, { id: p.supplier_id || name, name });
        }
      }
    });
    return Array.from(compMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, products]);

  // Filter and sort products alphabetically, by search, and by active alert filters
  const filteredProducts = products
    .filter(p => {
      // Exclude expired products with 0 stock (returned to company / discarded)
      const stock = parseFloat(p.stock_quantity || 0);
      let isExpired = false;
      if (p.expiry_date) {
        const exp = new Date(p.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isExpired = exp.getTime() < today.getTime();
      }
      if (isExpired && stock <= 0) {
        return false;
      }

      // Filter by selected company/supplier (supports partial typing)
      if (selectedCompany) {
        const prodSupplierName = (p.supplier_name || '').trim().toLowerCase();
        const targetName = selectedCompany.trim().toLowerCase();

        // Partial match on supplier_name (supports live typing)
        const matchName = prodSupplierName && prodSupplierName.includes(targetName);

        // Check via suppliers list for extra accuracy
        const matchingSupplier = suppliers.find(s =>
          s.name && s.name.trim().toLowerCase().includes(targetName)
        );
        const matchSupplierObj = matchingSupplier
          ? prodSupplierName === matchingSupplier.name.trim().toLowerCase()
          : false;

        if (!matchName && !matchSupplierObj) return false;
      }

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = p.name && p.name.toLowerCase().includes(searchLower);
        const matchesSku = p.sku && p.sku.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesSku) return false;
      }
      // Filter by selected letter
      if (selectedLetter && (!p.name || !p.name.trim().toUpperCase().startsWith(selectedLetter))) {
        return false;
      }
      // Filter by low stock if lowStockFilter is on and expiryFilter is off
      if (lowStockFilter && !expiryFilter) {
        return stock > 0 && stock <= parseFloat(p.low_stock_threshold || 10);
      }
      // Filter by expiry if expiryFilter is on and lowStockFilter is off
      if (expiryFilter && !lowStockFilter) {
        if (!p.expiry_date || stock <= 0) return false;
        const exp = new Date(p.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const t30 = new Date();
        t30.setHours(0, 0, 0, 0);
        t30.setDate(t30.getDate() + 30);
        return exp.getTime() <= t30.getTime();
      }
      // If both filters are on, match either
      if (lowStockFilter && expiryFilter) {
        const isLow = stock > 0 && stock <= parseFloat(p.low_stock_threshold || 10);
        let isExp = false;
        if (p.expiry_date && stock > 0) {
          const exp = new Date(p.expiry_date);
          exp.setHours(0, 0, 0, 0);
          const t30 = new Date();
          t30.setHours(0, 0, 0, 0);
          t30.setDate(t30.getDate() + 30);
          isExp = exp.getTime() <= t30.getTime();
        }
        return isLow || isExp;
      }
      return true;
    })
    .sort((a, b) => {
      // If expiry filter is active, sort products with earliest expiry / expired first
      if (expiryFilter) {
        if (a.expiry_date && b.expiry_date) {
          return new Date(a.expiry_date) - new Date(b.expiry_date);
        }
        if (a.expiry_date) return -1;
        if (b.expiry_date) return 1;
      }
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });


  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [batchesData, setBatchesData] = useState(null);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState(null);
  const [showAddBatchForm, setShowAddBatchForm] = useState(false);
  const [batchFormData, setBatchFormData] = useState({ quantity: '', cost_price: '', expiry_date: '', received_date: new Date().toISOString().split('T')[0], notes: '', supplier_id: '' });
  const [batchFormSubmitting, setBatchFormSubmitting] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editBatchData, setEditBatchData] = useState({});
  const [batchAlert, setBatchAlert] = useState(null);

  // Sale Details Modal state for Detailed Ledger Ref ID click
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const [saleDetailsData, setSaleDetailsData] = useState(null);
  const [saleDetailsLoading, setSaleDetailsLoading] = useState(false);
  const [saleDetailsError, setSaleDetailsError] = useState(null);

  const fetchSaleDetailsForRef = async (saleId) => {
    if (!saleId) return;
    setShowSaleDetailsModal(true);
    setSaleDetailsLoading(true);
    setSaleDetailsError(null);
    setSaleDetailsData(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errRes = await response.json().catch(() => ({}));
        throw new Error(errRes.error || 'Failed to retrieve sale details.');
      }
      const data = await response.json();
      setSaleDetailsData(data);
    } catch (err) {
      setSaleDetailsError(err.message);
    } finally {
      setSaleDetailsLoading(false);
    }
  };

  const handlePrintSaleDetails = (mode = 'regular') => {
    if (mode === 'thermal') {
      document.body.classList.add('print-mode-thermal');
    } else {
      document.body.classList.remove('print-mode-thermal');
    }
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-mode-thermal');
    }, 500);
  };

  const handleViewBatches = async (product) => {
    setShowBatchesModal(true);
    setBatchesLoading(true);
    setBatchesError(null);
    setBatchesData(null);
    setShowAddBatchForm(false);
    setEditingBatchId(null);
    setBatchAlert(null);
    setCurrentProduct(product);
    setBatchFormData({
      quantity: '',
      cost_price: product.cost_price || '',
      expiry_date: '',
      received_date: new Date().toISOString().split('T')[0],
      notes: '',
      supplier_id: product.supplier_id || ''
    });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/${product.id}/batches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errRes = await response.json().catch(() => ({}));
        throw new Error(errRes.error || 'Failed to retrieve product batches.');
      }
      const data = await response.json();
      setBatchesData(data);
    } catch (err) {
      setBatchesError(err.message);
    } finally {
      setBatchesLoading(false);
    }
  };

  const triggerBatchAlert = (type, message) => {
    setBatchAlert({ type, message });
    setTimeout(() => setBatchAlert(null), 4000);
  };

  const handleCreateBatchSubmit = async (e) => {
    e.preventDefault();
    if (!currentProduct) return;
    if (!batchFormData.quantity || parseFloat(batchFormData.quantity) <= 0) {
      triggerBatchAlert('error', 'Please enter a valid quantity.');
      return;
    }
    if (batchFormData.cost_price === '' || parseFloat(batchFormData.cost_price) < 0) {
      triggerBatchAlert('error', 'Please enter a valid cost price.');
      return;
    }

    setBatchFormSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/${currentProduct.id}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: parseInt(batchFormData.quantity),
          cost_price: parseFloat(batchFormData.cost_price),
          expiry_date: batchFormData.expiry_date || null,
          received_date: batchFormData.received_date || null,
          notes: batchFormData.notes || null,
          supplier_id: batchFormData.supplier_id ? parseInt(batchFormData.supplier_id) : null
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to create batch.');

      triggerBatchAlert('success', resData.message || 'Batch created successfully!');
      setShowAddBatchForm(false);
      setBatchFormData({
        quantity: '',
        cost_price: currentProduct.cost_price || '',
        expiry_date: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        supplier_id: currentProduct.supplier_id || ''
      });

      // Refresh product list and batches
      fetchProducts();
      handleViewBatches(currentProduct);
    } catch (err) {
      triggerBatchAlert('error', err.message);
    } finally {
      setBatchFormSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch? The batch stock will be deducted from product total stock.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/${currentProduct.id}/batches/${batchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete batch.');

      triggerBatchAlert('success', 'Batch deleted successfully!');
      fetchProducts();
      handleViewBatches(currentProduct);
    } catch (err) {
      triggerBatchAlert('error', err.message);
    }
  };

  const handleSaveEditBatch = async (batchId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/${currentProduct.id}/batches/${batchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: parseInt(editBatchData.quantity),
          cost_price: parseFloat(editBatchData.cost_price),
          expiry_date: editBatchData.expiry_date || null,
          received_date: editBatchData.received_date || null
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update batch.');

      triggerBatchAlert('success', 'Batch updated successfully!');
      setEditingBatchId(null);
      fetchProducts();
      handleViewBatches(currentProduct);
    } catch (err) {
      triggerBatchAlert('error', err.message);
    }
  };

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    expiry_date: '',
    supplier_id: '',
    unit: 'piece'
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/products?search=${encodeURIComponent(search)}${lowStockFilter ? '&low_stock=true' : ''
        }${expiryFilter ? '&expiring=true' : ''
        }`;
      if (isSuperAdmin && selectedShopId) {
        url += `&shop_id=${selectedShopId}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve inventory.');
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    if (isSuperAdmin) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSuppliers(await response.json());
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts();
  }, [search, lowStockFilter, expiryFilter, selectedShopId]);

  useEffect(() => {
    fetchSuppliers();
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
    const fetchHistory = async () => {
      if (activeTab !== 'history' || !selectedHistoryProductId) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const token = localStorage.getItem('token');
        let url = `${API_BASE_URL}/products/${selectedHistoryProductId}/stock-sales-history?`;
        if (historyStartDate) url += `start_date=${historyStartDate}&`;
        if (historyEndDate) url += `end_date=${historyEndDate}&`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch history.');
        }
        const data = await response.json();
        setHistoryData(data);
      } catch (err) {
        setHistoryError(err.message);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [activeTab, selectedHistoryProductId, historyStartDate, historyEndDate]);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 1. CREATE PRODUCT
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.price || !formData.cost_price) {
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
      fetchProducts();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  // 2. OPEN EDIT MODAL
  const openEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : '',
      supplier_id: product.supplier_id || '',
      unit: product.unit || 'piece',
      category: product.category || ''
    });
    setShowEditModal(true);
  };

  // 3. UPDATE PRODUCT
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/${currentProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          cost_price: parseFloat(formData.cost_price),
          stock_quantity: parseFloat(formData.stock_quantity),
          low_stock_threshold: parseFloat(formData.low_stock_threshold),
          expiry_date: formData.expiry_date || null,
          supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update product.');

      triggerAlert('success', 'Product updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  // 4. DELETE PRODUCT
  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete product.');

      triggerAlert('success', 'Product deleted successfully!');
      fetchProducts();
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} selected product(s)?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_ids: selectedProducts })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to bulk delete products.');

      if (resData.failure_count > 0) {
        triggerAlert('error', `Deleted ${resData.success_count} products, but failed to delete ${resData.failure_count} (likely tied to past sales).`);
      } else {
        triggerAlert('success', `Successfully deleted ${resData.success_count} products!`);
      }

      setSelectedProducts([]);
      fetchProducts();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      price: '',
      cost_price: '',
      stock_quantity: '',
      low_stock_threshold: '10',
      expiry_date: '',
      supplier_id: '',
      unit: 'piece',
      category: ''
    });
    setCurrentProduct(null);
  };

  const exportToCSV = () => {
    const productsToExport = filteredProducts;
    if (productsToExport.length === 0) {
      triggerAlert('error', 'No products to export.');
      return;
    }

    const headers = isSuperAdmin
      ? ['ID', 'SKU', 'Shop Name', 'Product Name', 'Category', 'Company Name', 'Cost Price', 'Sale Price', 'Stock Quantity', 'Unit', 'Low Stock Threshold', 'Expiry Date']
      : ['ID', 'SKU', 'Product Name', 'Category', 'Company Name', 'Cost Price', 'Sale Price', 'Stock Quantity', 'Unit', 'Low Stock Threshold', 'Expiry Date'];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (/[",\n\r]/.test(str)) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = productsToExport.map(p => {
      const companyName = p.supplier_name || (suppliers.find(s => s.id === p.supplier_id)?.name) || 'N/A';
      if (isSuperAdmin) {
        return [
          p.id,
          escapeCSV(p.sku),
          escapeCSV(p.shop_name || 'N/A'),
          escapeCSV(p.name),
          escapeCSV(p.category || ''),
          escapeCSV(companyName),
          parseFloat(p.cost_price || 0).toFixed(2),
          parseFloat(p.price || 0).toFixed(2),
          p.stock_quantity,
          escapeCSV(p.unit || 'piece'),
          p.low_stock_threshold,
          p.expiry_date ? p.expiry_date.split('T')[0] : 'N/A'
        ];
      }
      return [
        p.id,
        escapeCSV(p.sku),
        escapeCSV(p.name),
        escapeCSV(p.category || ''),
        escapeCSV(companyName),
        parseFloat(p.cost_price || 0).toFixed(2),
        parseFloat(p.price || 0).toFixed(2),
        p.stock_quantity,
        escapeCSV(p.unit || 'piece'),
        p.low_stock_threshold,
        p.expiry_date ? p.expiry_date.split('T')[0] : 'N/A'
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_catalog_${new Date().toBDISODateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert('success', 'Catalog exported successfully!');
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      triggerAlert('error', 'Please select a CSV file.');
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

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to upload CSV.');

      // Show detailed error messages if there are failures
      if (resData.error_count > 0 && resData.errors && resData.errors.length > 0) {
        const errorMsg = `${resData.message}\n\nErrors:\n${resData.errors.join('\n')}`;
        triggerAlert('warning', errorMsg);
      } else {
        triggerAlert('success', resData.message || 'Products uploaded successfully!');
      }

      setShowCsvUploadModal(false);
      setCsvFile(null);
      fetchProducts();
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setUploading(false);
    }
  };
  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastProduct = itemsPerPage === 0 ? filteredProducts.length : currentPage * itemsPerPage;
  const indexOfFirstProduct = itemsPerPage === 0 ? 0 : indexOfLastProduct - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const selectedHistoryProduct = products.find(p => String(p.id) === String(selectedHistoryProductId));
  const historyProductUnit = selectedHistoryProduct ? selectedHistoryProduct.unit : '';

  return (
    <div className="space-y-6">

      {/* Alerts Banner */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center transition-all ${alert.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
          <span className="text-sm font-semibold">{alert.message}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl flex-1">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'inventory'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            Inventory Catalog
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'adjustments'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            Adjustments
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            Stock & Sales History
          </button>
        </div>
        {activeTab === 'inventory' && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {!isSuperAdmin && (
              <>
                <button
                  onClick={() => setShowCsvUploadModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-xs transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="hidden sm:inline">Import CSV</span>
                  <span className="sm:hidden">Import</span>
                </button>
                <button
                  onClick={() => setShowStockDistribution(!showStockDistribution)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-3 border border-slate-200 rounded-xl text-xs shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">{showStockDistribution ? 'Hide' : 'Show'} Stock</span>
                  <span className="sm:hidden">{showStockDistribution ? 'Hide' : 'Show'}</span>
                </button>
              </>
            )}
            {!isSuperAdmin && (
              <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-xs transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Product</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
            <button
              onClick={exportToCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 border border-slate-200 rounded-xl text-sm shadow-xs transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export Catalog</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <>
          {/* Title Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-800">Inventory Catalog</h2>
              <p className="text-sm text-slate-500">Manage shop items, monitor levels, and set restock alerts</p>
              {/* Product Count Summary */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  onClick={() => { setLowStockFilter(false); setExpiryFilter(false); setSelectedLetter(''); setSelectedCompany(''); setCompanyInputValue(''); }}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Show all products"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3H8a1 1 0 00-1 1v3h10V4a1 1 0 00-1-1z" />
                  </svg>
                  Total: {products.length} products
                </button>
                {filteredProducts.length !== products.length && (
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                    </svg>
                    Filtered: {filteredProducts.length} products
                  </span>
                )}
                {selectedCompany && (
                  <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-lg text-xs font-bold">
                    <span>Company: {selectedCompany}</span>
                    <button
                      onClick={() => { setSelectedCompany(''); setCompanyInputValue(''); setCurrentPage(1); }}
                      className="hover:text-indigo-950 font-extrabold ml-1 cursor-pointer"
                      title="Clear company filter"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setLowStockFilter(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    lowStockFilter
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'
                  }`}
                  title="Click to toggle Low Stock filter"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${lowStockFilter ? 'bg-white' : 'bg-rose-500'}`}></span>
                  Low Stock: {products.filter(p => {
                    const stock = parseFloat(p.stock_quantity || 0);
                    return stock > 0 && stock <= parseFloat(p.low_stock_threshold || 10);
                  }).length}
                </button>
                <button
                  onClick={() => setExpiryFilter(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    expiryFilter
                      ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                  title="Click to toggle Expired/Expiring filter"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${expiryFilter ? 'bg-white' : 'bg-amber-500'}`}></span>
                  Expired / Expiring: {products.filter(p => {
                    if (!p.expiry_date) return false;
                    const stock = parseFloat(p.stock_quantity || 0);
                    if (stock <= 0) return false; // Exclude returned/out-of-stock items
                    const exp = new Date(p.expiry_date);
                    exp.setHours(0, 0, 0, 0);
                    const t30 = new Date();
                    t30.setHours(0, 0, 0, 0);
                    t30.setDate(t30.getDate() + 30);
                    return exp.getTime() <= t30.getTime();
                  }).length}
                </button>
              </div>
            </div>

            {/* Alphabetical Index */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alphabetical Index</h4>
                {selectedLetter && (
                  <button
                    onClick={() => { setSelectedLetter(''); setCurrentPage(1); }}
                    className="text-xs font-bold text-yellow-600 hover:text-yellow-800 transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => { setSelectedLetter(''); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${selectedLetter === ''
                    ? 'bg-indigo-100 text-indigo-800 shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                >
                  All
                </button>
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
                  const count = products.filter(p => {
                    const stock = parseFloat(p.stock_quantity || 0);
                    let isExpired = false;
                    if (p.expiry_date) {
                      const exp = new Date(p.expiry_date);
                      exp.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      isExpired = exp.getTime() < today.getTime();
                    }
                    if (isExpired && stock <= 0) return false;
                    return p.name && p.name.trim().toUpperCase().startsWith(letter);
                  }).length;
                  const isSelected = selectedLetter === letter;

                  return (
                    <button
                      key={letter}
                      onClick={() => { setSelectedLetter(letter); setCurrentPage(1); }}
                      className={`min-w-[28px] px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${isSelected
                        ? 'bg-indigo-100 text-indigo-800 shadow-xs'
                        : count > 0
                          ? 'bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50 border border-indigo-100/50'
                          : 'bg-slate-50/50 text-slate-400 opacity-60 cursor-pointer'
                        }`}
                    >
                      <span>{letter}</span>
                      {count > 0 && (
                        <span className={`text-[8px] px-1 py-0.25 rounded-full ${isSelected ? 'bg-indigo-500 text-white' : 'bg-yellow-600 text-black font-semibold'
                          }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {!isSuperAdmin && selectedProducts.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold py-2.5 px-5 rounded-xl text-sm shadow-xs transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Selected ({selectedProducts.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">

            {/* Search + Per-page selector */}
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSearchFocusedIndex(-1); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSearchFocusedIndex(prev => (prev < currentProducts.length - 1 ? prev + 1 : prev));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSearchFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchFocusedIndex >= 0 && currentProducts[searchFocusedIndex]) {
                        const product = currentProducts[searchFocusedIndex];
                        if (!isSuperAdmin) {
                          openEdit(product);
                        } else {
                          setSelectedHistoryProductId(product.id);
                          setActiveTab('history');
                        }
                      }
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Per-page selector beside search */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-slate-400 font-semibold hidden sm:inline whitespace-nowrap">Per page:</span>
                <div className="flex gap-1">
                  {[50, 100, 200, 500, 1000, 0].map((n) => {
                    const label = n === 0 ? 'All' : String(n);
                    const isActive = itemsPerPage === n;
                    return (
                      <button
                        key={label}
                        onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
                        }`}
                        title={n === 0 ? 'Show all products' : `Show ${n} per page`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {/* Company / Supplier Filter — writable combo-box */}
              <div className="relative min-w-[180px] sm:min-w-[240px]">
                <datalist id="company-suggestions">
                  {availableCompanies.map((comp) => (
                    <option key={comp.name} value={comp.name} />
                  ))}
                </datalist>
                <input
                  type="text"
                  list="company-suggestions"
                  value={companyInputValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCompanyInputValue(val);
                    // Check if the typed value matches a known company (exact or partial)
                    const trimmed = val.trim();
                    if (!trimmed) {
                      setSelectedCompany('');
                      setCurrentPage(1);
                      return;
                    }
                    // Try exact match first (case-insensitive)
                    const exact = availableCompanies.find(
                      c => c.name.toLowerCase() === trimmed.toLowerCase()
                    );
                    if (exact) {
                      setSelectedCompany(exact.name);
                    } else {
                      // Partial: apply filter as user types
                      setSelectedCompany(trimmed);
                    }
                    setCurrentPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setCompanyInputValue('');
                      setSelectedCompany('');
                      setCurrentPage(1);
                    }
                  }}
                  placeholder={`Search company... (${availableCompanies.length})`}
                  className={`w-full pl-8 pr-8 py-2 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                    selectedCompany
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 placeholder:text-indigo-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 hover:bg-slate-50'
                  }`}
                />
                <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {companyInputValue && (
                  <button
                    type="button"
                    onClick={() => { setCompanyInputValue(''); setSelectedCompany(''); setCurrentPage(1); }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-indigo-600 p-0.5 rounded-full transition-colors cursor-pointer"
                    title="Clear Company filter"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {isSuperAdmin && (
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-655 mr-2">
                  <span className="text-slate-500">Tenant Shop:</span>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                  >
                    <option value="">All Shops (Consolidated)</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Low Stock Checkbox Filter */}
              <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none ${
                lowStockFilter 
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={lowStockFilter}
                  onChange={(e) => setLowStockFilter(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span>Low Stock</span>
              </label>

              {/* Expiry Checkbox Filter */}
              <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none ${
                expiryFilter 
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Expired Stock</span>
              </label>
            </div>
          </div>

          {/* Dynamic Graph Chart */}
          {showStockDistribution && (() => {
            // Take the top 7 products by stock quantity to display in the bar chart
            const topProducts = [...filteredProducts]
              .sort((a, b) => b.stock_quantity - a.stock_quantity)
              .slice(0, 7);

            const maxVal = Math.max(...topProducts.map(p => p.stock_quantity), 10);

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Stock Levels distribution</h3>
                  <p className="text-xs text-slate-500">Visualization of the top products by currently available stock quantities</p>
                </div>

                {topProducts.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                    No inventory items to display.
                  </div>
                ) : (
                  <div className="relative w-full h-[180px] mt-4">
                    {/* SVG Plot */}
                    <svg
                      viewBox="0 0 600 180"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = 15 + (1 - ratio) * 120;
                        const labelVal = ratio * maxVal;
                        return (
                          <g key={idx}>
                            <line
                              x1={60}
                              y1={y}
                              x2={580}
                              y2={y}
                              stroke="#f1f5f9"
                              strokeWidth="1.5"
                            />
                            <text
                              x={48}
                              y={y + 4}
                              textAnchor="end"
                              className="text-[10px] font-bold text-slate-400 fill-current font-sans"
                            >
                              {Math.round(labelVal)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Bars */}
                      {(() => {
                        const chartWidth = 600;
                        const chartHeight = 180;
                        const paddingLeft = 60;
                        const paddingRight = 20;
                        const barWidth = 35;
                        const availableWidth = chartWidth - paddingLeft - paddingRight;
                        const colWidth = availableWidth / topProducts.length;

                        return topProducts.map((prod, idx) => {
                          const val = prod.stock_quantity;
                          const x = paddingLeft + (idx * colWidth) + (colWidth - barWidth) / 2;
                          const y = 135 - ((val / maxVal) * 120);
                          const height = 135 - y;

                          return (
                            <g key={prod.id}>
                              {/* Interactive Bar Hover Catcher */}
                              <rect
                                x={paddingLeft + (idx * colWidth)}
                                y={15}
                                width={colWidth}
                                height={120}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredPoint({ ...prod, x: x + barWidth / 2, y, val })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              {/* Styled Visual Bar */}
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={height}
                                rx="4"
                                fill={hoveredPoint?.id === prod.id ? "#4f46e5" : "#818cf8"}
                                className="transition-all duration-150 pointer-events-none"
                              />
                              {/* Shortened Label */}
                              <text
                                x={x + barWidth / 2}
                                y={155}
                                textAnchor="middle"
                                className="text-[10px] font-bold text-slate-400 fill-current font-sans"
                              >
                                {prod.name.length > 10 ? `${prod.name.slice(0, 8)}..` : prod.name}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>

                    {/* Tooltip */}
                    {hoveredPoint && (
                      <div
                        className="absolute bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-2.5 shadow-xl border border-slate-700 pointer-events-none text-xs flex flex-col space-y-0.5 transition-all duration-75 z-10"
                        style={{
                          left: `${(hoveredPoint.x / 600) * 100}%`,
                          top: `${(hoveredPoint.y / 180) * 100 - 5}%`,
                          transform: 'translate(-50%, -100%)'
                        }}
                      >
                        <span className="font-semibold text-slate-200">
                          {hoveredPoint.name}
                        </span>
                        <span className="font-semibold text-slate-400">
                          SKU: {hoveredPoint.sku}
                        </span>
                        <span className="font-extrabold text-white text-sm">
                          Stock: {hoveredPoint.val} units
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Inventory Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    {!isSuperAdmin && (
                      <th className="p-4 w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = currentProducts.map(p => p.id);
                              setSelectedProducts(Array.from(new Set([...selectedProducts, ...allIds])));
                            } else {
                              const currentIds = currentProducts.map(p => p.id);
                              setSelectedProducts(selectedProducts.filter(id => !currentIds.includes(id)));
                            }
                          }}
                          checked={currentProducts.length > 0 && currentProducts.every(p => selectedProducts.includes(p.id))}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="p-4">SKU</th>
                    {isSuperAdmin && <th className="p-4">Shop</th>}
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Cost Price</th>
                    <th className="p-4">Sale Price</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Expiry</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="p-12 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-slate-400">
                        No products matched current search filters.
                      </td>
                    </tr>
                  ) : (
                    currentProducts.map((product, index) => {
                      const isLowStock = product.stock_quantity <= product.low_stock_threshold;

                      // Expiry status calculation
                      let expiryBadge = null;
                      if (product.expiry_date) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const expiry = new Date(product.expiry_date);
                        expiry.setHours(0, 0, 0, 0);
                        const isExpired = expiry.getTime() < today.getTime();
                        const diffTime = expiry.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (isExpired) {
                          expiryBadge = (
                            <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-0.5 rounded text-xs font-bold inline-flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
                              Expired ({expiry.toLocaleDateString()})
                            </span>
                          );
                        } else if (diffDays <= 30) {
                          expiryBadge = (
                            <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-0.5 rounded text-xs font-bold inline-flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-ping"></span>
                              Expiring in {diffDays}d ({expiry.toLocaleDateString()})
                            </span>
                          );
                        } else {
                          expiryBadge = (
                            <span className="bg-slate-50 text-slate-655 border border-slate-200 px-2.5 py-0.5 rounded text-xs font-semibold">
                              {expiry.toLocaleDateString()}
                            </span>
                          );
                        }
                      } else {
                        expiryBadge = <span className="text-slate-400 text-xs">N/A</span>;
                      }

                      return (
                        <tr key={product.id} className={`hover:bg-slate-50/50 transition-colors ${searchFocusedIndex === index ? 'bg-indigo-100 ring-2 ring-indigo-500 ring-inset' : ''}`}>
                          {!isSuperAdmin && (
                            <td className="p-4 w-12">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProducts([...selectedProducts, product.id]);
                                  } else {
                                    setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                  }
                                }}
                                checked={selectedProducts.includes(product.id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="p-4 font-mono text-xs font-bold text-slate-500">{product.sku}</td>
                          {isSuperAdmin && <td className="p-4 font-semibold text-slate-800">{product.shop_name}</td>}
                          <td className="p-4 font-semibold text-slate-800">{product.name}</td>
                          <td className="p-4">
                            {product.category ? (
                              <span className="bg-indigo-50 text-indigo-750 font-bold px-2 py-0.5 rounded border border-indigo-100 text-xs">
                                {product.category}
                              </span>
                            ) : (
                              <span className="text-slate-450 text-xs font-medium">-</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-700 font-medium">{product.supplier_name || 'N/A'}</td>
                          <td className="p-4 text-slate-600">৳{parseFloat(product.cost_price).toFixed(2)}</td>
                          <td className="p-4 font-extrabold text-slate-800">৳{parseFloat(product.price).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${isLowStock
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                              {product.stock_quantity} {product.unit || 'piece'} / Threshold: {product.low_stock_threshold}
                            </span>
                          </td>
                          <td className="p-4">{expiryBadge}</td>
                          <td className="p-4 text-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedHistoryProductId(product.id);
                                setActiveTab('history');
                              }}
                              className="text-emerald-600 hover:text-emerald-900 font-semibold text-xs border border-emerald-100 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              History
                            </button>
                            {!isSuperAdmin && (
                              <>
                                <button
                                  onClick={() => openEdit(product)}
                                  className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs border border-indigo-100 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="text-rose-600 hover:text-rose-900 font-semibold text-xs border border-rose-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            {/* Left: entry info */}
            <span className="text-xs font-semibold text-slate-500">
              Showing{' '}
              <span className="text-slate-800">{filteredProducts.length === 0 ? 0 : indexOfFirstProduct + 1}</span>
              {' '}to{' '}
              <span className="text-slate-800">{Math.min(indexOfLastProduct, filteredProducts.length)}</span>
              {' '}of{' '}
              <span className="text-slate-800">{filteredProducts.length}</span> entries
            </span>

            {/* Right: page navigation (hidden when showing All) */}
            {itemsPerPage !== 0 && totalPages > 1 && (
              <div className="flex items-center flex-wrap gap-1.5 justify-center sm:justify-end">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white hover:bg-slate-50 disabled:hover:bg-white disabled:opacity-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {(() => {
                  const maxPagesToShow = 20;
                  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                  let endPage = startPage + maxPagesToShow - 1;
                  if (endPage > totalPages) {
                    endPage = totalPages;
                    startPage = Math.max(1, endPage - maxPagesToShow + 1);
                  }
                  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                  return pages.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${currentPage === page
                        ? 'bg-slate-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  ));
                })()}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-white hover:bg-slate-50 disabled:hover:bg-white disabled:opacity-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>


          {/* --- ADD NEW PRODUCT MODAL --- */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">Add New Product</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Wireless Mouse X"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">SKU / Code *</label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. MS-WRL-01"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cost Price (৳) *</label>
                      <input
                        type="number"
                        step="0.001"
                        name="cost_price"
                        value={formData.cost_price}
                        onChange={handleInputChange}
                        required
                        placeholder="25.000"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sale Price (৳) *</label>
                      <input
                        type="number"
                        step="0.001"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        placeholder="49.990"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                      <input
                        type="number"
                        name="stock_quantity"
                        step="any"
                        value={formData.stock_quantity}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unit *</label>
                      <input
                        list="unit-options-add"
                        type="text"
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        placeholder="e.g. piece, kg, box"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium"
                      />
                      <datalist id="unit-options-add">
                        <option value="piece" />
                        <option value="kg" />
                        <option value="gm" />
                        <option value="liter" />
                        <option value="packet" />
                        <option value="box" />
                        <option value="dozen" />
                        <option value="meter" />
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Low Stock ({formData.unit || 'piece'})</label>
                      <input
                        type="number"
                        name="low_stock_threshold"
                        step="any"
                        value={formData.low_stock_threshold}
                        onChange={handleInputChange}
                        placeholder="10"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category (Optional)</label>
                    <input
                      list="categories-list"
                      type="text"
                      name="category"
                      value={formData.category || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Beverages, Snacks"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-semibold"
                    />
                    <datalist id="categories-list">
                      {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier (Optional)</label>
                    <select
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleInputChange}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white mb-4"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      name="expiry_date"
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

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
                      Create Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* --- EDIT PRODUCT MODAL --- */}
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">Edit Product: {currentProduct?.name}</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">SKU / Code *</label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cost Price (৳) *</label>
                      <input
                        type="number"
                        step="0.001"
                        name="cost_price"
                        value={formData.cost_price}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sale Price (৳) *</label>
                      <input
                        type="number"
                        step="0.001"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                      <input
                        type="number"
                        name="stock_quantity"
                        step="any"
                        value={formData.stock_quantity}
                        readOnly
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 cursor-not-allowed text-slate-500 font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unit *</label>
                      <input
                        list="unit-options-edit"
                        type="text"
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        placeholder="e.g. piece, kg, box"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium"
                      />
                      <datalist id="unit-options-edit">
                        <option value="piece" />
                        <option value="kg" />
                        <option value="gm" />
                        <option value="liter" />
                        <option value="packet" />
                        <option value="box" />
                        <option value="dozen" />
                        <option value="meter" />
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Low Stock ({formData.unit || 'piece'})</label>
                      <input
                        type="number"
                        name="low_stock_threshold"
                        step="any"
                        value={formData.low_stock_threshold}
                        onChange={handleInputChange}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category (Optional)</label>
                    <input
                      list="categories-list-edit"
                      type="text"
                      name="category"
                      value={formData.category || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Beverages, Snacks"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-semibold"
                    />
                    <datalist id="categories-list-edit">
                      {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier (Optional)</label>
                    <select
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleInputChange}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white mb-4"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      name="expiry_date"
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
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

          {/* --- BATCHES MODAL --- */}
          {showBatchesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <span>Inventory Batches</span>
                      <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {currentProduct?.name} ({currentProduct?.sku})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">Track stock lots received at different times with individual expiry dates</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {!isSuperAdmin && (
                      <button
                        onClick={() => setShowAddBatchForm(!showAddBatchForm)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs shadow-xs transition-colors flex items-center space-x-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showAddBatchForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
                        </svg>
                        <span>{showAddBatchForm ? 'Cancel' : '+ Receive New Batch'}</span>
                      </button>
                    )}
                    <button onClick={() => setShowBatchesModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Batch Modal Alert Banner */}
                {batchAlert && (
                  <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${batchAlert.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    <span>{batchAlert.message}</span>
                    <button onClick={() => setBatchAlert(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
                  </div>
                )}

                {/* Add Batch Form Slide-down */}
                {showAddBatchForm && (
                  <form onSubmit={handleCreateBatchSubmit} className="mt-4 p-4 bg-slate-50 border border-indigo-100 rounded-2xl space-y-3 animate-fadeIn">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Receive New Batch / Shipment
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity Received *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={batchFormData.quantity}
                          onChange={(e) => setBatchFormData({ ...batchFormData, quantity: e.target.value })}
                          placeholder="e.g. 50"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cost Price (৳) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={batchFormData.cost_price}
                          onChange={(e) => setBatchFormData({ ...batchFormData, cost_price: e.target.value })}
                          placeholder="0.00"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={batchFormData.expiry_date}
                          onChange={(e) => setBatchFormData({ ...batchFormData, expiry_date: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Received Date</label>
                        <input
                          type="date"
                          value={batchFormData.received_date}
                          onChange={(e) => setBatchFormData({ ...batchFormData, received_date: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier (Optional)</label>
                        <select
                          value={batchFormData.supplier_id}
                          onChange={(e) => setBatchFormData({ ...batchFormData, supplier_id: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="">-- Same as product supplier --</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Lot Info (Optional)</label>
                        <input
                          type="text"
                          value={batchFormData.notes}
                          onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                          placeholder="e.g. Received from Supplier X via PO #102"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddBatchForm(false)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={batchFormSubmitting}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50 flex items-center space-x-1"
                      >
                        {batchFormSubmitting ? (
                          <span>Saving...</span>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Save Batch & Add Stock</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Batch Metrics Bar */}
                {batchesData && batchesData.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Total Batches</div>
                      <div className="text-base font-extrabold text-slate-800">{batchesData.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Active Stock</div>
                      <div className="text-base font-extrabold text-emerald-600">
                        {batchesData.reduce((sum, b) => sum + (b.status === 'active' ? b.quantity : 0), 0)} {currentProduct?.unit || 'pcs'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Expired Batches</div>
                      <div className="text-base font-extrabold text-rose-600">
                        {batchesData.filter(b => b.expiry_date && new Date(b.expiry_date) < new Date()).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Total Product Stock</div>
                      <div className="text-base font-extrabold text-indigo-600">
                        {currentProduct?.stock_quantity} {currentProduct?.unit || 'pcs'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Batches Table List */}
                <div className="mt-4 overflow-y-auto flex-1">
                  {batchesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : batchesError ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-700 text-sm">
                      {batchesError}
                    </div>
                  ) : batchesData && batchesData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Batch Code</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-center">Cost Price</th>
                            <th className="px-4 py-3 text-left">Expiry Date</th>
                            <th className="px-4 py-3 text-left">Received</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            {!isSuperAdmin && <th className="px-4 py-3 text-center">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batchesData.map((batch) => {
                            const isEditing = editingBatchId === batch.id;
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const expDate = batch.expiry_date ? new Date(batch.expiry_date) : null;
                            if (expDate) expDate.setHours(0,0,0,0);
                            
                            const isExpired = expDate && expDate.getTime() < today.getTime();
                            const diffDays = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                            const isExpiringSoon = diffDays !== null && diffDays >= 0 && diffDays <= 30;
                            const isDepleted = batch.quantity <= 0 || batch.status === 'depleted';
                            
                            let statusBadge;
                            if (isDepleted) {
                              statusBadge = (
                                <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-xs font-semibold">
                                  Depleted
                                </span>
                              );
                            } else if (isExpired) {
                              statusBadge = (
                                <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded text-xs font-bold inline-flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 animate-pulse"></span>
                                  Expired
                                </span>
                              );
                            } else if (isExpiringSoon) {
                              statusBadge = (
                                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded text-xs font-bold inline-flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>
                                  In {diffDays}d
                                </span>
                              );
                            } else {
                              statusBadge = (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-xs font-semibold">
                                  Active
                                </span>
                              );
                            }

                            return (
                              <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-mono text-xs font-bold text-slate-800">{batch.batch_number}</div>
                                  {batch.po_received_date && (
                                    <div className="text-[10px] text-slate-400">PO Ref #{batch.purchase_order_item_id}</div>
                                  )}
                                </td>
                                
                                {/* Quantity */}
                                <td className="px-4 py-3 text-center">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editBatchData.quantity}
                                      onChange={(e) => setEditBatchData({ ...editBatchData, quantity: e.target.value })}
                                      className="w-16 border border-slate-300 rounded p-1 text-xs text-center font-bold"
                                    />
                                  ) : (
                                    <span className="font-extrabold text-slate-800">{batch.quantity}</span>
                                  )}
                                </td>

                                {/* Cost Price */}
                                <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editBatchData.cost_price}
                                      onChange={(e) => setEditBatchData({ ...editBatchData, cost_price: e.target.value })}
                                      className="w-20 border border-slate-300 rounded p-1 text-xs text-center"
                                    />
                                  ) : (
                                    `৳${batch.cost_price.toFixed(2)}`
                                  )}
                                </td>

                                {/* Expiry Date */}
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      value={editBatchData.expiry_date || ''}
                                      onChange={(e) => setEditBatchData({ ...editBatchData, expiry_date: e.target.value })}
                                      className="border border-slate-300 rounded p-1 text-xs"
                                    />
                                  ) : batch.expiry_date ? (
                                    <span className={`font-medium ${isExpired ? 'text-rose-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-slate-700'}`}>
                                      {new Date(batch.expiry_date).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">No Expiry</span>
                                  )}
                                </td>

                                {/* Received Date */}
                                <td className="px-4 py-3 text-slate-500 text-xs">
                                  {batch.received_date ? new Date(batch.received_date).toLocaleDateString() : '-'}
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3 text-center">{statusBadge}</td>

                                {/* Actions */}
                                {!isSuperAdmin && (
                                  <td className="px-4 py-3 text-center space-x-1.5">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={() => handleSaveEditBatch(batch.id)}
                                          className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-2 py-0.5 border border-emerald-200 rounded hover:bg-emerald-50"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingBatchId(null)}
                                          className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-0.5 border border-slate-200 rounded"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingBatchId(batch.id);
                                            setEditBatchData({
                                              quantity: batch.quantity,
                                              cost_price: batch.cost_price,
                                              expiry_date: batch.expiry_date ? batch.expiry_date.split('T')[0] : '',
                                              received_date: batch.received_date ? batch.received_date.split('T')[0] : ''
                                            });
                                          }}
                                          className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold hover:bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded transition-colors"
                                          title="Edit batch quantity / expiry"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteBatch(batch.id)}
                                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold hover:bg-rose-50 px-2 py-0.5 border border-rose-100 rounded transition-colors"
                                          title="Delete batch"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-sm font-semibold text-slate-600 mb-1">No batches recorded yet</p>
                      <p className="text-xs text-slate-400 mb-3">Receive your first batch shipment to track expiry dates independently.</p>
                      {!isSuperAdmin && (
                        <button
                          onClick={() => setShowAddBatchForm(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg shadow-xs transition-colors"
                        >
                          + Add First Batch
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setShowBatchesModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* --- CSV UPLOAD MODAL --- */}
          {showCsvUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">Import Products from CSV</h3>
                  <button onClick={() => setShowCsvUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCsvUpload} className="mt-4 space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">CSV Format Requirements:</h4>
                    <p className="text-xs text-slate-500 mb-2">The CSV file must contain the following columns (case-insensitive):</p>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 block mb-2">
                      Product Name, SKU, Cost Price
                    </code>
                    <p className="text-xs text-slate-500 mb-2">Optional columns:</p>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 block">
                      Sale Price, Category, Stock Quantity, Low Stock Threshold, Expiry Date, Supplier ID, Unit
                    </code>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select CSV File *</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files[0])}
                      required
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>

                  {csvFile && (
                    <div className="bg-indigo-50 rounded-lg p-3 flex items-center space-x-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-indigo-700 font-medium truncate">{csvFile.name}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex space-x-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCsvUploadModal(false);
                        setCsvFile(null);
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Upload CSV</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Adjustments Tab Content */}
      {activeTab === 'adjustments' && (
        <Adjustments />
      )}

      {/* Stock & Sales History Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="shrink-0">
              <h2 className="text-2xl font-bold text-slate-800">Stock & Sales History</h2>
              <p className="text-sm text-slate-500">Track historical product movements, quantities sold, and remaining balance</p>
            </div>

            {/* Top KPI Stats Moved to Header */}
            {historyData && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-w-[150px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1 text-ellipsis overflow-hidden">Total Purchased</span>
                  <div>
                    <div className="flex items-baseline flex-wrap">
                      <span className="text-2xl font-black text-sky-600">
                        {historyData.daily.reduce((sum, d) => sum + (d.qty_purchased || 0), 0)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5">{historyProductUnit}</span>
                    </div>
                    <div className="flex items-baseline flex-wrap mt-0.5">
                      <span className="text-sm font-bold text-amber-500">
                        BDT: {(historyData.detailed ? historyData.detailed.filter(d => d.type === 'purchase').reduce((sum, d) => sum + (Number(d.subtotal) || 0), 0) : 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-w-[150px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1 text-ellipsis overflow-hidden">Current Stock</span>
                  <div>
                    <div className="flex items-baseline flex-wrap">
                      <span className="text-2xl font-black text-slate-800">{historyData.current_stock}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">{historyProductUnit} left</span>
                    </div>
                    <div className="flex items-baseline flex-wrap mt-0.5">
                      <span className="text-sm font-bold text-amber-500">
                        BDT: {selectedHistoryProduct ? (historyData.current_stock * selectedHistoryProduct.cost_price).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-w-[150px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1 text-ellipsis overflow-hidden">Total Sold</span>
                  <div>
                    <div className="flex items-baseline flex-wrap">
                      <span className="text-2xl font-black text-emerald-600">
                        {historyData.daily.reduce((sum, d) => sum + d.qty_sold, 0)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5">{historyProductUnit} sold</span>
                    </div>
                    <div className="flex items-baseline flex-wrap mt-0.5">
                      <span className="text-sm font-bold text-amber-500">
                        BDT: {(historyData.detailed ? historyData.detailed.filter(d => d.type === 'sale').reduce((sum, d) => sum + (Number(d.subtotal) || 0), 0) : 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-w-[150px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1 text-ellipsis overflow-hidden">Net Stock Change</span>
                  <div className="flex items-baseline flex-wrap">
                    <span className={`text-2xl font-black ${historyData.daily.reduce((sum, d) => sum + d.qty_change, 0) >= 0 ? 'text-indigo-600' : 'text-rose-600'
                      }`}>
                      {historyData.daily.reduce((sum, d) => sum + d.qty_change, 0) >= 0 ? '+' : ''}
                      {historyData.daily.reduce((sum, d) => sum + d.qty_change, 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1.5">{historyProductUnit} net</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Select Product & Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-sm relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Product</label>

              {isHistoryDropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsHistoryDropdownOpen(false)}
                />
              )}

              <div className="relative z-50">
                <input
                  type="text"
                  placeholder="Search & select product..."
                  value={isHistoryDropdownOpen ? historySearchQuery : (() => {
                    const selectedProduct = products.find(p => String(p.id) === String(selectedHistoryProductId));
                    return selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : '';
                  })()}
                  onChange={(e) => {
                    setHistorySearchQuery(e.target.value);
                    setIsHistoryDropdownOpen(true);
                    setHistorySearchFocusedIndex(-1);
                  }}
                  onFocus={() => {
                    setHistorySearchQuery('');
                    setIsHistoryDropdownOpen(true);
                    setHistorySearchFocusedIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (isHistoryDropdownOpen) {
                      const filteredHistoryProducts = products.filter(p =>
                        p.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                        p.sku.toLowerCase().includes(historySearchQuery.toLowerCase())
                      );
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHistorySearchFocusedIndex(prev => (prev < filteredHistoryProducts.length - 1 ? prev + 1 : prev));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHistorySearchFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (historySearchFocusedIndex >= 0 && filteredHistoryProducts[historySearchFocusedIndex]) {
                          setSelectedHistoryProductId(filteredHistoryProducts[historySearchFocusedIndex].id);
                          setHistorySearchQuery('');
                          setIsHistoryDropdownOpen(false);
                          setHistorySearchFocusedIndex(-1);
                        }
                      }
                    }
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2.5 pr-10 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-700 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {isHistoryDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-100">
                  {(() => {
                    const filteredHistoryProducts = products.filter(p =>
                      p.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                      p.sku.toLowerCase().includes(historySearchQuery.toLowerCase())
                    );

                    if (filteredHistoryProducts.length === 0) {
                      return <div className="p-3 text-sm text-slate-400 text-center">No products found</div>;
                    }

                    return filteredHistoryProducts.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedHistoryProductId(p.id);
                          setHistorySearchQuery('');
                          setIsHistoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors font-medium block ${String(selectedHistoryProductId) === String(p.id) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-705'} ${historySearchFocusedIndex === idx ? 'bg-indigo-100 ring-1 ring-indigo-500' : ''}`}
                      >
                        <div className="font-bold">{p.name}</div>
                        <div className="text-xs text-slate-400">SKU: {p.sku} | Stock: {p.stock_quantity} {p.unit || 'piece'}</div>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                />
              </div>
              <button
                onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors h-[38px] flex items-center justify-center"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Ledger Content */}
          {!selectedHistoryProductId ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-medium">
              Please select a product from the list above to view its stock and sales ledger.
            </div>
          ) : historyLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
              <span className="text-sm font-semibold text-slate-500 mt-2 block">Loading ledger data...</span>
            </div>
          ) : historyError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 font-semibold">
              Error: {historyError}
            </div>
          ) : historyData ? (
            <div className="space-y-6">

              {/* History Sub Tabs */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setHistoryViewTab('detailed')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${historyViewTab === 'detailed' ? 'bg-slate-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Detailed Ledger
                    </button>
                    <button
                      onClick={() => setHistoryViewTab('daily')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${historyViewTab === 'daily' ? 'bg-slate-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Daily History
                    </button>
                    <button
                      onClick={() => setHistoryViewTab('monthly')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${historyViewTab === 'monthly' ? 'bg-slate-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Monthly History
                    </button>

                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      {historyViewTab === 'detailed' ? (
                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="p-4">Date</th>
                          <th className="p-4">Type</th>
                          <th className="p-4 text-center">Ref. ID</th>
                          <th className="p-4 text-center">Cost Price</th>
                          <th className="p-4 text-center">Sold Price</th>
                          <th className="p-4 text-center">Quantity</th>
                          <th className="p-4 text-center">Subtotal</th>
                          <th className="p-4 text-center">Total Sale Discount</th>
                          <th className="p-4 text-right">Remaining Stock</th>
                        </tr>
                      ) : (
                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="p-4">{historyViewTab === 'daily' ? 'Date' : 'Month'}</th>
                          <th className="p-4 text-center">Quantity Sold</th>
                          <th className="p-4 text-center">Net Change</th>
                          <th className="p-4 text-right">Remaining Stock</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {historyViewTab === 'daily' ? (
                        historyData.daily.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">
                              No transactions or events recorded for this product in the selected period.
                            </td>
                          </tr>
                        ) : (
                          historyData.daily.map((d, index) => (
                            <tr key={index} className="hover:bg-slate-50/20 transition-colors">
                              <td className="p-4 font-semibold text-slate-700">{d.date}</td>
                              <td className="p-4 text-center font-bold text-slate-600">
                                {d.qty_sold} <span className="text-xs font-semibold text-slate-400 ml-1">{historyProductUnit}</span>
                              </td>
                              <td className={`p-4 text-center font-bold ${d.qty_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {d.qty_change >= 0 ? '+' : ''}{d.qty_change} <span className="text-xs font-semibold opacity-75 ml-1">{historyProductUnit}</span>
                              </td>
                              <td className="p-4 text-right font-black text-slate-800">
                                {d.stock_left} <span className="text-xs font-semibold text-slate-500 ml-1">{historyProductUnit}</span>
                              </td>
                            </tr>
                          ))
                        )
                      ) : historyViewTab === 'monthly' ? (
                        historyData.monthly.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">
                              No transactions or events recorded for this product in the selected period.
                            </td>
                          </tr>
                        ) : (
                          historyData.monthly.map((m, index) => (
                            <tr key={index} className="hover:bg-slate-50/20 transition-colors">
                              <td className="p-4 font-semibold text-slate-700">{m.month}</td>
                              <td className="p-4 text-center font-bold text-slate-600">
                                {m.qty_sold} <span className="text-xs font-semibold text-slate-400 ml-1">{historyProductUnit}</span>
                              </td>
                              <td className={`p-4 text-center font-bold ${m.qty_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {m.qty_change >= 0 ? '+' : ''}{m.qty_change} <span className="text-xs font-semibold opacity-75 ml-1">{historyProductUnit}</span>
                              </td>
                              <td className="p-4 text-right font-black text-slate-800">
                                {m.stock_left} <span className="text-xs font-semibold text-slate-500 ml-1">{historyProductUnit}</span>
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        historyData.detailed && historyData.detailed.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                              No detailed transactions recorded for this product in the selected period.
                            </td>
                          </tr>
                        ) : (
                          historyData.detailed && historyData.detailed.map((d, index) => (
                            <tr key={index} className="hover:bg-slate-50/20 transition-colors">
                              <td className="p-4 font-semibold text-slate-700">{d.date}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${d.type === 'sale' ? 'bg-emerald-100 text-emerald-700' :
                                  d.type === 'purchase' ? 'bg-indigo-100 text-indigo-700' :
                                    d.type === 'adjustment' ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-700'
                                  }`}>
                                  {d.type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-4 text-center font-mono text-xs">
                                {d.reference_number ? (
                                  d.type === 'sale' && d.reference_id ? (
                                    <button
                                      type="button"
                                      onClick={() => fetchSaleDetailsForRef(d.reference_id)}
                                      className="inline-flex items-center space-x-1 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors border border-indigo-100 shadow-2xs group cursor-pointer"
                                      title="Click to view full sale transaction details"
                                    >
                                      <span>{d.reference_number}</span>
                                      <svg className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-md">
                                      {d.reference_number}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-4 text-center text-slate-600">
                                {d.cost_price !== null ? Number(d.cost_price).toFixed(2) : '-'}
                              </td>
                              <td className="p-4 text-center text-slate-600">
                                {d.sold_price !== null ? Number(d.sold_price).toFixed(2) : '-'}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`font-bold ${d.qty_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {d.qty_change >= 0 ? '+' : ''}{d.qty_change}
                                </span>
                                <span className="text-xs font-semibold opacity-75 mx-1">{historyProductUnit}</span>
                                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                  ({Number(d.stock_left) - Number(d.qty_change)})
                                </span>
                              </td>
                              <td className="p-4 text-center font-semibold text-slate-800">
                                {d.subtotal !== null && d.subtotal !== 0 ? Number(d.subtotal).toFixed(2) : '-'}
                              </td>
                              <td className="p-4 text-center text-slate-500">
                                {d.discount > 0 ? <span className="text-rose-500">-{Number(d.discount).toFixed(2)}</span> : '-'}
                              </td>
                              <td className="p-4 text-right font-black text-slate-800">
                                {d.stock_left} <span className="text-xs font-semibold text-slate-500 ml-1">{historyProductUnit}</span>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* --- SALE DETAILS MODAL FOR REF ID --- */}
      {showSaleDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Sale Details
                    {saleDetailsData && (
                      <span className="text-xs font-mono font-bold bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                        #INV-{saleDetailsData.id}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">Transaction summary and purchased items breakdown</p>
                </div>
              </div>

              <button
                onClick={() => setShowSaleDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
              {saleDetailsLoading ? (
                <div className="py-16 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  <p className="text-sm font-semibold text-slate-500 mt-3">Fetching transaction details...</p>
                </div>
              ) : saleDetailsError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-center text-sm font-medium">
                  {saleDetailsError}
                </div>
              ) : saleDetailsData ? (
                <>
                  {/* Meta Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Shop / Cashier Info */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store & Staff</div>
                      <div className="font-bold text-slate-800 text-sm">{saleDetailsData.shop_name || 'Store'}</div>
                      {saleDetailsData.shop_address && (
                        <div className="text-xs text-slate-500">{saleDetailsData.shop_address}</div>
                      )}
                      <div className="text-xs text-slate-600 pt-1 border-t border-slate-100 flex justify-between">
                        <span className="text-slate-400">Cashier:</span>
                        <span className="font-semibold">{saleDetailsData.staff_name || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-slate-600 flex justify-between">
                        <span className="text-slate-400">Date:</span>
                        <span className="font-medium">{new Date(saleDetailsData.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Info</div>
                      <div className="font-bold text-slate-800 text-sm">
                        {saleDetailsData.customer_name || 'Walk-in Customer'}
                      </div>
                      {saleDetailsData.customer_phone && (
                        <div className="text-xs text-slate-500">Phone: {saleDetailsData.customer_phone}</div>
                      )}
                      {saleDetailsData.customer_address && (
                        <div className="text-xs text-slate-500">Address: {saleDetailsData.customer_address}</div>
                      )}
                      <div className="text-xs text-slate-600 pt-1 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-slate-400">Payment Method:</span>
                        <span className="font-bold uppercase text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {saleDetailsData.payment_method || 'Cash'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Purchased Items ({saleDetailsData.items?.length || 0})
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase">
                            <th className="p-3">Product</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-right">Unit Price</th>
                            <th className="p-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {saleDetailsData.items && saleDetailsData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-bold text-slate-800">{item.product_name || item.name}</div>
                                {item.product_sku && (
                                  <div className="text-[10px] text-slate-400 font-mono">SKU: {item.product_sku}</div>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-800">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-right">
                                BDT {parseFloat(item.unit_price || item.price || 0).toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                BDT {parseFloat(item.subtotal || (item.unit_price * item.quantity) || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold">BDT {parseFloat(saleDetailsData.total_amount || 0).toFixed(2)}</span>
                    </div>
                    {saleDetailsData.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount</span>
                        <span className="font-semibold">-BDT {parseFloat(saleDetailsData.discount).toFixed(2)}</span>
                      </div>
                    )}
                    {saleDetailsData.tax > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax</span>
                        <span className="font-semibold">+BDT {parseFloat(saleDetailsData.tax).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold text-slate-900">
                      <span>Final Total</span>
                      <span className="text-base text-indigo-600">BDT {parseFloat(saleDetailsData.final_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-600">
                      <span>Amount Paid</span>
                      <span className="font-bold text-emerald-600">BDT {parseFloat(saleDetailsData.paid_amount || 0).toFixed(2)}</span>
                    </div>
                    {saleDetailsData.due_amount > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Due Amount</span>
                        <span>BDT {parseFloat(saleDetailsData.due_amount).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {saleDetailsData.notes && (
                    <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800">
                      <span className="font-bold">Notes: </span>{saleDetailsData.notes}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end space-x-3">
              {saleDetailsData && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePrintSaleDetails('thermal')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title="Print Thermal Receipt"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Thermal</span>
                  </button>
                  <button
                    onClick={() => handlePrintSaleDetails('regular')}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title="Print Receipt / Invoice"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print Receipt</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowSaleDetailsModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- DYNAMIC PRINT AREA (OFF-SCREEN PORTAL FOR CLEAN INVOICE PRINTING) --- */}
      {showSaleDetailsModal && saleDetailsData && createPortal(
        <div id="receipt-print-area">
          {/* Thermal View Container */}
          <div className="thermal-only">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{saleDetailsData.shop_name || 'Store'}</h2>
              {saleDetailsData.shop_address && <p style={{ margin: '0 0 2px 0', fontSize: '9px' }}>{saleDetailsData.shop_address}</p>}
              <div style={{ fontSize: '9px', margin: '0 0 4px 0' }}>
                {saleDetailsData.shop_phone && <span style={{ marginRight: '6px' }}>Tel: {saleDetailsData.shop_phone}</span>}
                {saleDetailsData.shop_email && <span>Email: {saleDetailsData.shop_email}</span>}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.05em' }}>*** TRANSACTION RECEIPT ***</p>
            </div>

            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', margin: '8px 0', fontSize: '9px', lineHeight: '1.3' }}>
              <div><strong>Invoice ID:</strong> #{saleDetailsData.id}</div>
              <div><strong>Date:</strong> {new Date(saleDetailsData.created_at).toLocaleString()}</div>
              <div><strong>Cashier:</strong> {saleDetailsData.staff_name || 'N/A'}</div>
              <div><strong>Customer:</strong> {saleDetailsData.customer_name || 'Walk-in Customer'}</div>
              {saleDetailsData.customer_phone && <div><strong>Phone:</strong> {saleDetailsData.customer_phone}</div>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', margin: '8px 0' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #000' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '3px' }}>Item</th>
                  <th style={{ textAlign: 'center', paddingBottom: '3px', width: '25px' }}>Qty</th>
                  <th style={{ textAlign: 'center', paddingBottom: '3px', width: '25px' }}>Unit</th>
                  <th style={{ textAlign: 'right', paddingBottom: '3px', width: '55px' }}>Price</th>
                  <th style={{ textAlign: 'right', paddingBottom: '3px', width: '60px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(saleDetailsData.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ paddingTop: '3px', maxWidth: '90px', wordBreak: 'break-all' }}>
                      {item.product_name || item.name}
                    </td>
                    <td style={{ textAlign: 'center', paddingTop: '3px' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'center', paddingTop: '3px', color: '#666' }}>{item.unit || 'pcs'}</td>
                    <td style={{ textAlign: 'right', paddingTop: '3px' }}>৳{parseFloat(item.unit_price || item.price || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', paddingTop: '3px' }}>৳{parseFloat(item.subtotal || ((item.unit_price || item.price || 0) * item.quantity)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', fontSize: '9px', lineHeight: '1.3' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>৳{parseFloat(saleDetailsData.total_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(saleDetailsData.discount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>-৳{parseFloat(saleDetailsData.discount).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(saleDetailsData.tax || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax:</span>
                  <span>+৳{parseFloat(saleDetailsData.tax).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', borderTop: '1px dashed #000', paddingTop: '3px', marginTop: '3px' }}>
                <span>Final Total:</span>
                <span>৳{parseFloat(saleDetailsData.final_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold' }}>
                <span>Total Paid:</span>
                <span>৳{parseFloat(saleDetailsData.paid_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(saleDetailsData.due_amount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold', color: '#ef4444', borderTop: '1px dashed #000', paddingTop: '2px', marginTop: '2px' }}>
                  <span>Due Amount:</span>
                  <span>৳{parseFloat(saleDetailsData.due_amount).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '9px' }}>
              <p style={{ margin: '0 0 2px 0' }}>Payment: {(saleDetailsData.payment_method || 'Cash').toUpperCase()}</p>
              <p style={{ margin: '0', fontWeight: 'bold' }}>*** THANK YOU ***</p>
            </div>
          </div>

          {/* Regular A4 View Container */}
          <div className="regular-only">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>{saleDetailsData.shop_name || 'Store'}</h1>
                {saleDetailsData.shop_address && <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '12px' }}>{saleDetailsData.shop_address}</p>}
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                  {saleDetailsData.shop_phone && <span style={{ marginRight: '10px' }}>Tel: {saleDetailsData.shop_phone}</span>}
                  {saleDetailsData.shop_email && <span>Email: {saleDetailsData.shop_email}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#6366f1', margin: '0 0 4px 0' }}>INVOICE</h2>
                <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '12px' }}><strong>Invoice ID:</strong> #{saleDetailsData.id}</p>
                <p style={{ margin: '0', color: '#64748b', fontSize: '12px' }}><strong>Date:</strong> {new Date(saleDetailsData.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '30px' }}>
              <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Billed To</h3>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>{saleDetailsData.customer_name || 'Walk-in Customer'}</div>
                {saleDetailsData.customer_phone && <div style={{ color: '#475569', fontSize: '12px', marginBottom: '2px' }}>Phone: {saleDetailsData.customer_phone}</div>}
                {saleDetailsData.customer_address && <div style={{ color: '#475569', fontSize: '12px' }}>Address: {saleDetailsData.customer_address}</div>}
              </div>
              <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Billed By</h3>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>{saleDetailsData.shop_name || 'Store'}</div>
                <div style={{ color: '#475569', fontSize: '12px', marginBottom: '2px' }}>Cashier: {saleDetailsData.staff_name || 'N/A'}</div>
                <div style={{ color: '#475569', fontSize: '12px' }}>Payment Method: {(saleDetailsData.payment_method || 'Cash').toUpperCase()}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'left' }}>
                  <th style={{ padding: '8px 0' }}>Item Description</th>
                  <th style={{ padding: '8px 0', textAlign: 'center', width: '100px' }}>SKU</th>
                  <th style={{ padding: '8px 0', textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', width: '100px' }}>Unit Price</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', width: '100px' }}>Total</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px', color: '#334155' }}>
                {(saleDetailsData.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 0', fontWeight: '500' }}>{item.product_name || item.name}</td>
                    <td style={{ padding: '10px 0', textAlign: 'center', color: '#64748b' }}>{item.product_sku || item.sku || 'N/A'}</td>
                    <td style={{ padding: '10px 0', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>BDT {parseFloat(item.unit_price || item.price || 0).toFixed(2)}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>BDT {parseFloat(item.subtotal || ((item.unit_price || item.price || 0) * item.quantity)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ width: '250px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#64748b' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>BDT {parseFloat(saleDetailsData.total_amount || 0).toFixed(2)}</span>
                </div>
                {parseFloat(saleDetailsData.discount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#e11d48' }}>
                    <span>Discount</span>
                    <span style={{ fontWeight: '600' }}>-BDT {parseFloat(saleDetailsData.discount).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(saleDetailsData.tax || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#64748b' }}>
                    <span>Tax</span>
                    <span style={{ fontWeight: '600' }}>+BDT {parseFloat(saleDetailsData.tax).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0', margin: '8px 0', fontWeight: 'bold', fontSize: '15px', color: '#4f46e5' }}>
                  <span>Final Total</span>
                  <span>BDT {parseFloat(saleDetailsData.final_amount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#059669', fontWeight: 'bold' }}>
                  <span>Amount Paid</span>
                  <span>BDT {parseFloat(saleDetailsData.paid_amount || 0).toFixed(2)}</span>
                </div>
                {parseFloat(saleDetailsData.due_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#dc2626', fontWeight: 'bold' }}>
                    <span>Due Amount</span>
                    <span>BDT {parseFloat(saleDetailsData.due_amount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
