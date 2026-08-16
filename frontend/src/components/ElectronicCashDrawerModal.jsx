import React, { useState, useEffect } from 'react';
import {
  getDrawerConfig,
  saveDrawerConfig,
  getDrawerFloat,
  saveDrawerFloat,
  calculateDrawerTotal,
  getDrawerLogs,
  clearDrawerLogs,
  triggerDrawerEjection
} from '../utils/cashDrawerService';

export default function ElectronicCashDrawerModal({
  isOpen,
  onClose,
  initialTab = 'drawer', // 'drawer' | 'compartments' | 'logs' | 'settings'
  onDrawerEjected = () => {}
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [config, setConfig] = useState(getDrawerConfig());
  const [floatData, setFloatData] = useState(getDrawerFloat());
  const [logs, setLogs] = useState(getDrawerLogs());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastEjectReason, setLastEjectReason] = useState('Ready');
  const [isEjectingAnim, setIsEjectingAnim] = useState(false);
  const [keyAngle, setKeyAngle] = useState(45); // 0deg (Locked), 45deg (Electronic), 90deg (Emergency Manual Release)
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getDrawerConfig();
      setConfig(cfg);
      setFloatData(getDrawerFloat());
      setLogs(getDrawerLogs());
      if (cfg.lockState === 'locked') setKeyAngle(0);
      else if (cfg.lockState === 'manual_open') setKeyAngle(90);
      else setKeyAngle(45);
    }
  }, [isOpen]);

  // Listen to global cash drawer ejection events
  useEffect(() => {
    const handleEjection = (e) => {
      setIsDrawerOpen(true);
      setIsEjectingAnim(true);
      setLastEjectReason(e.detail?.reason || 'Auto Cash Receipt Kick');
      setLogs(getDrawerLogs());
      setTimeout(() => setIsEjectingAnim(false), 600);
      onDrawerEjected(e.detail);
    };

    window.addEventListener('pos-cash-drawer-ejected', handleEjection);
    return () => window.removeEventListener('pos-cash-drawer-ejected', handleEjection);
  }, [onDrawerEjected]);

  if (!isOpen) return null;

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  // Perform electronic kick ejection
  const handleKickEjection = (reason = 'Manual Test Kick', isManualKey = false) => {
    if (config.lockState === 'locked' && !isManualKey) {
      triggerAlert('error', 'Drawer is physically LOCKED with key. Turn key to Auto/Electric position first.');
      return;
    }

    const res = triggerDrawerEjection({
      reason,
      isManualKey,
      method: isManualKey ? 'MANUAL_KEY_OVERRIDE' : 'TEST_PULSE'
    });

    if (res.success) {
      setIsDrawerOpen(true);
      setIsEjectingAnim(true);
      setLastEjectReason(reason);
      setLogs(getDrawerLogs());
      triggerAlert('success', res.message);
      setTimeout(() => setIsEjectingAnim(false), 600);
    } else {
      triggerAlert('error', res.message);
    }
  };

  // Emergency Manual Key Release
  const handleEmergencyManualKeyRelease = () => {
    setKeyAngle(90);
    const updatedCfg = { ...config, lockState: 'manual_open' };
    setConfig(updatedCfg);
    saveDrawerConfig(updatedCfg);
    handleKickEjection('Emergency Manual Key Release (Physical Override)', true);
  };

  // Change 3-Position Key Lock
  const handleSetLockState = (mode) => {
    let angle = 45;
    if (mode === 'locked') angle = 0;
    if (mode === 'manual_open') angle = 90;
    setKeyAngle(angle);

    const updatedCfg = { ...config, lockState: mode };
    setConfig(updatedCfg);
    saveDrawerConfig(updatedCfg);

    if (mode === 'manual_open') {
      handleKickEjection('Emergency Manual Key Release Override', true);
    } else if (mode === 'locked') {
      setIsDrawerOpen(false);
      triggerAlert('warning', 'Cash Drawer Lock turned to LOCKED (Electrical solenoid pulse disabled).');
    } else {
      triggerAlert('success', 'Cash Drawer Lock turned to AUTO/ELECTRIC (Ready for Cash Receipt Printing).');
    }
  };

  // Push drawer closed manually
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    triggerAlert('success', 'Cash drawer tray pushed and latched closed.');
  };

  // Update Bill Count
  const updateBillCount = (index, delta) => {
    const newBills = [...floatData.bills];
    const current = parseInt(newBills[index].count, 10) || 0;
    newBills[index].count = Math.max(0, current + delta);
    const updated = { ...floatData, bills: newBills };
    setFloatData(updated);
    saveDrawerFloat(updated);
  };

  // Update Coin Count
  const updateCoinCount = (index, delta) => {
    const newCoins = [...floatData.coins];
    const current = parseInt(newCoins[index].count, 10) || 0;
    newCoins[index].count = Math.max(0, current + delta);
    const updated = { ...floatData, coins: newCoins };
    setFloatData(updated);
    saveDrawerFloat(updated);
  };

  // Direct edit bill input
  const setDirectBillCount = (index, val) => {
    const newBills = [...floatData.bills];
    newBills[index].count = Math.max(0, parseInt(val, 10) || 0);
    const updated = { ...floatData, bills: newBills };
    setFloatData(updated);
    saveDrawerFloat(updated);
  };

  // Direct edit coin input
  const setDirectCoinCount = (index, val) => {
    const newCoins = [...floatData.coins];
    newCoins[index].count = Math.max(0, parseInt(val, 10) || 0);
    const updated = { ...floatData, coins: newCoins };
    setFloatData(updated);
    saveDrawerFloat(updated);
  };

  // Save Settings Changes
  const handleUpdateConfig = (key, value) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveDrawerConfig(updated);
    triggerAlert('success', 'Hardware configuration updated successfully.');
  };

  const totalCashHeld = calculateDrawerTotal(floatData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-slate-300 text-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Classic Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-extrabold tracking-tight text-white">Electronic Cash Drawer Controller</h2>
                <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isDrawerOpen 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse'
                    : config.lockState === 'locked'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {isDrawerOpen ? '🟢 Drawer Open / Ejected' : config.lockState === 'locked' ? '🔒 Locked' : '⚪ Latched Closed'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Automatic Receipt Kick &bull; 5 Bill / 8 Coin Compartments &bull; 3-Position Emergency Manual Key
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Classic Navigation Bar */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-6 gap-2 pt-2">
          {[
            { id: 'drawer', label: 'Hardware HUD & Ejection', icon: '⚡' },
            { id: 'compartments', label: 'Banknotes & Coins Float', icon: '💵' },
            { id: 'logs', label: 'Security Audit Trail', icon: '📋' },
            { id: 'settings', label: 'ESC/POS Port Configuration', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 border-slate-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Classic Alert Notification */}
        {alert && (
          <div className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              <span>{alert.type === 'success' ? '✓' : alert.type === 'warning' ? '⚠' : '✕'}</span>
              <span>{alert.message}</span>
            </div>
            <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-700 ml-3">&times;</button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">

          {/* TAB 1: CLASSIC HARDWARE HUD & SOLENOID INTERACTIVE CONTROLLER */}
          {activeTab === 'drawer' && (
            <div className="space-y-6">
              
              {/* Classic Physical Cash Drawer Casing */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 overflow-hidden">
                
                {/* Header Specification Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Solid Steel POS Cash Drawer</span>
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                      RJ11/RJ12 24V Solenoid
                    </span>
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {config.kickPin === 'pin5' ? 'Star / Pin 5' : 'Epson / Pin 2'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Current Cash Float Balance:</span>
                    <span className="text-base font-black text-emerald-700 font-mono bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 shadow-xs">
                      {config.currencySymbol}{totalCashHeld.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Classic Visual Drawer Chassis */}
                <div className="bg-slate-900 rounded-xl p-5 border-4 border-slate-800 shadow-xl">
                  
                  {/* Front Media Slot Bezel */}
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Dual Front Cheque &amp; Slip Posting Slots</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 bg-slate-800 rounded border border-slate-700 shadow-inner" title="Cheque Slot"></div>
                      <div className="w-28 h-2 bg-slate-800 rounded border border-slate-700 shadow-inner" title="Credit Card Voucher Slot"></div>
                    </div>
                  </div>

                  {/* Classic Sliding Cash Drawer Tray */}
                  <div className={`transition-all duration-500 ease-out transform ${
                    isDrawerOpen 
                      ? 'translate-y-2 bg-slate-100 border-2 border-emerald-500 shadow-2xl' 
                      : 'bg-slate-200 border-2 border-slate-400 opacity-95'
                  } rounded-xl p-4.5 text-slate-900`}>
                    
                    {/* Tray Status Bar */}
                    <div className="flex items-center justify-between mb-3.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">Physical Tray Position:</span>
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                          isDrawerOpen 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'bg-slate-300 text-slate-700'
                        }`}>
                          {isDrawerOpen ? 'EJECTED (SPRING EXPANDED)' : 'LATCHED (RETRACTED & CLOSED)'}
                        </span>
                      </div>

                      {isDrawerOpen && (
                        <button
                          type="button"
                          onClick={handleCloseDrawer}
                          className="px-3.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <span>Push Tray Closed</span>
                          <span>&rarr;</span>
                        </button>
                      )}
                    </div>

                    {/* 5 Banknote Compartment Previews */}
                    <div className="grid grid-cols-5 gap-2.5 mb-3.5">
                      {floatData.bills.map((bill, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-lg p-2.5 border border-slate-300 text-center shadow-xs hover:border-amber-400 transition-colors"
                        >
                          {/* Chrome Spring Clamp Visual */}
                          <div className="h-1.5 w-10 bg-slate-400 mx-auto rounded-full mb-1.5 shadow-xs"></div>
                          <div className="text-xs font-black text-slate-900 font-mono">{config.currencySymbol}{bill.label}</div>
                          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{bill.count} bills</div>
                          <div className="text-[10px] font-bold text-emerald-700 font-mono mt-1">
                            {config.currencySymbol}{(bill.value * bill.count).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 8 Removable Coin Cup Previews */}
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-300">
                      {floatData.coins.map((coin, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-md p-1.5 border border-slate-200 text-center shadow-2xs"
                        >
                          <div className="w-6 h-6 mx-auto rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-[9px] font-black text-slate-900 shadow-2xs mb-1">
                            {coin.label}
                          </div>
                          <div className="text-[9px] font-bold text-slate-600">{coin.count} pcs</div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Classic 3-Position Key & Solenoid Control Deck */}
                  <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                    
                    {/* 3-Position Mechanical Key Lock */}
                    <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800 w-full md:w-auto">
                      {/* Rotating Key Cylinder Visual */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center relative shadow-inner">
                          <div
                            className="w-1.5 h-8 bg-amber-400 rounded-sm shadow-md transition-transform duration-300"
                            style={{ transform: `rotate(${keyAngle}deg)` }}
                          ></div>
                          <div className="absolute w-3 h-3 rounded-full bg-slate-900 border border-amber-400"></div>
                        </div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold mt-1">3-Way Key</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-300 block">Mechanical Lock Position:</span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetLockState('locked')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              config.lockState === 'locked'
                                ? 'bg-rose-600 text-white shadow-md'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            🔒 Locked (0°)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetLockState('electronic')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              config.lockState === 'electronic'
                                ? 'bg-amber-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            ⚡ Auto/Electric (45°)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetLockState('manual_open')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              config.lockState === 'manual_open'
                                ? 'bg-emerald-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            🔑 Release (90°)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Classic Kick & Emergency Ejection Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleKickEjection('ESC/POS Solenoid Pulse Test')}
                        disabled={config.lockState === 'locked'}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        <span>Test Ejection Pulse</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEmergencyManualKeyRelease}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span>Emergency Key Release</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>

              {/* 3 Information Cards with Classic POS Style */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Auto Eject on Cash Receipt</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Whenever a cashier finalizes a cash sale or prints a thermal receipt, the POS sends the ESC/POS kick pulse to open the drawer automatically.
                  </p>
                </div>

                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Secure Dual Compartments</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Features 5 spring-loaded bill slots with wire clamps, 8 removable coin cups, and under-tray media posting slots for large notes and merchant slips.
                  </p>
                </div>

                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Emergency Manual Key Release</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Provides fail-safe physical key release during power outages or system downtime. Every manual override is logged into the audit ledger.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CLASSIC BANKNOTES & COINS FLOAT MANAGER */}
          {activeTab === 'compartments' && (
            <div className="space-y-6">
              
              {/* Float Summary Banner */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drawer Cash Float Total</span>
                  <div className="text-3xl font-black text-slate-900 font-mono mt-1">
                    {config.currencySymbol}{totalCashHeld.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {floatData.bills.reduce((s, b) => s + (parseInt(b.count, 10) || 0), 0)} Banknotes &bull; {floatData.coins.reduce((s, c) => s + (parseInt(c.count, 10) || 0), 0)} Coins in cups
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const resetFloat = {
                        bills: [
                          { label: '1000', value: 1000, count: 5 },
                          { label: '500', value: 500, count: 6 },
                          { label: '200', value: 200, count: 5 },
                          { label: '100', value: 100, count: 10 },
                          { label: '50', value: 50, count: 0 },
                        ],
                        coins: [
                          { label: '50', value: 50, count: 0 },
                          { label: '20', value: 20, count: 10 },
                          { label: '10', value: 10, count: 20 },
                          { label: '5', value: 5, count: 20 },
                          { label: '2', value: 2, count: 50 },
                          { label: '1', value: 1, count: 100 },
                          { label: '0.50', value: 0.5, count: 0 },
                          { label: '0.25', value: 0.25, count: 0 },
                        ],
                        mediaSlots: { chequesCount: 0, chequesValue: 0, creditVouchersCount: 0, creditVouchersValue: 0 }
                      };
                      setFloatData(resetFloat);
                      saveDrawerFloat(resetFloat);
                      triggerAlert('success', 'Float reset to standard morning shift opening cash.');
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 rounded-xl border border-slate-300 transition-colors"
                  >
                    Reset Morning Float
                  </button>
                </div>
              </div>

              {/* 5 Banknote Compartments Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>💵</span>
                    <span>5 Banknote Compartments (Spring Wire Clamps)</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-600 font-mono">
                    Notes Subtotal: {config.currencySymbol}{floatData.bills.reduce((s, b) => s + (b.value * b.count), 0).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {floatData.bills.map((bill, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-base font-black text-slate-900 font-mono">{config.currencySymbol}{bill.label}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                            Slot {idx + 1}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-500">Value: {config.currencySymbol}{(bill.value * bill.count).toLocaleString()}</div>
                      </div>

                      <div className="mt-4 flex items-center justify-between bg-white p-1.5 rounded-lg border border-slate-300 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateBillCount(idx, -1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-sm flex items-center justify-center transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={bill.count}
                          onChange={(e) => setDirectBillCount(idx, e.target.value)}
                          className="w-14 bg-transparent text-center font-mono font-bold text-sm text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateBillCount(idx, 1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-sm flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8 Secure Coin Cups Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>🪙</span>
                    <span>8 Removable Coin Cups</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-600 font-mono">
                    Coins Subtotal: {config.currencySymbol}{floatData.coins.reduce((s, c) => s + (c.value * c.count), 0).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                  {floatData.coins.map((coin, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between text-center">
                      <div>
                        <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-xs font-black text-slate-950 shadow-xs mb-1">
                          {coin.label}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-1">{config.currencySymbol}{(coin.value * coin.count).toFixed(2)}</div>
                      </div>

                      <div className="mt-3 flex items-center justify-between bg-white p-1 rounded border border-slate-300 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateCoinCount(idx, -5)}
                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold"
                          title="-5 coins"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={coin.count}
                          onChange={(e) => setDirectCoinCount(idx, e.target.value)}
                          className="w-8 bg-transparent text-center font-mono text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateCoinCount(idx, 5)}
                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold"
                          title="+5 coins"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SECURITY AUDIT TRAIL */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Drawer Access &amp; Ejection Security Audit</h3>
                  <p className="text-xs text-slate-500">Timestamped record of all automatic receipt kicks, manual key releases, and test pulses</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearDrawerLogs();
                    setLogs([]);
                    triggerAlert('success', 'Security audit logs cleared.');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
                >
                  Clear Logs
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No drawer ejection events recorded yet. Ejections triggered during checkout or testing will appear here.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Time</th>
                        <th className="p-3">Cashier</th>
                        <th className="p-3">Trigger Event</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Lock State</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 font-sans font-semibold text-slate-800">{log.user}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.type === 'AUTO_EJECT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              log.type === 'MANUAL_KEY_OVERRIDE' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-700">{log.reason}</td>
                          <td className="p-3 text-slate-500 uppercase">{log.lockState}</td>
                          <td className="p-3">
                            <span className="text-emerald-600 font-bold">SUCCESS</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HARDWARE ESC/POS CONFIGURATION */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Hardware Protocol &amp; Pulse Configuration</h3>
                
                {/* Auto Ejection Switch */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Automatic Drawer Ejection on Cash Receipt Print</span>
                    <span className="text-xs text-slate-500">Trigger electronic solenoid kick pulse as soon as cashier prints a cash receipt or completes a cash transaction.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoEjectOnCashReceipt}
                      onChange={(e) => handleUpdateConfig('autoEjectOnCashReceipt', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Audio Solenoid Sound Switch */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Acoustic Solenoid &amp; Spring Slide Sound FX</span>
                    <span className="text-xs text-slate-500">Play synthesized mechanical latch release sound on ejection.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.soundFxEnabled}
                      onChange={(e) => handleUpdateConfig('soundFxEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* RJ11/RJ12 Kick Pin selection */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase block">RJ11 / RJ12 Drawer Kick Pin</label>
                    <select
                      value={config.kickPin}
                      onChange={(e) => handleUpdateConfig('kickPin', e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="pin2">Pin 2 (Epson Standard ESC/POS - 0x1B 0x70 0x00)</option>
                      <option value="pin5">Pin 5 (Star Micronics / Alternate - 0x1B 0x70 0x01)</option>
                    </select>
                    <p className="text-[11px] text-slate-500">Standard Epson, Xprinter, Sunmi, Posiflex printers use Pin 2.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase block">Solenoid Pulse Duration (Milliseconds)</label>
                    <select
                      value={config.pulseDurationMs}
                      onChange={(e) => handleUpdateConfig('pulseDurationMs', parseInt(e.target.value, 10))}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="50">50 ms (Fast Light Latch)</option>
                      <option value="100">100 ms (Standard Default)</option>
                      <option value="150">150 ms (Heavy Industrial Solenoid)</option>
                      <option value="200">200 ms (Long Pulse)</option>
                    </select>
                    <p className="text-[11px] text-slate-500">Controls the electrical trigger pulse duration sent through the RJ11 connector.</p>
                  </div>
                </div>

                {/* ESC/POS Raw Command Preview */}
                <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-inner">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Generated ESC/POS Hex Pulse Command:</span>
                  <div className="font-mono text-amber-400 text-sm font-bold">
                    ESC p {config.kickPin === 'pin5' ? '1' : '0'} {Math.round(config.pulseDurationMs / 2)} {Math.round(config.pulseDurationMs / 2)} &nbsp;&rarr;&nbsp; [ 0x1B, 0x70, {config.kickPin === 'pin5' ? '0x01' : '0x00'}, 0x{Math.round(config.pulseDurationMs / 2).toString(16).padStart(2, '0').toUpperCase()}, 0x{Math.round(config.pulseDurationMs / 2).toString(16).padStart(2, '0').toUpperCase()} ]
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Classic Modal Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Electronic Cash Drawer is ready for live POS sales &amp; receipt printing</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleKickEjection('Quick Kick Ejection')}
              disabled={config.lockState === 'locked'}
              className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              ⚡ Eject Drawer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
            >
              Close Window
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
