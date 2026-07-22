import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

export default function ManualOrder({ onNavigate = () => {} }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCashSales, setShowCashSales] = useState(false); // State to control visibility

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/manual-orders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch manual orders.');
                }
                const data = await response.json();
                setOrders(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const formatCurrency = (val) => `৳${parseFloat(val || 0).toFixed(2)}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Manual Sales Orders</h2>
                    <p className="text-sm text-slate-500">Create, view, and manage manual sales entries.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowCashSales(!showCashSales)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 border border-slate-200 rounded-xl text-sm shadow-xs transition-colors flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        <span>{showCashSales ? 'Hide' : 'Show'} Cash Sales</span>
                    </button>
                    <button
                        onClick={() => onNavigate('/manual-orders/new')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm shadow-sm transition-colors flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        <span>New Manual Order</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                <th className="p-4 pl-6">Order ID</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Payment</th>
                                {showCashSales && (
                                    <>
                                        <th className="p-4 text-right">Final Amount</th>
                                        <th className="p-4 text-right">Paid Amount</th>
                                        <th className="p-4 text-right">Due Amount</th>
                                    </>
                                )}
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr><td colSpan={showCashSales ? 9 : 6} className="p-12 text-center">Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={showCashSales ? 9 : 6} className="p-12 text-center text-rose-500">{error}</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={showCashSales ? 9 : 6} className="p-12 text-center text-slate-400">No manual orders found.</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50/50">
                                        <td className="p-4 pl-6 font-mono font-semibold">#{order.id}</td>
                                        <td className="p-4">{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td className="p-4">{order.customer_name || 'N/A'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4">{order.payment_method}</td>
                                        {showCashSales && (
                                            <>
                                                <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(order.sale_final_amount)}</td>
                                                <td className="p-4 text-right font-semibold text-emerald-600">{formatCurrency(order.sale_paid_amount)}</td>
                                                <td className="p-4 text-right font-semibold text-rose-600">{formatCurrency(order.current_sale_due)}</td>
                                            </>
                                        )}
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => onNavigate(`/manual-orders/${order.id}`)}
                                                className="text-indigo-600 hover:underline font-semibold text-xs"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}