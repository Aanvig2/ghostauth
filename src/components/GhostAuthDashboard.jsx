import { useState } from 'react';
import { Shield, AlertTriangle, Activity, Cpu, Lock, Zap, RefreshCw, ChevronDown, ChevronUp, Globe, Battery } from 'lucide-react';
import TrustScoreRing from './TrustScoreRing';
import SignalBars from './SignalBars';
import ScoreChart from './ScoreChart';
import ThreatExplainer from './ThreatExplainer';

const LEVEL_CONFIG = {
  TRUSTED: { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  icon: Shield },
  WATCH:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: Activity },
  SUSPECT: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: AlertTriangle },
  THREAT:  { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    icon: AlertTriangle },
};

const ATTACKS = [
  { id: 'tap_anomaly',   label: 'Tap Anomaly',   desc: 'Abnormal position/velocity', icon: '👆', sev: 'medium' },
  { id: 'tremor_spike',  label: 'Tremor+Duress', desc: 'High σ_tremor + hesitation', icon: '📳', sev: 'high' },
  { id: 'robot_session', label: 'Bot Session',   desc: 'Zero-variance straight line', icon: '🤖', sev: 'high' },
  { id: 'full_takeover', label: 'Full Takeover', desc: 'Complete behavioral mismatch', icon: '💀', sev: 'critical' },
];

function ActionBadge({ level }) {
  const map = {
    TRUSTED: { label: '✓ Allow session — proceed normally',       color: 'text-green-400',  bg: 'bg-green-500/8  border-green-500/20'  },
    WATCH:   { label: '⟳ Silent re-auth in background',          color: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/20' },
    SUSPECT: { label: '🔒 OTP / PIN required before transaction', color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/20' },
    THREAT:  { label: '👻 Camouflage + silent fraud alert',       color: 'text-red-400',    bg: 'bg-red-500/8    border-red-500/20'    },
  };
  const c = map[level] || map.TRUSTED;
  return <div className={`text-xs px-2 py-1 rounded-lg border font-medium ${c.color} ${c.bg}`}>{c.label}</div>;
}

function LeftPanel({ score, vec, trustLevel, auraHash, scoreHistory, driftWarning, duressDetected, resetProfile }) {
  const cfg = LEVEL_CONFIG[trustLevel?.level] || LEVEL_CONFIG.TRUSTED;
  const LvlIcon = cfg.icon;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Shield size={13} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white">GhostAuth Monitor</h1>
            <p className="text-xs text-white/30" style={{fontSize:'10px'}}>L0–L6 · LSTM · Canara Bank</p>
          </div>
        </div>
        <button onClick={resetProfile}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/40 hover:bg-white/10 transition-all">
          <RefreshCw size={10} /> Reset
        </button>
      </div>

      {/* Trust score ring + level */}
      <div className={`rounded-2xl border p-3 ${cfg.bg} ${cfg.border} flex items-center gap-3`}>
        <TrustScoreRing score={score} level={trustLevel} />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className={`flex items-center gap-1.5 ${cfg.text}`}>
            <LvlIcon size={13} />
            <span className="font-bold text-xs">{trustLevel?.level}</span>
            <span className="text-xs opacity-60">{trustLevel?.threshold}</span>
          </div>
          <ActionBadge level={trustLevel?.level} />
          {duressDetected && (
            <div className="text-xs text-red-400 flex items-center gap-1 animate-pulse">
              <AlertTriangle size={10}/> Duress detected
            </div>
          )}
          {driftWarning && (
            <div className="text-xs text-yellow-400/80 flex items-center gap-1">
              <Activity size={10}/> CUSUM drift
            </div>
          )}
        </div>
      </div>

      {/* Score chart */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/35 uppercase tracking-widest">Score History</span>
        </div>
        <div className="flex gap-2 mb-2 flex-wrap">
          {[['#22c55e','>85'],['#eab308','70'],['#f97316','50'],['#ef4444','<50']].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:c}}/>
              <span className="text-white/25" style={{fontSize:'10px'}}>{l}</span>
            </div>
          ))}
        </div>
        <ScoreChart data={scoreHistory} />
      </div>

      {/* Behavioral vector */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-3">
        <span className="text-xs text-white/35 uppercase tracking-widest">L1 · Behavioral Vector</span>
        <div className="mt-3"><SignalBars vec={vec} /></div>
      </div>

      {/* Aura hash */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={11} className="text-blue-400" />
          <span className="text-xs text-white/35 uppercase tracking-widest">L2 · Aura Hash</span>
        </div>
        <p className="font-mono text-blue-400/70 break-all leading-relaxed" style={{fontSize:'10px'}}>{auraHash || '—'}</p>
        <p className="text-white/20 mt-1 font-mono" style={{fontSize:'9px'}}>SHA-256(V ∥ salt) · AES-256-GCM</p>
      </div>
    </div>
  );
}

