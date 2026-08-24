import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import API_BASE_URL from '../config';

export default function AllProductNames() {
  const { t, formatNumber } = useLanguage();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'shop_admin' || user.role === 'super_admin';

  const [allProducts, setAllProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'supplier'

  // Table pagination state: 50 products per page, up to 20 numbered page buttons
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const maxPageButtons = 20;

  // Multiple selection & bulk delete state
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null); // single product or null for bulk
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({
    active: false,
    current: 0,
    total: 0,
    percent: 0,
    currentName: ''
  });

  // Add Product Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    active: false,
    percent: 0,
    stage: ''
  });
  const [alert, setAlert] = useState(null);

  // Add Product form supplier search states
  const [addSupplierSearch, setAddSupplierSearch] = useState('');
  const [showAddSupplierSuggestions, setShowAddSupplierSuggestions] = useState(false);
  const [addSupplierFocusedIndex, setAddSupplierFocusedIndex] = useState(-1);

  const searchTimeoutRef = useRef(null);

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

  // Helper to auto-create or get supplier on-the-fly
  const createOrGetSupplier = async (supplierName) => {
    const trimmed = supplierName ? supplierName.trim() : '';
    if (!trimmed) return null;

    const existing = suppliers.find(s => s.name && s.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimmed })
      });

      const data = await response.json();
      if (response.ok && (data.id || data.supplierId)) {
        const newSup = {
          id: data.id || data.supplierId,
          name: data.name || trimmed,
          contact_name: data.contact_name || '',
          phone: data.phone || '',
          email: data.email || '',
          due_balance: data.due_balance || 0
        };

        setSuppliers(prev => {
          if (prev.some(s => String(s.id) === String(newSup.id))) return prev;
          return [...prev, newSup];
        });

        return newSup;
      }
    } catch (err) {
      console.error('Error auto-creating supplier:', err);
    }
    return null;
  };

  // Fetch suppliers and products
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset pagination on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const safeJson = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        const titleMatch = text.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'Server returned HTML instead of JSON';
        throw new Error(`${title} (Status: ${response.status})`);
      }
      throw new Error(text.substring(0, 120) || 'Invalid server response');
    }
  };

  // Fetch data in manageable chunks so large databases never crash or truncate
  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');

      // 1. Fetch suppliers
      let suppliersData = [];
      try {
        const suppliersResponse = await fetch(`${API_BASE_URL}/suppliers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (suppliersResponse.ok) {
          suppliersData = await safeJson(suppliersResponse);
          if (!Array.isArray(suppliersData)) suppliersData = [];
        }
      } catch (sErr) {
        console.warn('Could not fetch suppliers:', sErr);
      }
      setSuppliers(suppliersData);

      // Default expand all suppliers
      const initialExpanded = { 'no_supplier': true };
      suppliersData.forEach(s => {
        initialExpanded[String(s.id)] = true;
      });
      setExpandedSuppliers(initialExpanded);

      // 2. Fetch first batch of products (up to 500)
      const batchSize = 500;
      const firstResponse = await fetch(`${API_BASE_URL}/products?limit=${batchSize}&offset=0`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const firstBatch = await safeJson(firstResponse);
      if (!firstResponse.ok) {
        throw new Error(firstBatch.error || 'Failed to fetch products from server');
      }

      if (!Array.isArray(firstBatch)) throw new Error('Invalid product data format received');

      setAllProducts(firstBatch);
      setLoading(false);

      // 3. If there are more products, continue streaming them in the background
      if (firstBatch.length === batchSize) {
        loadRemainingBatches(token, batchSize, firstBatch);
      }

    } catch (err) {
      console.error('Fetch products error:', err);
      setError(err.message || 'Error loading product data');
      setLoading(false);
    }
  };

  // Background loader for subsequent batches
  const loadRemainingBatches = async (token, batchSize, accumulated) => {
    setLoadingMore(true);
    let offset = batchSize;
    let currentList = [...accumulated];

    try {
      while (true) {
        const resp = await fetch(`${API_BASE_URL}/products?limit=${batchSize}&offset=${offset}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) break;

        let nextBatch;
        try {
          nextBatch = await safeJson(resp);
        } catch (_) {
          break;
        }
        if (!Array.isArray(nextBatch) || nextBatch.length === 0) break;

        currentList = [...currentList, ...nextBatch];
        setAllProducts(currentList);

        if (nextBatch.length < batchSize) break;
        offset += batchSize;
      }
    } catch (bErr) {
      console.warn('Background batch loading ended:', bErr);
    } finally {
      setLoadingMore(false);
    }
  };

  // Server-assisted search when search term is typed
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) return;

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const searchResp = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(searchTerm.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (searchResp.ok) {
          const results = await searchResp.json();
          if (Array.isArray(results) && results.length > 0) {
            setAllProducts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = results.filter(r => !existingIds.has(r.id));
              return [...prev, ...newItems];
            });
          }
        }
      } catch (err) {
        console.warn('Search query error:', err);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Categories list derived from all products
  const categories = useMemo(() => {
    const set = new Set();
    allProducts.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [allProducts]);

  // Grouping products by supplier
  const { supplierGroups, unassignedProducts, totalDisplayCount } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const cat = selectedCategory.trim().toLowerCase();

    // Map supplier ID to supplier info
    const sMap = new Map();
    suppliers.forEach(s => {
      sMap.set(String(s.id), {
        id: String(s.id),
        name: s.name || s.company || 'Unnamed Supplier',
        company: s.company || '',
        contact_name: s.contact_name || '',
        phone: s.phone || '',
        products: []
      });
    });

    // Custom named suppliers for products having supplier_name not in suppliers table
    const customSupplierMap = new Map();
    const noSupplierList = [];

    // Filter and assign each product
    allProducts.forEach(product => {
      const matchSearch = !term ||
        (product.name && product.name.toLowerCase().includes(term)) ||
        (product.sku && product.sku.toLowerCase().includes(term)) ||
        (product.category && product.category.toLowerCase().includes(term)) ||
        (product.supplier_name && product.supplier_name.toLowerCase().includes(term));

      const matchCat = !cat || (product.category && product.category.toLowerCase() === cat);

      if (!matchSearch || !matchCat) return;

      const supplierId = product.supplier_id ? String(product.supplier_id) : null;

      if (supplierId && sMap.has(supplierId)) {
        sMap.get(supplierId).products.push(product);
      } else if (product.supplier_name && product.supplier_name.trim()) {
        let matched = false;
        for (const [id, sup] of sMap.entries()) {
          if (sup.name.toLowerCase() === product.supplier_name.trim().toLowerCase()) {
            sup.products.push(product);
            matched = true;
            break;
          }
        }
        if (!matched) {
          const supName = product.supplier_name.trim();
          const key = `custom_${supName.toLowerCase()}`;
          if (!customSupplierMap.has(key)) {
            customSupplierMap.set(key, {
              id: key,
              name: supName,
              company: '',
              contact_name: '',
              phone: '',
              products: []
            });
          }
          customSupplierMap.get(key).products.push(product);
        }
      } else {
        noSupplierList.push(product);
      }
    });

    const groups = [
      ...Array.from(sMap.values()),
      ...Array.from(customSupplierMap.values())
    ];

    const activeGroups = groups.filter(g => {
      if (g.products.length > 0) return true;
      if (!term && !cat) return true;
      return g.name.toLowerCase().includes(term) || (g.company && g.company.toLowerCase().includes(term));
    });

    const totalCount = activeGroups.reduce((acc, g) => acc + g.products.length, 0) + noSupplierList.length;

    return {
      supplierGroups: activeGroups,
      unassignedProducts: noSupplierList,
      totalDisplayCount: totalCount
    };
  }, [allProducts, suppliers, searchTerm, selectedCategory]);

  // Flattened filtered products list for Table View
  const filteredProductsList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const cat = selectedCategory.trim().toLowerCase();

    return allProducts.filter(product => {
      const matchSearch = !term ||
        (product.name && product.name.toLowerCase().includes(term)) ||
        (product.sku && product.sku.toLowerCase().includes(term)) ||
        (product.category && product.category.toLowerCase().includes(term)) ||
        (product.supplier_name && product.supplier_name.toLowerCase().includes(term));

      const matchCat = !cat || (product.category && product.category.toLowerCase() === cat);

      return matchSearch && matchCat;
    });
  }, [allProducts, searchTerm, selectedCategory]);

  // Auto-expand on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const newExpanded = { 'no_supplier': true };
      supplierGroups.forEach(g => {
        if (g.products.length > 0) {
          newExpanded[g.id] = true;
        }
      });
      setExpandedSuppliers(newExpanded);
    }
  }, [searchTerm, supplierGroups]);

  const toggleSupplier = (supplierId) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }));
  };

  const toggleExpandAll = (expand) => {
    const newExpanded = { 'no_supplier': expand };
    supplierGroups.forEach(g => {
      newExpanded[g.id] = expand;
    });
    setExpandedSuppliers(newExpanded);
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toFixed(2);
  };

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4500);
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
    setAddSupplierSearch('');
    setShowAddSupplierSuggestions(false);
    setAddSupplierFocusedIndex(-1);
  };

  // Multiple selection helpers
  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate table pagination (50 items per page)
  const totalTablePages = Math.ceil(filteredProductsList.length / itemsPerPage) || 1;
  const paginatedTableProducts = filteredProductsList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isPageAllSelected = useMemo(() => {
    if (paginatedTableProducts.length === 0) return false;
    return paginatedTableProducts.every(p => selectedProductIds.has(p.id));
  }, [paginatedTableProducts, selectedProductIds]);

  const toggleSelectPage = () => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (isPageAllSelected) {
        paginatedTableProducts.forEach(p => next.delete(p.id));
      } else {
        paginatedTableProducts.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedProductIds(new Set(filteredProductsList.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
  };

  const promptBulkDelete = () => {
    if (selectedProductIds.size === 0) return;
    setProductToDelete(null);
    setShowDeleteModal(true);
  };

  const promptSingleDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    const ids = productToDelete ? [productToDelete.id] : Array.from(selectedProductIds);
    if (ids.length === 0) return;

    setDeleting(true);
    const totalItems = ids.length;
    setDeleteProgress({
      active: true,
      current: 0,
      total: totalItems,
      percent: 0,
      currentName: productToDelete ? productToDelete.name : `Starting deletion of ${totalItems} product(s)...`
    });

    const chunkSize = 25;
    let successCount = 0;
    let failureCount = 0;
    const token = localStorage.getItem('token');

    try {
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const firstInChunk = allProducts.find(p => p.id === chunk[0]);

        setDeleteProgress({
          active: true,
          current: i,
          total: totalItems,
          percent: Math.round((i / totalItems) * 100),
          currentName: firstInChunk ? firstInChunk.name : `Deleting batch (${i + 1}-${Math.min(i + chunkSize, totalItems)})...`
        });

        const response = await fetch(`${API_BASE_URL}/products/bulk-delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ product_ids: chunk })
        });

        if (response.ok) {
          const resData = await response.json();
          successCount += resData.success_count || 0;
          failureCount += resData.failure_count || 0;
        } else {
          failureCount += chunk.length;
        }

        const processed = Math.min(i + chunkSize, totalItems);
        setDeleteProgress({
          active: true,
          current: processed,
          total: totalItems,
          percent: Math.round((processed / totalItems) * 100),
          currentName: `Processed ${processed} of ${totalItems} items`
        });
      }

      setDeleteProgress({
        active: true,
        current: totalItems,
        total: totalItems,
        percent: 100,
        currentName: 'Completed!'
      });

      if (failureCount > 0) {
        triggerAlert(
          'warning',
          `Deleted ${successCount} product(s). ${failureCount} product(s) could not be deleted because they are referenced in sales transactions or purchase orders.`
        );
      } else {
        triggerAlert('success', `Successfully deleted ${successCount || totalItems} product(s)!`);
      }

      // Update local state by removing deleted products
      setAllProducts(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedProductIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });

      setTimeout(() => {
        setShowDeleteModal(false);
        setProductToDelete(null);
        setDeleteProgress({ active: false, current: 0, total: 0, percent: 0, currentName: '' });
      }, 600);

    } catch (err) {
      triggerAlert('error', err.message || 'Error deleting products.');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      triggerAlert('error', 'Product name is required.');
      return;
    }

    let finalSupplierId = formData.supplier_id;
    let finalSupplierName = addSupplierSearch.trim();

    // If user typed a supplier name without selecting from dropdown, resolve or create it
    if (finalSupplierName && !finalSupplierId) {
      const matched = suppliers.find(s => s.name && s.name.trim().toLowerCase() === finalSupplierName.toLowerCase());
      if (matched) {
        finalSupplierId = String(matched.id);
      } else {
        const created = await createOrGetSupplier(finalSupplierName);
        if (created) {
          finalSupplierId = String(created.id);
        }
      }
    }

    const price = parseFloat(formData.price) || 0;
    const cost_price = parseFloat(formData.cost_price) || 0;
    const sku = formData.sku && formData.sku.trim()
      ? formData.sku.trim()
      : 'SKU-' + formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X') + '-' + Math.floor(1000 + Math.random() * 9000);

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
          name: formData.name.trim(),
          sku: sku,
          price: price,
          cost_price: cost_price,
          stock_quantity: parseFloat(formData.stock_quantity || 0),
          low_stock_threshold: parseFloat(formData.low_stock_threshold || 10),
          expiry_date: formData.expiry_date || null,
          supplier_id: finalSupplierId ? parseInt(finalSupplierId) : null,
          supplier_name: finalSupplierName || null
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to create product.');

      triggerAlert('success', 'Product created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchInitialData();
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

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (csvFile.size > maxSize) {
      triggerAlert('error', 'CSV file is too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress({
      active: true,
      percent: 10,
      stage: 'Reading and preparing CSV file...'
    });

    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('csv_file', csvFile);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/products/bulk-upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        let processingInterval = null;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 60);
            setUploadProgress({
              active: true,
              percent: Math.max(10, percentComplete),
              stage: 'Uploading CSV file to server...'
            });
          }
        };

        xhr.upload.onload = () => {
          setUploadProgress({
            active: true,
            percent: 70,
            stage: 'Processing products & updating database...'
          });

          // Smoothly advance from 70% to 92% while backend is executing transactions
          processingInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev.percent < 92) {
                return { ...prev, percent: prev.percent + 3 };
              }
              return prev;
            });
          }, 300);
        };

        xhr.onload = () => {
          if (processingInterval) clearInterval(processingInterval);
          setUploadProgress({
            active: true,
            percent: 100,
            stage: 'Products processed successfully!'
          });

          try {
            const resData = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              if (resData.error_count > 0 && resData.errors && resData.errors.length > 0) {
                const errorMsg = `${resData.message}\n\nErrors:\n${resData.errors.slice(0, 10).join('\n')}${resData.errors.length > 10 ? '\n...and ' + (resData.errors.length - 10) + ' more errors' : ''}`;
                triggerAlert('warning', errorMsg);
              } else {
                triggerAlert('success', resData.message || 'Products uploaded successfully!');
              }

              setTimeout(() => {
                setShowCsvUploadModal(false);
                setCsvFile(null);
                setUploadProgress({ active: false, percent: 0, stage: '' });
                fetchInitialData();
              }, 600);
              resolve(resData);
            } else {
              reject(new Error(resData.error || resData.message || 'Failed to upload CSV.'));
            }
          } catch (jsonErr) {
            reject(new Error('Invalid response from server.'));
          }
        };

        xhr.onerror = () => {
          if (processingInterval) clearInterval(processingInterval);
          reject(new Error('Network error during upload.'));
        };

        xhr.send(data);
      });

    } catch (err) {
      triggerAlert('error', err.message);
      setUploadProgress({ active: false, percent: 0, stage: '' });
    } finally {
      setUploading(false);
    }
  };

  // Generate sliding window of up to 20 page buttons
  const pageNumbers = useMemo(() => {
    if (totalTablePages <= maxPageButtons) {
      return Array.from({ length: totalTablePages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let end = start + maxPageButtons - 1;
    if (end > totalTablePages) {
      end = totalTablePages;
      start = Math.max(1, end - maxPageButtons + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalTablePages, currentPage, maxPageButtons]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalTablePages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-sm font-medium text-slate-500">{t('loading_products', 'Loading products and directory...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{t('error_loading_data', 'Error Loading Products')}</h3>
        <p className="text-red-600 text-sm mb-6">{error}</p>
        <button
          onClick={fetchInitialData}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {t('try_again', 'Try Again')}
        </button>
      </div>
    );
  }

  const selectedCount = selectedProductIds.size;

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center transition-all ${alert.type === 'success' ? 'bg-emerald-600 text-white' : alert.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
          }`}>
          <span className="text-sm font-semibold whitespace-pre-line">{alert.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-slate-800">{t('all_product_names', 'All Product Names')}</h1>
                {loadingMore && (
                  <span className="inline-flex items-center space-x-1 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full animate-pulse border border-indigo-100 font-medium">
                    <span>Loading more items...</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {t('product_names_subtitle', 'View all products organized by supplier or as a master catalog')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${viewMode === 'table'
                ? 'bg-white text-indigo-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>{t('all_products_table', 'All Products Table')}</span>
            </button>
            <button
              onClick={() => setViewMode('supplier')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${viewMode === 'supplier'
                ? 'bg-white text-indigo-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{t('grouped_by_supplier', 'By Supplier')}</span>
            </button>
          </div>

          {/* Action Buttons */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-xl text-sm shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>{t('add_product', 'Add Product')}</span>
              </button>
              <button
                onClick={() => setShowCsvUploadModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3.5 rounded-xl text-sm shadow-sm transition-colors flex items-center space-x-1.5"
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

      {/* Sticky / Highlighted Bulk Actions Bar */}
      {isAdmin && selectedCount > 0 && (
        <div className="bg-indigo-900 text-white px-6 py-3.5 rounded-2xl shadow-lg border border-indigo-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <span className="bg-indigo-700 text-indigo-100 px-3 py-1 rounded-full text-xs font-bold">
              {selectedCount} {t('selected', 'selected')}
            </span>
            <span className="text-sm font-medium text-indigo-100">
              {selectedCount === 1 ? '1 product selected' : `${selectedCount} products selected`}
            </span>
            {selectedCount < filteredProductsList.length && (
              <button
                onClick={selectAllFiltered}
                className="text-xs text-indigo-200 hover:text-white underline font-semibold transition-colors"
              >
                Select all {filteredProductsList.length} matching
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={clearSelection}
              className="px-3.5 py-1.5 text-xs font-semibold text-indigo-200 hover:text-white bg-indigo-800/80 hover:bg-indigo-800 rounded-xl transition-colors"
            >
              {t('clear_selection', 'Clear Selection')}
            </button>
            <button
              onClick={promptBulkDelete}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{t('delete_selected', 'Delete Selected')} ({selectedCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full">
          {/* Search input */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by product name or supplier name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* View Controls & Expand/Collapse Toggle */}
        {viewMode === 'supplier' && (
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              onClick={() => toggleExpandAll(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-50 transition-colors"
            >
              {t('expand_all', 'Expand All')}
            </button>
            <button
              onClick={() => toggleExpandAll(false)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {t('collapse_all', 'Collapse All')}
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('total_products', 'Total Products')}</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{formatNumber(allProducts.length)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{formatNumber(totalDisplayCount)} {t('filtered', 'visible')}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('total_suppliers', 'Total Suppliers')}</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{formatNumber(suppliers.length)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{t('registered', 'registered in system')}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('in_stock_items', 'Total Units in Stock')}</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {formatNumber(allProducts.reduce((acc, p) => acc + (parseFloat(p.stock_quantity || 0)), 0))}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{t('inventory_volume', 'inventory volume')}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('categories_count', 'Categories')}</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{formatNumber(categories.length)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{t('unique_groups', 'product classifications')}</div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'supplier' ? (
        /* ================= GROUPED BY SUPPLIER VIEW ================= */
        <div className="space-y-4">
          {totalDisplayCount === 0 && supplierGroups.length === 0 && unassignedProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{t('no_products_found', 'No Products Found')}</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                {searchTerm || selectedCategory
                  ? t('no_match_filter', 'No products or suppliers match your search filter.')
                  : t('no_products_yet', 'No products have been added to the inventory yet.')}
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-sm transition-colors"
                >
                  {t('add_first_product', 'Add Your First Product')}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Products without supplier / Unassigned */}
              {unassignedProducts.length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleSupplier('no_supplier')}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        ?
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-slate-800">{t('unassigned_products', 'General / Unassigned Products')}</h3>
                        <p className="text-xs text-slate-500">
                          {unassignedProducts.length} {unassignedProducts.length === 1 ? 'product' : 'products'} without supplier link
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {unassignedProducts.length} {t('items', 'items')}
                      </span>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expandedSuppliers['no_supplier'] ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedSuppliers['no_supplier'] && (
                    <div className="border-t border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50/75">
                            <tr>
                              {isAdmin && <th className="px-4 py-3 w-10 text-center"></th>}
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">#</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                              {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {unassignedProducts.map((product, pIdx) => {
                              const isChecked = selectedProductIds.has(product.id);
                              return (
                                <tr key={product.id} className={`hover:bg-indigo-50/30 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}>
                                  {isAdmin && (
                                    <td className="px-4 py-3.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSelectProduct(product.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </td>
                                  )}
                                  <td className="px-6 py-3.5 whitespace-nowrap text-xs font-mono font-medium text-slate-400">
                                    {pIdx + 1}
                                  </td>
                                  <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-800">
                                    {product.name}
                                  </td>
                                  {isAdmin && (
                                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                      <button
                                        onClick={() => promptSingleDelete(product)}
                                        title="Delete product"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Products Grouped by Supplier */}
              {supplierGroups.map(group => {
                const isExpanded = expandedSuppliers[group.id];
                const count = group.products.length;

                return (
                  <div key={group.id} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                    {/* Supplier Header */}
                    <button
                      onClick={() => toggleSupplier(group.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                          {group.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                            <span>{group.name}</span>
                            {group.company && group.company !== group.name && (
                              <span className="text-xs font-normal text-slate-400 font-sans">({group.company})</span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {count} {count === 1 ? 'product' : 'products'}
                            {group.phone ? ` • ${group.phone}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${count > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {count} {t('items', 'items')}
                        </span>
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Products Table for this Supplier */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        {count === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-sm">
                            {t('no_products_for_supplier', 'No products found under this supplier.')}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-slate-50/75">
                                <tr>
                                  {isAdmin && <th className="px-4 py-3 w-10 text-center"></th>}
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">#</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                                  {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Actions</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.products.map((product, pIdx) => {
                                  const isChecked = selectedProductIds.has(product.id);
                                  return (
                                    <tr key={product.id} className={`hover:bg-indigo-50/30 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}>
                                      {isAdmin && (
                                        <td className="px-4 py-3.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleSelectProduct(product.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                          />
                                        </td>
                                      )}
                                      <td className="px-6 py-3.5 whitespace-nowrap text-xs font-mono font-medium text-slate-400">
                                        {pIdx + 1}
                                      </td>
                                      <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-800">
                                        {product.name}
                                      </td>
                                      {isAdmin && (
                                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                          <button
                                            onClick={() => promptSingleDelete(product)}
                                            title="Delete product"
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
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
      ) : (
        /* ================= ALL PRODUCTS MASTER TABLE VIEW ================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
          {filteredProductsList.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{t('no_products_found', 'No Products Found')}</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                {searchTerm ? t('no_match_filter', 'No products match your search filter.') : t('no_products_yet', 'No products found.')}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      {isAdmin && (
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isPageAllSelected}
                            onChange={toggleSelectPage}
                            title={isPageAllSelected ? 'Deselect page' : 'Select page'}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">#</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier Name</th>
                      {isAdmin && (
                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTableProducts.map((product, index) => {
                      const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
                      const isChecked = selectedProductIds.has(product.id);
                      return (
                        <tr key={product.id} className={`hover:bg-indigo-50/30 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}>
                          {isAdmin && (
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectProduct(product.id)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-400 font-mono">
                            {rowNum}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-800">
                            {product.name}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600">
                            {product.supplier_name ? (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                                <span>🏢</span>
                                <span>{product.supplier_name}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No Supplier</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => promptSingleDelete(product)}
                                title="Delete product"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination: 50 items/page with up to 20 page number buttons */}
              {totalTablePages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500">
                    {t('showing', 'Showing')}{' '}
                    <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
                    {t('to', 'to')}{' '}
                    <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredProductsList.length)}</span>{' '}
                    {t('of', 'of')}{' '}
                    <span className="font-semibold text-slate-700">{formatNumber(filteredProductsList.length)}</span>{' '}
                    {t('products', 'products')} ({t('page', 'Page')} {currentPage} {t('of', 'of')} {totalTablePages})
                  </span>

                  <div className="flex flex-wrap items-center gap-1">
                    {/* First Page Jump */}
                    {totalTablePages > maxPageButtons && currentPage > Math.ceil(maxPageButtons / 2) && (
                      <button
                        onClick={() => handlePageChange(1)}
                        title={t('first_page', 'First Page')}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                      >
                        «
                      </button>
                    )}

                    {/* Previous Button */}
                    <button
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center space-x-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>{t('previous', 'Prev')}</span>
                    </button>

                    {/* Numbered Page Buttons (Up to 20 buttons displayed) */}
                    <div className="flex flex-wrap items-center gap-1">
                      {pageNumbers.map(page => {
                        const isActive = page === currentPage;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`min-w-[32px] h-8 text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${isActive
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                              }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      disabled={currentPage === totalTablePages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center space-x-1"
                    >
                      <span>{t('next', 'Next')}</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Last Page Jump */}
                    {totalTablePages > maxPageButtons && currentPage < totalTablePages - Math.floor(maxPageButtons / 2) && (
                      <button
                        onClick={() => handlePageChange(totalTablePages)}
                        title={t('last_page', 'Last Page')}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                      >
                        »
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal (Single or Multiple) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${deleting ? 'bg-rose-50 text-rose-600' : 'bg-rose-100 text-rose-600'
                }`}>
                {deleting ? (
                  <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {productToDelete ? t('delete_product', 'Delete Product') : t('delete_selected_products', 'Delete Selected Products')}
              </h3>

              {!deleting ? (
                <p className="text-sm text-slate-500 mb-6">
                  {productToDelete ? (
                    <>
                      Are you sure you want to delete <span className="font-semibold text-slate-800">"{productToDelete.name}"</span>?
                      This action cannot be undone.
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete <span className="font-semibold text-rose-600">{selectedCount}</span> selected product(s)?
                      This action cannot be undone.
                    </>
                  )}
                </p>
              ) : (
                /* Dynamic Progress Bar Section during deletion */
                <div className="my-5 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-left space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center space-x-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <span>{t('deleting_items', 'Deleting products...')}</span>
                    </span>
                    <span className="font-mono text-rose-600 font-bold text-sm">{deleteProgress.percent}%</span>
                  </div>

                  {/* Animated Progress Bar Track */}
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs relative overflow-hidden"
                      style={{ width: `${deleteProgress.percent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/25 animate-pulse"></div>
                    </div>
                  </div>

                  {/* Progress info and item counter */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                    <span className="truncate max-w-[200px] font-medium text-slate-600" title={deleteProgress.currentName}>
                      {deleteProgress.currentName}
                    </span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                      {deleteProgress.current} / {deleteProgress.total}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={deleting}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      <span>{t('deleting', 'Deleting...')} ({deleteProgress.percent}%)</span>
                    </>
                  ) : (
                    <span>{productToDelete ? t('delete', 'Delete') : t('confirm_delete', 'Confirm Delete')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{t('add_new_product', 'Add New Product')}</h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('product_name', 'Product Name')} *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter product name..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Supplier Name (Search existing or create new on the fly) */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('supplier', 'Supplier Name')}</span>
                  {formData.supplier_id && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Linked Supplier
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or type new supplier name..."
                    value={addSupplierSearch}
                    onFocus={() => setShowAddSupplierSuggestions(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddSupplierSearch(val);
                      setShowAddSupplierSuggestions(true);
                      const matched = suppliers.find(s => s.name && s.name.trim().toLowerCase() === val.trim().toLowerCase());
                      if (matched) {
                        setFormData(prev => ({ ...prev, supplier_id: String(matched.id) }));
                      } else {
                        setFormData(prev => ({ ...prev, supplier_id: '' }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowAddSupplierSuggestions(false);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  />
                  {addSupplierSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddSupplierSearch('');
                        setFormData(prev => ({ ...prev, supplier_id: '' }));
                        setShowAddSupplierSuggestions(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Supplier Suggestions Dropdown */}
                {showAddSupplierSuggestions && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowAddSupplierSuggestions(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-20 divide-y divide-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setAddSupplierSearch('');
                          setFormData(prev => ({ ...prev, supplier_id: '' }));
                          setShowAddSupplierSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-500 hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <span className="text-slate-400">🚫</span>
                        <span>{t('select_supplier', 'None / General (No Supplier)')}</span>
                      </button>

                      {suppliers
                        .filter(s => !addSupplierSearch.trim() || (s.name && s.name.toLowerCase().includes(addSupplierSearch.trim().toLowerCase())) || (s.company && s.company.toLowerCase().includes(addSupplierSearch.trim().toLowerCase())))
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setAddSupplierSearch(s.name || s.company || '');
                              setFormData(prev => ({ ...prev, supplier_id: String(s.id) }));
                              setShowAddSupplierSuggestions(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-indigo-50/60 flex items-center justify-between transition-colors ${String(formData.supplier_id) === String(s.id) ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700'}`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-indigo-500">🏢</span>
                              <span>{s.name}</span>
                              {s.company && s.company !== s.name && (
                                <span className="text-slate-400 font-normal">({s.company})</span>
                              )}
                            </div>
                            {s.phone && (
                              <span className="text-[11px] text-slate-400 font-mono">{s.phone}</span>
                            )}
                          </button>
                        ))}

                      {addSupplierSearch.trim() && !suppliers.some(s => s.name && s.name.trim().toLowerCase() === addSupplierSearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={async () => {
                            const created = await createOrGetSupplier(addSupplierSearch.trim());
                            if (created) {
                              setAddSupplierSearch(created.name);
                              setFormData(prev => ({ ...prev, supplier_id: String(created.id) }));
                              triggerAlert('success', `Created new supplier "${created.name}"`);
                            }
                            setShowAddSupplierSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 font-bold flex items-center space-x-2 transition-colors"
                        >
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Create New Supplier "{addSupplierSearch.trim()}"</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('sku', 'SKU / Barcode')} <span className="text-[10px] text-slate-400">(Optional — auto-generated if blank)</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('selling_price', 'Selling Price (৳)')}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('cost_price', 'Cost Price (৳)')}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{t('upload_products_csv', 'Upload Products CSV')}</h3>
              <button
                onClick={() => { setShowCsvUploadModal(false); setCsvFile(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCsvUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">{t('select_csv_file', 'Select CSV File')}</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">CSV Format:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,name,supplier_name\nSample Product 1,Apex Suppliers\nSample Product 2,Beximco Pharma\n";
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "products_template.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample CSV
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-indigo-700">name, supplier_name</div>
                  <div className="text-[11px] text-slate-500">Only "name" is required. All other columns are optional.</div>
                </div>

                {/* Animated Upload Progress Bar */}
                {uploadProgress.active && (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-left space-y-2.5 mt-3 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                      <span className="flex items-center space-x-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                        </span>
                        <span className="truncate max-w-[240px]">{uploadProgress.stage}</span>
                      </span>
                      <span className="font-mono text-emerald-700 font-bold text-sm bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                        {uploadProgress.percent}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-emerald-200/70 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs relative overflow-hidden"
                        style={{ width: `${uploadProgress.percent}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCsvUploadModal(false);
                    setCsvFile(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  disabled={uploading}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
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
