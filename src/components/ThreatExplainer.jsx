// Plain-English explainer for each threat level and active attack type
const THREAT_EXPLANATIONS = {
  TRUSTED: {
    headline: 'User is verified — session is clean',
    color: 'text-green-400',
    bg: 'bg-green-500/8 border-green-500/20',
    icon: '✅',
    body: 'All 7 behavioral signals match your enrolled profile. DTW trajectory similarity is high. GhostAuth is running in background with no action required.',
    whatItMeans: 'Your tap rhythm, pressure, tremor signature, swipe speed, and navigation pattern all match what was recorded during enrollment.',
  },
  WATCH: {
    headline: 'Minor deviation — silent re-auth triggered',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/8 border-yellow-500/20',
    icon: '👁',
    body: 'One or more signals are slightly outside your normal range. GhostAuth is silently re-authenticating in the background — no user action needed yet.',
    whatItMeans: 'This happens naturally when you\'re tired, distracted, or using the phone differently. CUSUM drift detection prevents a full lockout.',
  },
  SUSPECT: {
    headline: 'Significant mismatch — OTP gate active',
    color: 'text-orange-400',
    bg: 'bg-orange-500/8 border-orange-500/20',
    icon: '🔒',
    body: 'Multiple signals are outside your enrolled profile. Any transaction requires OTP/PIN before proceeding. The user is prompted — an attacker would be blocked here.',
    whatItMeans: 'Score dropped to 50–70. This means the behavioral fingerprint doesn\'t strongly match. Could be a different user, stressed state, or an attack in progress.',
  },
  THREAT: {
    headline: 'High-confidence threat — Camouflage active',
    color: 'text-red-400',
    bg: 'bg-red-500/8 border-red-500/20',
    icon: '👻',
    body: 'Score below 50. GhostAuth has activated the Camouflage Engine: the attacker now sees a fake UI with ₹847 balance and disabled transactions. A silent LSB-steganography alert has been encoded into outgoing API headers and sent to the bank\'s fraud ops team.',
    whatItMeans: 'The behavioral fingerprint is so different from the enrolled profile that GhostAuth is confident this is NOT the legitimate user. Real account is frozen and protected.',
  },
};

const ATTACK_EXPLANATIONS = {
  tap_anomaly: {
    title: 'Tap Anomaly Injected',
    what: 'Random tap positions and velocities were injected — simulating an attacker who doesn\'t know your natural tap spots.',
    signals: ['deltaTap', 'vSwipe'],
    whyScoreDrop: 'Your enrolled profile has consistent tap positions (e.g. you always tap the Send button at the same spot). Random positions break DTW trajectory similarity.',
  },
  tremor_spike: {
    title: 'Tremor + Duress Injected',
    what: 'High-frequency micro-jitter movements + slow hesitation taps were injected — simulating physical duress (robber forcing transaction).',
    signals: ['sigmaTremor', 'deltaTap'],
    whyScoreDrop: 'σ_tremor > 0.6 AND Δt_tap > 0.7 triggers the duress flag. The silent fraud alert is sent even if the score is still above 50.',
  },
  robot_session: {
    title: 'Bot Session Injected',
    what: 'Perfectly straight-line movements at constant velocity were injected — the signature of a scripted bot or automated attack tool.',
    signals: ['curvature', 'avgJerk', 'sigmaTremor'],
    whyScoreDrop: 'Zero curvature and zero tremor are inhuman. DTW similarity against your curved, organic movement profile collapses to near-zero.',
  },
  full_takeover: {
    title: 'Full Takeover Injected',
    what: 'Completely random large jumps were injected — simulating someone frantically navigating an unfamiliar phone.',
    signals: ['vSwipe', 'curvature', 'avgJerk', 'deltaTap'],
    whyScoreDrop: 'All signals deviate simultaneously. The behavioral fingerprint is unrecognizable. Score drops to critical zone immediately.',
  },
};

export default function ThreatExplainer({ trustLevel, lastAttack, isRecovering, recoveryPct, userSegment }) {
  const explanation = THREAT_EXPLANATIONS[trustLevel?.level] || THREAT_EXPLANATIONS.TRUSTED;
  const attackExp = lastAttack ? ATTACK_EXPLANATIONS[lastAttack] : null;

  const isDisabilityProfile = ['motorImpairment','visualImpairment','cognitiveDisability','temporaryImpairment'].includes(userSegment);

  return (
    <div className="space-y-2">
      {/* Disability profile tolerance banner */}
      {isDisabilityProfile && (
        <div className="rounded-xl border border-purple-500/25 bg-purple-500/8 p-3 space-y-1">
          <p className="text-xs font-semibold text-purple-400">♿ Disability profile active — adaptive tolerance ON</p>
          <p className="text-xs text-white/40 leading-relaxed">
            High tremor (σ_tremor), slower swipe velocity, and longer hesitation gaps are part of this user's <strong className="text-white/60">expected</strong> behavioral signature — not anomalies. CUSUM drift window is widened so natural signal variance never triggers a false lockout.
          </p>
        </div>
      )}

      {/* Current trust level explanation */}
      <div className={`rounded-xl border p-3 space-y-2 ${explanation.bg}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{explanation.icon}</span>
          <p className={`text-xs font-semibold ${explanation.color}`}>{explanation.headline}</p>
        </div>
        <p className="text-xs text-white/45 leading-relaxed">{explanation.body}</p>
        <div className="bg-black/20 rounded-lg p-2">
          <p className="text-xs text-white/25">In plain terms:</p>
          <p className="text-xs text-white/50 leading-relaxed mt-0.5">{explanation.whatItMeans}</p>
        </div>
      </div>

      {/* Active attack explanation */}
      {attackExp && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-orange-400">⚡ {attackExp.title}</p>
          <p className="text-xs text-white/45 leading-relaxed">{attackExp.what}</p>
          <div className="bg-black/20 rounded-lg p-2">
            <p className="text-xs text-white/25">Why the score dropped:</p>
            <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{attackExp.whyScoreDrop}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-white/25">Affected signals:</span>
            {attackExp.signals.map(s => (
              <span key={s} className="text-xs font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recovery indicator */}
      {isRecovering && (
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/8 p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-400">🔄 Recovery in progress</p>
          <p className="text-xs text-white/40">
            Move your mouse over the banking app. GhostAuth is collecting fresh legitimate behavioral data to flush the injected attack events from the buffer.
          </p>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${recoveryPct}%`, boxShadow: '0 0 8px #3b82f6' }} />
          </div>
          <p className="text-xs font-mono text-blue-400/60">{Math.round(recoveryPct)}% — keep moving</p>
        </div>
      )}
    </div>
  );
}
