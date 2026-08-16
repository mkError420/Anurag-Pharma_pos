/**
 * Electronic Cash Drawer Service & Hardware Pulse Controller
 * Handles ESC/POS solenoid kick pulses (RJ11/RJ12 Pin 2 / Pin 5),
 * Web Audio sound synthesis for physical drawer ejection feedback,
 * 3-position lock security state, denomination float counts, and audit logs.
 */

// Default Configuration
const DEFAULT_CONFIG = {
  autoEjectOnCashReceipt: true,
  kickPin: 'pin2', // 'pin2' (standard EPSON) or 'pin5' (Star / alternate)
  pulseDurationMs: 100, // 50ms - 250ms
  voltage: '24V', // '12V' or '24V'
  soundFxEnabled: true,
  lockState: 'electronic', // 'locked' | 'electronic' | 'manual_open'
  currencySymbol: '৳',
};

// Default Denominations breakdown (5 Banknotes, 8 Coins)
const DEFAULT_FLOAT = {
  bills: [
    { label: '1000', value: 1000, count: 10 },
    { label: '500', value: 500, count: 20 },
    { label: '200', value: 200, count: 30 },
    { label: '100', value: 100, count: 50 },
    { label: '50', value: 50, count: 40 },
  ],
  coins: [
    { label: '50', value: 50, count: 10 },
    { label: '20', value: 20, count: 25 },
    { label: '10', value: 10, count: 50 },
    { label: '5', value: 5, count: 60 },
    { label: '2', value: 2, count: 50 },
    { label: '1', value: 1, count: 100 },
    { label: '0.50', value: 0.5, count: 40 },
    { label: '0.25', value: 0.25, count: 0 },
  ],
  mediaSlots: {
    chequesCount: 2,
    chequesValue: 12500,
    creditVouchersCount: 5,
    creditVouchersValue: 8400,
  }
};

/**
 * Web Audio API Synthesizer for realistic mechanical solenoid kick & drawer slide sound
 */
export function playDrawerSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;

    // 1. Solenoid high-energy electromagnetic click / trigger
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    // 2. Metallic mechanical spring latch release thud
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(90, now + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(20, now + 0.18);

    gain2.gain.setValueAtTime(0.5, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.18);

    // 3. Smooth roller slide-out noise buffer (white noise filtered)
    const bufferSize = ctx.sampleRate * 0.25; // 250ms glide
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now + 0.05);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now + 0.05);
    whiteNoise.stop(now + 0.3);

    // Close audio context after playback
    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close();
    }, 400);
  } catch {
    // Graceful fallback if AudioContext is blocked by browser policy
  }
}

/**
 * Load persisted drawer configuration
 */
