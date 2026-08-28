import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function CalculatorDrawer({ isOpen, onClose }) {
  const { language, t, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState('calc'); // 'calc', 'history', 'business'
  
  // Calculator state
  const [displayValue, setDisplayValue] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [copied, setCopied] = useState(false);

  // Business tools state
  const [marginCost, setMarginCost] = useState('');
  const [marginPercent, setMarginPercent] = useState('15');
  const [discountPrice, setDiscountPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [vatAmount, setVatAmount] = useState('');
  const [vatPercent, setVatPercent] = useState('5');

  const drawerRef = useRef(null);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_calc_history', JSON.stringify(history.slice(0, 50)));
    } catch (e) {}
  }, [history]);

  // Keyboard navigation & inputs
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't capture keyboard if user is typing in business tool inputs
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape') {
          onClose();
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDot();
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        e.preventDefault();
        const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
        performOperation(opMap[e.key] || e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        clearAll();
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayValue, expression, waitingForOperand]);

  // Calculator Functions
  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplayValue(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? String(digit) : displayValue + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const clearAll = () => {
    setDisplayValue('0');
    setExpression('');
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (displayValue.length > 1) {
      setDisplayValue(displayValue.slice(0, -1));
    } else {
      setDisplayValue('0');
    }
  };

  const handlePlusMinus = () => {
    const val = parseFloat(displayValue);
    if (!isNaN(val)) {
      setDisplayValue(String(val * -1));
    }
  };

  const handlePercent = () => {
    const val = parseFloat(displayValue);
    if (!isNaN(val)) {
      const res = val / 100;
      setDisplayValue(String(res));
    }
  };

  const handleSquareRoot = () => {
    const val = parseFloat(displayValue);
    if (!isNaN(val)) {
      if (val < 0) {
        setDisplayValue('Error');
      } else {
        const res = Math.sqrt(val);
        const formatted = Number.isInteger(res) ? String(res) : String(parseFloat(res.toFixed(8)));
        addHistory(`√(${val})`, formatted);
        setDisplayValue(formatted);
        setWaitingForOperand(true);
      }
    }
  };

  const handleSquare = () => {
    const val = parseFloat(displayValue);
    if (!isNaN(val)) {
      const res = val * val;
      const formatted = Number.isInteger(res) ? String(res) : String(parseFloat(res.toFixed(8)));
      addHistory(`(${val})²`, formatted);
      setDisplayValue(formatted);
      setWaitingForOperand(true);
    }
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(displayValue);

    if (expression && !waitingForOperand) {
      // Calculate intermediate result
      const exprToEval = expression + ' ' + displayValue;
      const result = evaluateExpression(exprToEval);
      if (result !== null) {
        setDisplayValue(String(result));
        setExpression(`${result} ${nextOperator}`);
      } else {
        setExpression(`${inputValue} ${nextOperator}`);
      }
    } else {
      setExpression(`${displayValue} ${nextOperator}`);
    }

    setWaitingForOperand(true);
  };

  const evaluateExpression = (expr) => {
    try {
      // Normalize symbols to JS math
      const sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/[^0-9+\-*/.() ]/g, '');
      
      // Safe evaluation of mathematical expression
      // eslint-disable-next-line no-new-func
      const evalFn = new Function(`return (${sanitized})`);
      const result = evalFn();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Number.isInteger(result) ? result : parseFloat(result.toFixed(8));
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleEquals = () => {
    if (!expression && !waitingForOperand) return;

    const fullExpr = expression ? `${expression} ${displayValue}` : displayValue;
    const result = evaluateExpression(fullExpr);

    if (result !== null) {
      const formatted = String(result);
      addHistory(fullExpr, formatted);
      setDisplayValue(formatted);
      setExpression('');
      setWaitingForOperand(true);
    } else {
      setDisplayValue('Error');
      setWaitingForOperand(true);
    }
  };

  const addHistory = (expr, res) => {
    const newItem = {
      id: Date.now(),
      expr,
      res,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setHistory(prev => [newItem, ...prev.slice(0, 49)]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Business calculations
  const calculateMargin = () => {
    const cost = parseFloat(marginCost) || 0;
    const margin = parseFloat(marginPercent) || 0;
    if (cost <= 0 || margin <= 0 || margin >= 100) return null;
    const sellPrice = cost / (1 - margin / 100);
    const profit = sellPrice - cost;
    return { sellPrice: sellPrice.toFixed(2), profit: profit.toFixed(2) };
  };

  const calculateDiscount = () => {
    const price = parseFloat(discountPrice) || 0;
    const disc = parseFloat(discountPercent) || 0;
    if (price <= 0 || disc <= 0) return null;
    const saved = price * (disc / 100);
    const finalPrice = price - saved;
    return { finalPrice: finalPrice.toFixed(2), saved: saved.toFixed(2) };
  };

  const calculateVAT = () => {
    const base = parseFloat(vatAmount) || 0;
    const vat = parseFloat(vatPercent) || 0;
    if (base <= 0 || vat <= 0) return null;
    const tax = base * (vat / 100);
    const total = base + tax;
    return { total: total.toFixed(2), tax: tax.toFixed(2) };
  };

  const marginResult = calculateMargin();
  const discountResult = calculateDiscount();
  const vatResult = calculateVAT();

  return (
    <>
      {/* Backdrop Overlay with smooth fade */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Slide-out Calculator Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800 dark:to-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 text-lg">
              🧮
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {t('calculator', 'Quick Calculator')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('calc_shortcut', 'Shortcut: Alt + C or Esc to close')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-xs font-semibold gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('calc')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'calc'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <span>🔢</span> {t('standard', 'Standard')}
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'business'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <span>💼</span> {t('shop_tools', 'Shop Tools')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <span>📜</span> {t('history', 'History')} ({history.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
          
          {/* TAB 1: STANDARD CALCULATOR */}
          {activeTab === 'calc' && (
            <div className="flex flex-col h-full justify-between gap-4">
              
              {/* Display Screen */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-inner border border-slate-800 flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono overflow-x-auto whitespace-nowrap">
                  <span>{expression || ' '}</span>
                  <button
                    onClick={() => copyToClipboard(displayValue)}
                    className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 transition-colors"
                    title="Copy Result"
                  >
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <div className="text-right text-3xl sm:text-4xl font-mono font-bold tracking-tight text-emerald-400 overflow-x-auto whitespace-nowrap py-1">
                  {displayValue}
                </div>
              </div>

              {/* Scientific / Utility Bar */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={handleSquareRoot}
                  className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors shadow-sm"
                  title="Square Root"
                >
                  √x
                </button>
                <button
                  onClick={handleSquare}
                  className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors shadow-sm"
                  title="Square"
                >
                  x²
                </button>
                <button
                  onClick={handlePercent}
                  className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors shadow-sm"
                  title="Percentage"
                >
                  %
                </button>
                <button
                  onClick={handleBackspace}
                  className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm transition-colors shadow-sm"
                  title="Backspace"
                >
                  ⌫
                </button>
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-4 gap-2.5">
                {/* Row 1 */}
                <button
                  onClick={clearAll}
                  className="py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 font-bold text-base transition-colors shadow-sm"
                >
                  AC
                </button>
                <button
                  onClick={handlePlusMinus}
                  className="py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-base transition-colors shadow-sm"
                >
                  ±
                </button>
                <button
                  onClick={() => performOperation('÷')}
                  className="py-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 font-bold text-lg transition-colors shadow-sm"
                >
                  ÷
                </button>
                <button
                  onClick={() => performOperation('×')}
                  className="py-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 font-bold text-lg transition-colors shadow-sm"
                >
                  ×
                </button>

                {/* Row 2 */}
                <button
                  onClick={() => inputDigit(7)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  7
                </button>
                <button
                  onClick={() => inputDigit(8)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  8
                </button>
                <button
                  onClick={() => inputDigit(9)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  9
                </button>
                <button
                  onClick={() => performOperation('−')}
                  className="py-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 font-bold text-lg transition-colors shadow-sm"
                >
                  −
                </button>

                {/* Row 3 */}
                <button
                  onClick={() => inputDigit(4)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  4
                </button>
                <button
                  onClick={() => inputDigit(5)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  5
                </button>
                <button
                  onClick={() => inputDigit(6)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  6
                </button>
                <button
                  onClick={() => performOperation('+')}
                  className="py-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 font-bold text-lg transition-colors shadow-sm"
                >
                  +
                </button>

                {/* Row 4 */}
                <button
                  onClick={() => inputDigit(1)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  1
                </button>
                <button
                  onClick={() => inputDigit(2)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  2
                </button>
                <button
                  onClick={() => inputDigit(3)}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  3
                </button>
                <button
                  onClick={handleEquals}
                  className="py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center active:scale-95 transition-all"
                >
                  =
                </button>

                {/* Row 5 */}
                <button
                  onClick={() => inputDigit(0)}
                  className="col-span-2 py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  onClick={inputDot}
                  className="py-3.5 rounded-xl bg-slate-50 hover:bg-white text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-100 font-bold text-lg border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                >
                  .
                </button>
                <button
                  onClick={handleEquals}
                  className="py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center active:scale-95 transition-all"
                >
                  =
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BUSINESS & PHARMACY TOOLS */}
          {activeTab === 'business' && (
            <div className="space-y-4">
              
              {/* Tool 1: Profit Margin & Selling Price */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    📈 Margin & Selling Price
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cost Price (৳)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={marginCost}
                      onChange={(e) => setMarginCost(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Margin %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(e.target.value)}
                      placeholder="15"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                </div>
                {marginResult && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold block">Sell at: ৳{marginResult.sellPrice}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Profit: ৳{marginResult.profit}</span>
                    </div>
                    <button
                      onClick={() => {
                        setDisplayValue(marginResult.sellPrice);
                        setActiveTab('calc');
                      }}
                      className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold shadow hover:bg-emerald-700"
                    >
                      Use ৳
                    </button>
                  </div>
                )}
              </div>

              {/* Tool 2: Discount Calculator */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    🏷️ Discount & Offer
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Original Price (৳)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Discount %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="10"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                </div>
                {discountResult && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-amber-800 dark:text-amber-300 font-bold block">After Discount: ৳{discountResult.finalPrice}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">Customer Saves: ৳{discountResult.saved}</span>
                    </div>
                    <button
                      onClick={() => {
                        setDisplayValue(discountResult.finalPrice);
                        setActiveTab('calc');
                      }}
                      className="px-2 py-1 rounded bg-amber-600 text-white text-[10px] font-bold shadow hover:bg-amber-700"
                    >
                      Use ৳
                    </button>
                  </div>
                )}
              </div>

              {/* Tool 3: VAT / Tax Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                    🧾 VAT & Tax Calculator
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Base Amount (৳)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={vatAmount}
                      onChange={(e) => setVatAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">VAT Rate %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vatPercent}
                      onChange={(e) => setVatPercent(e.target.value)}
                      placeholder="5"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                </div>
                {vatResult && (
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-violet-800 dark:text-violet-300 font-bold block">Total with VAT: ৳{vatResult.total}</span>
                      <span className="text-[10px] text-violet-600 dark:text-violet-400">VAT portion: ৳{vatResult.tax}</span>
                    </div>
                    <button
                      onClick={() => {
                        setDisplayValue(vatResult.total);
                        setActiveTab('calc');
                      }}
                      className="px-2 py-1 rounded bg-violet-600 text-white text-[10px] font-bold shadow hover:bg-violet-700"
                    >
                      Use ৳
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: CALCULATION HISTORY */}
          {activeTab === 'history' && (
            <div className="flex flex-col h-full justify-between gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 uppercase">Recent Calculations</span>
                {history.length > 0 && (
                  <button
                    onClick={() => setHistory([])}
                    className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Clear History
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-3xl mb-2">📜</p>
                    <p className="text-xs font-semibold">No calculation history yet</p>
                    <p className="text-[11px]">Calculations you perform will appear here.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setDisplayValue(item.res);
                        setActiveTab('calc');
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group flex justify-between items-center"
                    >
                      <div>
                        <div className="text-xs text-slate-400 font-mono">{item.expr}</div>
                        <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                          = {item.res}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{item.time}</span>
                        <span className="text-[10px] text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          Use ↵
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