function RightPanel({
  score, vec, trustLevel, alertLog, driftWarning, duressDetected,
  simulateAttack, federatedLog, osStats, isRecovering, recoveryPct, userSegment,
}) {
  const [showTech, setShowTech] = useState(false);
  const [showFed,  setShowFed]  = useState(false);
  const [showOS,   setShowOS]   = useState(false);
  const [lastAttack, setLastAttack] = useState(null);

  return (
    <div className="flex flex-col gap-3">

      {/* L3 Trust engine status */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-3">
        <span className="text-xs text-white/35 uppercase tracking-widest">L3 · Trust Score Engine</span>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[
            { label: 'Score',    val: score,                     color: score > 85 ? 'text-green-400' : score > 70 ? 'text-yellow-400' : score > 50 ? 'text-orange-400' : 'text-red-400' },
            { label: 'CUSUM',    val: driftWarning ? 'DRIFT' : 'OK', color: driftWarning ? 'text-yellow-400' : 'text-green-400' },
            { label: 'Duress',   val: duressDetected ? 'YES' : 'NO',  color: duressDetected ? 'text-red-400' : 'text-green-400' },
            { label: 'Segment',  val: userSegment || 'default',  color: 'text-blue-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-black/20 rounded-lg p-2 text-center">
              <p className="text-white/30 mb-1" style={{fontSize:'9px'}}>{label}</p>
              <p className={`font-mono font-bold text-xs ${color} truncate`}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* L4 Attack simulator */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={12} className="text-orange-400" />
          <span className="text-xs text-white/35 uppercase tracking-widest">L4 · Attack Simulator</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ATTACKS.map(({ id, label, desc, icon, sev }) => (
            <button key={id} onClick={() => { simulateAttack(id); setLastAttack(id); }}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all active:scale-95 hover:opacity-90 ${
                sev === 'critical' ? 'bg-red-500/10 border-red-500/25' :
                sev === 'high'     ? 'bg-orange-500/10 border-orange-500/25' :
                                     'bg-white/5 border-white/10'
              }`}>
              <div className="text-base">{icon}</div>
              <div className="text-xs font-semibold text-white/80">{label}</div>
              <div className="text-xs text-white/30 leading-tight">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* L5 Threat explainer */}
      <ThreatExplainer
        trustLevel={trustLevel}
        lastAttack={lastAttack}
        isRecovering={isRecovering}
        recoveryPct={recoveryPct}
        userSegment={userSegment}
      />

      {/* Alert log */}
      {alertLog.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-xs text-white/35 uppercase tracking-widest">Alert Log</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {alertLog.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-white/25 font-mono">{a.ts}</span>
                <span className={`font-semibold ${a.level==='THREAT'?'text-red-400':'text-orange-400'}`}>{a.level}</span>
                <span className="text-white/35 font-mono">score:{a.score}</span>
                {a.duress && <span className="text-red-400 text-xs">⚠</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* L5c Federated learning */}
      <button onClick={() => setShowFed(p=>!p)}
        className="flex items-center justify-between w-full p-3 bg-white/3 border border-white/8 rounded-xl text-xs text-white/35 hover:text-white/55 hover:bg-white/5 transition-all">
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-purple-400" />
          <span className="uppercase tracking-widest">L5c · Federated Learning</span>
        </div>
        {showFed ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
      </button>
      {showFed && (
        <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-3 space-y-2 text-xs">
          <p className="text-purple-300/60">Gradient updates only — no raw biometric data leaves device</p>
          {federatedLog.length === 0
            ? <p className="text-white/25">No updates yet</p>
            : federatedLog.map((f, i) => (
              <div key={i} className="border border-white/5 rounded-lg p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-purple-400">{f.msg}</span>
                  <span className="text-white/25 font-mono">{f.ts}</span>
                </div>
                <p className="font-mono text-white/30 break-all" style={{fontSize:'10px'}}>{f.grad}</p>
              </div>
            ))
          }
        </div>
      )}

      {/* OS stats */}
      <button onClick={() => setShowOS(p=>!p)}
        className="flex items-center justify-between w-full p-3 bg-white/3 border border-white/8 rounded-xl text-xs text-white/35 hover:text-white/55 hover:bg-white/5 transition-all">
        <div className="flex items-center gap-2">
          <Battery size={12} className="text-green-400" />
          <span className="uppercase tracking-widest">OS Layer · Resource Monitor</span>
        </div>
        {showOS ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
      </button>
      {showOS && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
          {[
            ['Thread',     'IDLE-class',                                   'text-green-400'],
            ['WakeLock',   '500ms tx window',                              'text-green-400'],
            ['Battery',    `${osStats.battery?.toFixed(3) || '0.000'}%`,   'text-yellow-400'],
            ['Memory',     `${osStats.memory?.toFixed(2)  || '0.00'} MB`,  'text-blue-400'],
            ['Inferences', `${osStats.inferences || 0} runs`,              'text-white/50'],
            ['Last run',   `${osStats.lastMs || 0}ms`,                     'text-white/50'],
          ].map(([label, val, color]) => (
            <div key={label} className="space-y-0.5">
              <p className="text-white/25" style={{fontSize:'10px'}}>{label}</p>
              <p className={`font-mono font-medium text-xs ${color}`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Full architecture */}
      <button onClick={() => setShowTech(p=>!p)}
        className="flex items-center justify-between w-full p-3 bg-white/3 border border-white/8 rounded-xl text-xs text-white/35 hover:text-white/55 hover:bg-white/5 transition-all">
        <div className="flex items-center gap-2">
          <Cpu size={12}/>
          <span className="uppercase tracking-widest">Full Architecture (L0–L6)</span>
        </div>
        {showTech ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
      </button>
      {showTech && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-2 text-xs">
          {[
            ['L0', 'Ring buffer · CAS ops · 512 events · 60Hz',           'text-purple-400'],
            ['L1', 'V=[Δt_tap, P_avg_touch, σ_tremor, v_swipe, nav]',     'text-blue-400'],
            ['L2', 'LSTM scoring · AuraHash=SHA-256(V‖salt) · HMAC TPM',  'text-cyan-400'],
            ['L3', 'Trust 0–100 · CUSUM drift · adaptive threshold',       'text-green-400'],
            ['L4', '>85 allow · 70–85 silent · 50–70 OTP · <50 camo',     'text-yellow-400'],
            ['L5a','Shadow DOM camouflage · fake balance UI',              'text-orange-400'],
            ['L5b','LSB stego · σ_tremor+Δt_tap = duress flag',           'text-red-400'],
            ['L5c','Federated learning · gradient only · diff privacy',    'text-purple-300'],
            ['L6', 'No PII · AES-256-GCM · GDPR + DPDP Act',             'text-white/35'],
          ].map(([layer, desc, color]) => (
            <div key={layer} className="flex gap-2">
              <span className={`font-mono font-bold flex-shrink-0 ${color}`}>{layer}</span>
              <span className="text-white/30">{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GhostAuthDashboard(props) {
  if (props.panel === 'left') {
    return (
      <LeftPanel
        score={props.score}
        vec={props.vec}
        trustLevel={props.trustLevel}
        auraHash={props.auraHash}
        scoreHistory={props.scoreHistory}
        driftWarning={props.driftWarning}
        duressDetected={props.duressDetected}
        resetProfile={props.resetProfile}
      />
    );
  }
  return (
    <RightPanel
      score={props.score}
      vec={props.vec}
      trustLevel={props.trustLevel}
      alertLog={props.alertLog}
      driftWarning={props.driftWarning}
      duressDetected={props.duressDetected}
      simulateAttack={props.simulateAttack}
      federatedLog={props.federatedLog}
      osStats={props.osStats}
      isRecovering={props.isRecovering}
      recoveryPct={props.recoveryPct}
      userSegment={props.userSegment}
    />
  );
}
