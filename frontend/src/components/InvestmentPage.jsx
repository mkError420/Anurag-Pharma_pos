import React from 'react';
import Investments from './Investments';

export default function InvestmentPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Investment &amp; Capital Management</h2>
          <p className="text-sm text-slate-500">Track capital injections, withdrawals, and reinvestments</p>
        </div>
      </div>

      {/* Investment Section */}
      <Investments />
    </div>
  );
}