export function getDrawerConfig() {
  try {
    const saved = localStorage.getItem('pos_cash_drawer_config');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error reading cash drawer config', e);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save drawer configuration
 */
export function saveDrawerConfig(config) {
  try {
    localStorage.setItem('pos_cash_drawer_config', JSON.stringify(config));
  } catch (e) {
    console.error('Error saving cash drawer config', e);
  }
}

/**
 * Load persisted Cash Float & Compartment counts
 */
export function getDrawerFloat() {
  try {
    const saved = localStorage.getItem('pos_cash_drawer_float');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading cash drawer float', e);
  }
  return DEFAULT_FLOAT;
}

/**
 * Save Cash Float & Compartment counts
 */
export function saveDrawerFloat(floatData) {
  try {
    localStorage.setItem('pos_cash_drawer_float', JSON.stringify(floatData));
  } catch (e) {
    console.error('Error saving cash drawer float', e);
  }
}

/**
 * Calculate total cash amount currently held in drawer compartments
 */
export function calculateDrawerTotal(floatData) {
  if (!floatData) return 0;
  const billTotal = (floatData.bills || []).reduce((sum, b) => sum + (b.value * (parseInt(b.count, 10) || 0)), 0);
  const coinTotal = (floatData.coins || []).reduce((sum, c) => sum + (c.value * (parseInt(c.count, 10) || 0)), 0);
  return billTotal + coinTotal;
}

/**
 * Load Security Audit Logs for cash drawer events
 */
export function getDrawerLogs() {
  try {
    const saved = localStorage.getItem('pos_cash_drawer_logs');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading cash drawer logs', e);
  }
  return [];
}

/**
 * Record a drawer access/ejection audit log entry
 */
export function logDrawerEvent(entry) {
  try {
    const logs = getDrawerLogs();
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    const newEntry = {
      id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      user: userObj.name || userObj.email || 'Cashier',
      role: userObj.role || 'Staff',
      type: entry.type || 'AUTO_EJECT', // 'AUTO_EJECT' | 'MANUAL_KEY_OVERRIDE' | 'NO_SALE_POP' | 'TEST_PULSE' | 'FLOAT_COUNT'
      reason: entry.reason || 'Cash Receipt Printing',
      saleId: entry.saleId || null,
      amount: entry.amount || null,
      lockState: entry.lockState || 'electronic',
      pin: entry.pin || 'Pin 2 (RJ11)',
      success: entry.success !== false,
      ...entry
    };

    const updatedLogs = [newEntry, ...logs.slice(0, 99)]; // keep latest 100 records
    localStorage.setItem('pos_cash_drawer_logs', JSON.stringify(updatedLogs));
    return newEntry;
  } catch (e) {
    console.error('Error logging drawer event', e);
    return null;
  }
}

/**
 * Clear audit logs
 */
export function clearDrawerLogs() {
  try {
    localStorage.removeItem('pos_cash_drawer_logs');
  } catch (e) {
    console.error('Error clearing drawer logs', e);
  }
}

/**
 * Generate standard ESC/POS Kick Pulse command byte array
 * Command: ESC p m t1 t2 (27 112 m t1 t2)
 * m = 0 for Pin 2, 1 for Pin 5
 * t1 = pulse ON time * 2ms
 * t2 = pulse OFF time * 2ms
 */
export function generateEscPosKickCommand(pin = 'pin2', pulseMs = 100) {
  const m = pin === 'pin5' ? 1 : 0;
  const t1 = Math.min(255, Math.max(1, Math.round(pulseMs / 2)));
  const t2 = Math.min(255, Math.max(1, Math.round(pulseMs / 2)));
  return new Uint8Array([0x1B, 0x70, m, t1, t2]);
}

/**
 * Trigger Electronic Drawer Ejection
 * Dispatches hardware pulse, audio feedback, logs audit event, and notifies UI listeners.
 */
export function triggerDrawerEjection(options = {}) {
  const config = getDrawerConfig();
  const {
    reason = 'Cash Receipt Printing',
    saleId = null,
    amount = null,
    isManualKey = false,
    bypassLock = false,
    method = 'AUTO_EJECT'
  } = options;

  // Check physical lock state
  if (config.lockState === 'locked' && !bypassLock && !isManualKey) {
    console.warn('Cash drawer is physically LOCKED. Electrical ejection rejected.');
    return {
      success: false,
      locked: true,
      message: 'Cash drawer is currently locked with the physical security key. Turn key to Auto/Electric or use Emergency Key Release.'
    };
  }

  // 1. Play realistic mechanical solenoid sound if enabled
  if (config.soundFxEnabled) {
    playDrawerSound();
  }

  // 2. Generate ESC/POS hardware kick signal buffer
  const kickBytes = generateEscPosKickCommand(config.kickPin, config.pulseDurationMs);

  // 3. Log audit event
  const logEntry = logDrawerEvent({
    type: isManualKey ? 'MANUAL_KEY_OVERRIDE' : method,
    reason,
    saleId,
    amount,
    lockState: isManualKey ? 'manual_open' : config.lockState,
    pin: config.kickPin === 'pin5' ? 'Pin 5 (12V/24V)' : 'Pin 2 (Standard RJ11/12)',
    success: true
  });

  // 4. Dispatch Global Window Event for reactive UI components
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('pos-cash-drawer-ejected', {
      detail: {
        timestamp: Date.now(),
        reason,
        saleId,
        amount,
        isManualKey,
        logEntry,
        kickBytes
      }
    });
    window.dispatchEvent(event);
  }

  return {
    success: true,
    locked: false,
    message: isManualKey
      ? 'Emergency manual key release engaged. Drawer ejected!'
      : 'Electronic cash drawer kick pulse sent (RJ11/RJ12). Drawer ejected!',
    logEntry
  };
}
