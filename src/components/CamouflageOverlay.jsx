import { useState, useEffect } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';

export default function CamouflageOverlay({ active }) {
  const [pulseAlert, setPulseAlert] = useState(false);

  useEffect(() => {
    if (active) {
      const interval = setInterval(() => setPulseAlert(p => !p), 800);
      return () => clearInterval(interval);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#0a0f1c]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      {/* Silent alert badge - top right, subtle */}
      <div
        className="absolute top-14 right-3 z-50 flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-opacity duration-500"
        style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          opacity: pulseAlert ? 1 : 0.3,
          color: '#ef4444',
        }}
      >
        <AlertTriangle size={10} />
        <span>SILENT ALERT SENT</span>
      </div>

      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-xs text-white/40">
        <span>9:41</span>
        <span>Canara Bank</span>
        <span>●●●</span>
      </div>

      {/* Fake header */}
      <div className="px-5 py-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-white/40">Good afternoon,</p>
          <p className="font-bold text-lg">Arjun Sharma</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center font-bold text-sm">
          AS
        </div>
      </div>

      <div className="px-4 flex-1 space-y-4">
        {/* Fake balance card - shows ₹0 or very low amount */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-800 to-slate-700 relative overflow-hidden">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Available Balance</p>
          <div className="text-3xl font-bold text-white/80">₹ 847.23</div>
          <div className="mt-3 text-xs text-white/30">Last updated: just now</div>
        </div>

        {/* Fake error message */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 text-yellow-400 text-xs">
            <AlertTriangle size={14} />
            <span>Services temporarily limited. Please try again later.</span>
          </div>
        </div>

        {/* Fake transactions - wrong data to confuse attacker */}
        <div className="space-y-2">
          <h3 className="text-xs text-white/40 uppercase tracking-widest px-1">Recent Transactions</h3>
          {[
            { name: 'Service Charge', amount: -50, time: 'Today' },
            { name: 'ATM Withdrawal', amount: -500, time: 'Yesterday' },
            { name: 'NEFT Credit', amount: 1000, time: '3 days ago' },
          ].map((tx, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">🏦</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white/60">{tx.name}</p>
                <p className="text-xs text-white/30">{tx.time}</p>
              </div>
              <div className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-400/60' : 'text-white/40'}`}>
                {tx.amount > 0 ? '+' : '-'}₹{Math.abs(tx.amount)}
              </div>
            </div>
          ))}
        </div>

        {/* "Technical issue" message */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Shield size={20} className="text-white/20 mx-auto mb-2" />
          <p className="text-xs text-white/30">Transaction services are currently under maintenance.</p>
          <p className="text-xs text-white/20 mt-1">Expected resolution: 2-4 hours</p>
        </div>
      </div>

      {/* Explanation banner at very bottom - only visible in demo mode */}
      <div className="mx-4 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-red-400" />
          <span className="text-xs text-red-400 font-semibold">CAMOUFLAGE ENGINE ACTIVE</span>
        </div>
        <p className="text-xs text-white/40 mt-1">
          Attacker sees fake ₹847 balance. Real account is frozen & protected. 
          Silent duress signal transmitted to fraud ops via stego-encoded API header.
        </p>
      </div>
    </div>
  );
}
