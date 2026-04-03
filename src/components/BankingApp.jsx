import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, CreditCard, Home, Send, History, Settings, Eye, EyeOff, RefreshCw } from 'lucide-react';

const TRANSACTIONS = [
  { id: 1, name: 'Amazon Pay', amount: -2499, type: 'debit', time: '2:34 PM', icon: '🛒' },
  { id: 2, name: 'Salary Credit', amount: 75000, type: 'credit', time: 'Yesterday', icon: '💼' },
  { id: 3, name: 'Swiggy', amount: -340, type: 'debit', time: 'Yesterday', icon: '🍔' },
  { id: 4, name: 'UPI - Rahul K', amount: -5000, type: 'debit', time: 'Mon', icon: '📱' },
  { id: 5, name: 'Dividend', amount: 1250, type: 'credit', time: 'Sun', icon: '📈' },
];

export default function BankingApp({ onInteract, camouflageActive, trustLevel, onSendMoney, phase, enrollProgress, trajectoryPoints }) {
  const [activeTab, setActiveTab] = useState('home');
  const [showBalance, setShowBalance] = useState(true);
  const [sendAmount, setSendAmount] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOTP] = useState('');

  const balance = camouflageActive ? 847.23 : 124750.80;
  const maskedBalance = '₹ ••,•••.••';

  const handleTap = (action) => {
    onInteract({ type: 'tap', x: Math.random() * 360, y: Math.random() * 600, action });
  };

  const handleSend = () => {
    if (!sendAmount || !sendTo) return;
    if (parseInt(sendAmount) > 10000) {
      setShowOTP(true);
    } else {
      onSendMoney(sendAmount, sendTo, false);
    }
    handleTap('send_money');
  };

  const handleOTPSubmit = () => {
    onSendMoney(sendAmount, sendTo, true);
    setShowOTP(false);
    setSendAmount('');
    setSendTo('');
  };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#0a0f1c] text-white overflow-hidden select-none"
      style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onInteract({ type: 'move', x: e.clientX - rect.left, y: e.clientY - rect.top, dx: e.movementX, dy: e.movementY });
      }}
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onInteract({ type: 'click', phase: 'start', x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseUp={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onInteract({ type: 'click', phase: 'end', x: e.clientX - rect.left, y: e.clientY - rect.top });
        handleTap('generic');
      }}
      onKeyDown={(e) => {
        onInteract({ type: 'key', code: e.code, is_backspace: e.code === 'Backspace', hold_ms: 0 });
      }}
    >
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-xs text-white/40">
        <span>9:41</span>
        <span>Canara Bank</span>
        <span>●●●</span>
      </div>

      {/* Header */}
      <div className="px-5 py-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-white/40">Good afternoon,</p>
          <p className="font-bold text-lg">Arjun Sharma</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center font-bold text-sm">
          AS
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">

        {/* Balance card */}
        <div
          className={`rounded-2xl p-5 relative overflow-hidden cursor-pointer transition-all duration-500 ${
            camouflageActive
              ? 'bg-gradient-to-br from-slate-800 to-slate-700'
              : 'bg-gradient-to-br from-[#1a237e] to-[#0d47a1]'
          }`}
          onClick={() => handleTap('balance_card')}
        >
          {!camouflageActive && (
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/20 -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 -ml-8 -mb-8" />
            </div>
          )}
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs text-white/60 uppercase tracking-widest">
              {camouflageActive ? 'Available Balance' : 'Total Balance'}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); handleTap('toggle_balance'); }}>
              {showBalance ? <Eye size={16} className="text-white/50" /> : <EyeOff size={16} className="text-white/50" />}
            </button>
          </div>
          <div className="text-3xl font-bold tracking-tight my-2">
            {showBalance
              ? `₹ ${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : maskedBalance}
          </div>
          {camouflageActive && (
            <div className="text-xs text-white/30 mt-1">⚠ Limited services active</div>
          )}
          <div className="flex gap-3 mt-4">
            <div className="text-xs text-white/50">A/C: •••• 4821</div>
            <div className="text-xs text-white/50">|</div>
            <div className="text-xs text-white/50">IFSC: CNRB0001234</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Send, label: 'Send', tab: 'send' },
            { icon: ArrowDownLeft, label: 'Receive', tab: 'home' },
            { icon: CreditCard, label: 'Pay Bills', tab: 'home' },
            { icon: RefreshCw, label: 'History', tab: 'history' },
          ].map(({ icon: Icon, label, tab }) => (
            <button
              key={label}
              onClick={(e) => { e.stopPropagation(); setActiveTab(tab); handleTap(label.toLowerCase()); }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
              <Icon size={18} className="text-blue-400" />
              <span className="text-xs text-white/60">{label}</span>
            </button>
          ))}
        </div>

        {/* Send Money Panel */}
        {activeTab === 'send' && !showOTP && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-sm text-white/80">Send Money via UPI</h3>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:bg-white/8 transition-all"
              placeholder="UPI ID or Mobile Number"
              value={sendTo}
              onChange={e => { setSendTo(e.target.value); handleTap('type'); }}
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-sm">₹</span>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all"
                placeholder="Amount"
                value={sendAmount}
                onChange={e => { setSendAmount(e.target.value); handleTap('type'); }}
              />
            </div>
            {parseInt(sendAmount) > 10000 && (
              <p className="text-xs text-yellow-400/80 flex items-center gap-1">
                <span>⚠</span> Transactions above ₹10,000 require re-authentication
              </p>
            )}
            <button
              onClick={handleSend}
              disabled={camouflageActive}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                camouflageActive
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-98 text-white'
              }`}
            >
              {camouflageActive ? 'Service Unavailable' : 'Send Money'}
            </button>
          </div>
        )}

        {/* OTP Panel */}
        {showOTP && (
          <div className="bg-white/5 border border-yellow-500/30 rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🔒</span>
              <h3 className="font-semibold text-sm text-yellow-400">GhostAuth: Re-authentication Required</h3>
            </div>
            <p className="text-xs text-white/50">High-value transaction (₹{parseInt(sendAmount).toLocaleString('en-IN')}) requires OTP verification</p>
            <p className="text-xs text-white/40">OTP sent to •••••• 4821</p>
            <div className="flex gap-2">
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  maxLength={1}
                  className="w-10 h-12 bg-white/5 border border-white/20 rounded-lg text-center text-white font-mono text-lg focus:outline-none focus:border-yellow-500"
                  value={otp[i] || ''}
                  onChange={e => { setOTP(otp.slice(0, i) + e.target.value + otp.slice(i + 1)); handleTap('otp_type'); }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleOTPSubmit} className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 transition-all">
                Verify & Send
              </button>
              <button onClick={() => setShowOTP(false)} className="px-4 py-3 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transactions */}
        {activeTab !== 'send' && (
          <div>
            <h3 className="text-xs text-white/40 uppercase tracking-widest mb-3 px-1">Recent Transactions</h3>
            <div className="space-y-2">
              {TRANSACTIONS.map(tx => (
                <div
                  key={tx.id}
                  onClick={(e) => { e.stopPropagation(); handleTap('transaction_' + tx.id); }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 cursor-pointer transition-all active:scale-98"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
                    {tx.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.name}</p>
                    <p className="text-xs text-white/40">{tx.time}</p>
                  </div>
                  <div className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-green-400' : 'text-white/70'}`}>
                    {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mouse trajectory trail */}
      {trajectoryPoints && trajectoryPoints.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none z-40" style={{ width: '100%', height: '100%' }}>
          {trajectoryPoints.map((pt, i) => {
            if (i === 0) return null;
            const prev = trajectoryPoints[i - 1];
            const age = (Date.now() - pt.ts) / 1500;
            const opacity = Math.max(0, 1 - age);
            const color = phase === 'enrolling' ? '#22c55e' : trustLevel?.color || '#3b82f6';
            return (
              <line key={i}
                x1={prev.x} y1={prev.y} x2={pt.x} y2={pt.y}
                stroke={color} strokeWidth={2.5} strokeOpacity={opacity * 0.8}
                strokeLinecap="round"
              />
            );
          })}
          {/* Cursor dot */}
          {trajectoryPoints.length > 0 && (() => {
            const last = trajectoryPoints[trajectoryPoints.length - 1];
            const color = phase === 'enrolling' ? '#22c55e' : trustLevel?.color || '#3b82f6';
            return (
              <circle cx={last.x} cy={last.y} r={5} fill={color} fillOpacity={0.9}>
                <animate attributeName="r" values="4;7;4" dur="1s" repeatCount="indefinite" />
              </circle>
            );
          })()}
        </svg>
      )}

      {/* Enrollment overlay */}
      {phase === 'enrolling' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1b2e] border border-green-500/40 rounded-2xl p-6 mx-6 text-center space-y-4">
            <div className="text-3xl">🧠</div>
            <h2 className="text-white font-bold text-base">Learning Your Behavior</h2>
            <p className="text-white/50 text-xs leading-relaxed">
              Move your mouse naturally over the app. GhostAuth is recording your unique movement fingerprint.
            </p>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-100"
                style={{ width: `${enrollProgress}%`, boxShadow: '0 0 8px #22c55e' }}
              />
            </div>
            <p className="text-green-400 text-xs font-mono">{Math.round(enrollProgress)}% enrolled</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-[#0a0f1c]/90 backdrop-blur border-t border-white/10 flex px-4 py-3">
        {[
          { icon: Home, label: 'Home', tab: 'home' },
          { icon: Send, label: 'Pay', tab: 'send' },
          { icon: History, label: 'History', tab: 'history' },
          { icon: Settings, label: 'Profile', tab: 'profile' },
        ].map(({ icon: Icon, label, tab }) => (
          <button
            key={tab}
            onClick={(e) => { e.stopPropagation(); setActiveTab(tab); handleTap('nav_' + tab); }}
            className={`flex-1 flex flex-col items-center gap-1 transition-all ${
              activeTab === tab ? 'text-blue-400' : 'text-white/30'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
