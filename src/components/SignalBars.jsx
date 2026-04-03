import { Clock, Fingerprint, Activity, TrendingUp, Navigation, Zap, Waves, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const SIGNAL_META = {
  deltaTap: {
    label: 'Δt_tap',
    icon: Clock,
    desc: 'Inter-tap hesitation',
    explain: 'Time gap between consecutive taps. You have a natural rhythm — hesitate too long and it signals uncertainty or a different person.',
    normalRange: [0.1, 0.5],
    attackHigh: 'Duress / attacker fumbling',
    attackLow: 'Bot — zero hesitation',
    unit: 'normalized',
    invertedRisk: true, 
  },
  pAvgTouch: {
    label: 'P_avg_touch',
    icon: Fingerprint,
    desc: 'Touch pressure',
    explain: 'How hard you press. Everyone has a consistent pressure fingerprint — too soft or too heavy is anomalous.',
    normalRange: [0.4, 0.8],
    attackHigh: 'Angry/stressed user or attacker',
    attackLow: 'Hover tap / bot',
    unit: 'normalized',
  },
  sigmaTremor: {
    label: 'σ_tremor',
    icon: Activity,
    desc: 'Micro-tremor variance',
    explain: 'Standard deviation of tiny hand movements — your personal "wobble signature". Very low = robot. Very high = physical duress or medical tremor.',
    normalRange: [0.05, 0.25],
    attackHigh: 'Physical duress / extreme stress → triggers silent alert',
    attackLow: 'Bot / scripted attack — perfectly still cursor',
    unit: 'σ',
    invertedRisk: true,
  },
  vSwipe: {
    label: 'v_swipe',
    icon: TrendingUp,
    desc: 'Swipe velocity',
    explain: 'How fast you move across the screen. Your natural speed is consistent. A bot moves at constant speed; a nervous attacker either rushes or moves very slowly.',
    normalRange: [0.3, 0.75],
    attackHigh: 'Rushed / impatient attacker',
    attackLow: 'Slow bot / unfamiliar user',
    unit: 'normalized',
  },
  navOrder: {
    label: 'nav_order',
    icon: Navigation,
    desc: 'Screen navigation sequence',
    explain: 'The order in which you visit screens. You always go Home → Pay → Confirm. An attacker jumps straight to Pay, skipping your normal browsing pattern.',
    normalRange: [0.2, 0.6],
    attackHigh: 'Deep session by attacker scanning',
    attackLow: 'Direct attack — skipped normal navigation',
    unit: 'depth',
  },
  avgJerk: {
    label: 'Jerk',
    icon: Zap,
    desc: 'Acceleration change rate',
    explain: 'Rate of change of acceleration — your phone\'s gyroscope analog. Humans have smooth, continuous jerk profiles. Bots have sharp, discontinuous ones.',
    normalRange: [0.1, 0.4],
    attackHigh: 'Erratic / scripted movement',
    attackLow: 'Robot smoothness — too consistent',
    unit: 'normalized',
    invertedRisk: true,
  },
  curvature: {
    label: 'Curvature',
    icon: Waves,
    desc: 'Path curvature',
    explain: 'How much your movement curves. Humans naturally curve their gestures. Perfectly straight paths = bot. Wildly erratic paths = anomalous.',
    normalRange: [0.15, 0.45],
    attackHigh: 'Chaotic / disoriented movement',
    attackLow: 'Straight-line bot attack',
    unit: 'radians',
  },
};

function getRiskLevel(key, value) {
  const meta = SIGNAL_META[key];
  if (!meta) return 'neutral';
  const [low, high] = meta.normalRange;
  if (value >= low && value <= high) return 'normal';
  if (value > high) return meta.invertedRisk ? 'danger' : 'warn';
  return 'warn';
}

const RISK_COLORS = {
  normal:  { bar: '#22c55e', text: 'text-green-400',  bg: 'bg-green-500/8',  border: 'border-green-500/20',  icon: CheckCircle },
  warn:    { bar: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/20', icon: AlertTriangle },
  danger:  { bar: '#ef4444', text: 'text-red-400',    bg: 'bg-red-500/8',    border: 'border-red-500/20',    icon: XCircle },
  neutral: { bar: '#3b82f6', text: 'text-blue-400',   bg: 'bg-blue-500/8',   border: 'border-blue-500/20',   icon: CheckCircle },
};

function SignalRow({ sigKey, value, expanded, onToggle }) {
  const meta  = SIGNAL_META[sigKey];
  if (!meta) return null;
  const Icon  = meta.icon;
  const pct   = Math.min((value || 0) * 100, 100);
  const risk  = getRiskLevel(sigKey, value || 0);
  const c     = RISK_COLORS[risk];
  const RiskIcon = c.icon;
  const [lo, hi] = meta.normalRange;

  return (
    <div className={`rounded-xl border transition-all duration-200 ${expanded ? c.bg + ' ' + c.border : 'bg-white/3 border-white/8'}`}>
      {/* Row header — always visible */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-2.5 text-left">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg} border ${c.border}`}>
          <Icon size={12} className={c.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-mono font-semibold ${c.text}`}>{meta.label}</span>
            <div className="flex items-center gap-1.5">
              <RiskIcon size={11} className={c.text} />
              <span className="text-xs text-white/35">{pct.toFixed(0)}%</span>
            </div>
          </div>
          {/* Bar with normal range indicator */}
          <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-visible">
            {/* Normal range band */}
            <div className="absolute h-full rounded-full bg-white/10"
              style={{ left: `${lo*100}%`, width: `${(hi-lo)*100}%` }} />
            {/* Value bar */}
            <div className="absolute h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: c.bar, boxShadow: `0 0 5px ${c.bar}88` }} />
          </div>
        </div>
      </button>

      {/* Expanded explanation */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-white/50 leading-relaxed">{meta.explain}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/20 rounded-lg p-2">
              <p className="text-white/30 mb-0.5">Normal range</p>
              <p className="font-mono text-green-400">{lo}–{hi}</p>
              <p className="text-white/25 text-xs">Your enrolled baseline</p>
            </div>
            <div className="bg-black/20 rounded-lg p-2">
              <p className="text-white/30 mb-0.5">Current value</p>
              <p className={`font-mono ${c.text}`}>{(value||0).toFixed(3)}</p>
              <p className={`text-xs ${risk === 'normal' ? 'text-green-400/60' : 'text-red-400/60'}`}>
                {risk === 'normal' ? '✓ Within profile' : '⚠ Outside profile'}
              </p>
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 space-y-1 text-xs">
            <p className="text-white/30">What anomalies mean:</p>
            <p className="text-orange-300/70">↑ High: {meta.attackHigh}</p>
            <p className="text-yellow-300/70">↓ Low: {meta.attackLow}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignalBars({ vec }) {
  const [expanded, setExpanded] = useState(null);
  const signals = ['deltaTap','pAvgTouch','sigmaTremor','vSwipe','navOrder','avgJerk','curvature'];

  const anomalies = signals.filter(k => getRiskLevel(k, vec?.[k]||0) !== 'normal').length;

  return (
    <div className="space-y-1.5">
      {/* Summary line */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-white/30">V = [Δt, P, σ, v, nav] + kinematics</span>
        {anomalies > 0
          ? <span className="text-xs text-orange-400 font-medium">{anomalies} signal{anomalies>1?'s':''} anomalous</span>
          : <span className="text-xs text-green-400">All signals normal</span>
        }
      </div>
      {signals.map(k => (
        <SignalRow key={k} sigKey={k} value={vec?.[k]} expanded={expanded===k} onToggle={() => setExpanded(p => p===k ? null : k)} />
      ))}
      <p className="text-xs text-white/20 mt-2 text-center">Tap any signal to see what it means</p>
    </div>
  );
}

import { useState } from 'react';
