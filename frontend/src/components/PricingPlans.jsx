import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

export default function PricingPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'BDT',
    billing_period: 'month',
    features: [],
    is_popular: false,
    is_active: true,
    sort_order: 0,
    button_text: 'Get Started'
  });

  const [featureInput, setFeatureInput] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing-plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (err) {
      console.error('Failed to fetch pricing plans:', err);
      setError('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'BDT',
      billing_period: 'month',
      features: [],
      is_popular: false,
      is_active: true,
      sort_order: plans.length,
      button_text: 'Get Started'
    });
    setFeatureInput('');
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      billing_period: plan.billing_period,
      features: plan.features || [],
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      button_text: plan.button_text
    });
    setFeatureInput('');
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()]
      });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = isCreating 
        ? `${API_BASE_URL}/pricing-plans`
        : `${API_BASE_URL}/pricing-plans/${selectedPlan.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess(isCreating ? 'Plan created successfully' : 'Plan updated successfully');
        setTimeout(() => setSuccess(''), 2000);
        setIsEditing(false);
        setIsCreating(false);
        setSelectedPlan(null);
        fetchPlans();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save plan');
      }
    } catch (err) {
      setError('Failed to save plan');
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pricing plan?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/pricing-plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setPlans(plans.filter(plan => plan.id !== id));
        if (selectedPlan && selectedPlan.id === id) {
          setSelectedPlan(null);
          setIsEditing(false);
        }
        setSuccess('Plan deleted successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError('Failed to delete plan');
      }
    } catch (err) {
      setError('Failed to delete plan');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedPlan(null);
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Plans Management</h1>
        <button
          onClick={handleCreatePlan}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Create New Plan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {(isEditing || isCreating) && (
        <div className="mb-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isCreating ? 'Create New Pricing Plan' : 'Edit Pricing Plan'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Plan Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder="e.g., Starter, Professional"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder="e.g., 1500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                >
                  <option value="BDT">BDT</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Billing Period</label>
                <select
                  value={formData.billing_period}
                  onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                >
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                  <option value="week">Week</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder="Display order"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Button Text</label>
                <input
                  type="text"
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder="e.g., Get Started"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 resize-none"
                placeholder="Brief description of the plan"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Features</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder="Add a feature"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-gray-700">{feature}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-gray-700">Mark as Popular</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {isCreating ? 'Create Plan' : 'Update Plan'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-xl border transition-all shadow-sm hover:shadow-lg ${
              plan.is_popular
                ? 'bg-gray-900 border-2 border-gray-900'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                {plan.is_popular && (
                  <div className="text-gray-400 text-xs font-semibold mb-1">MOST POPULAR</div>
                )}
                <h3 className={`font-bold text-lg ${plan.is_popular ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditPlan(plan)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            <p className={`mb-4 text-sm ${plan.is_popular ? 'text-gray-400' : 'text-gray-600'}`}>
              {plan.description}
            </p>
            
            <div className="mb-4">
              <span className={`text-3xl font-bold ${plan.is_popular ? 'text-white' : 'text-gray-900'}`}>
                {plan.currency} {plan.price}
              </span>
              <span className={`text-sm ${plan.is_popular ? 'text-gray-400' : 'text-gray-600'}`}>
                /{plan.billing_period}
              </span>
            </div>
            
            <ul className="space-y-2 mb-4">
              {plan.features && plan.features.map((feature, index) => (
                <li key={index} className={`flex items-center text-sm ${plan.is_popular ? 'text-gray-300' : 'text-gray-600'}`}>
                  <svg className={`w-4 h-4 mr-2 ${plan.is_popular ? 'text-white' : 'text-gray-900'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="flex items-center justify-between text-xs">
              <span className={plan.is_popular ? 'text-gray-400' : 'text-gray-500'}>
                Order: {plan.sort_order}
              </span>
              <span className={plan.is_active ? 'text-green-500' : 'text-red-500'}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}