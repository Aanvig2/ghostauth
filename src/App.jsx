import { useState } from 'react';
import { useGhostAuth } from './lib/useGhostAuth';
import BankingApp from './components/BankingApp';
import GhostAuthDashboard from './components/GhostAuthDashboard';
import CamouflageOverlay from './components/CamouflageOverlay';
import { Shield, X, ChevronRight } from 'lucide-react';

function Toast({ message, type, onClose }) {
  if (!message) return null;
  const colors = {
    success: 'bg-green-500/20 border-green-500/40 text-green-400',
    warning: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    danger:  'bg-red-500/20 border-red-500/40 text-red-400',
  };
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium max-w-sm backdrop-blur-xl ${colors[type]}`}>
      <span>{message}</span>
      <button onClick={onClose}><X size={14}/></button>
    </div>
  );
}

const POPULATIONS = [
  {
    group: 'Standard',
    options: [
      { id: 'general',    icon: '👤', label: 'General',     desc: 'Average adult user — balanced thresholds across all signals.' },
      { id: 'young',      icon: '🧑', label: 'Young Adult', desc: 'Fast taps, fluid swipes, low hesitation. Higher speed tolerance.' },
      { id: 'middle',     icon: '🧔', label: 'Middle Aged', desc: 'Moderate pace and pressure. Standard CUSUM window.' },
      { id: 'senior',     icon: '👴', label: 'Senior',      desc: 'Slower navigation, higher natural hesitation. Wider tolerance.' },
    ],
  },
  {
    group: 'Disability Profiles',
    groupIcon: '♿',
    note: 'Adaptive CUSUM tolerance — natural tremor and hesitation treated as expected, not anomalous.',
    options: [
      { id: 'motor',      icon: '🤝', label: 'Motor Impairment',  desc: "Parkinson's, cerebral palsy, stroke recovery — high tremor, slower taps." },
      { id: 'visual',     icon: '👁',  label: 'Visual Impairment', desc: 'Screen reader or magnification users — deliberate taps, longer inter-tap gaps.' },
      { id: 'cognitive',  icon: '🧠', label: 'Cognitive',         desc: 'Consistent but slower pace, non-standard navigation patterns.' },
      { id: 'temporary',  icon: '🩹', label: 'Temporary',         desc: 'Broken arm, post-surgery, or non-dominant hand — asymmetric pressure and higher jerk.' },
    ],
  },
];

function PopulationModal({ onSelect }) {
  const [selected, setSelected] = useState('general');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d1525] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield size={18} className="text-white"/>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">GhostAuth</h2>
              <p className="text-white/40 text-xs">Behavioral Biometrics · Canara Bank</p>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-3 leading-relaxed">
            Select your user profile so GhostAuth can apply the right behavioral baseline and tolerance thresholds.
          </p>
        </div>

        {/* Options */}
        <div className="p-4 space-y-5">
          {POPULATIONS.map(({ group, groupIcon, note, options }) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2">
                {groupIcon && <span className="text-sm">{groupIcon}</span>}
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">{group}</p>
              </div>
              {note && (
                <p className="text-xs text-purple-400/60 bg-purple-500/8 border border-purple-500/15 rounded-lg px-3 py-2 mb-2 leading-relaxed">
                  {note}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {options.map(({ id, icon, label, desc }) => {
                  const isDisability = group === 'Disability Profiles';
                  const active = selected === id;
                  return (
                    <button key={id} onClick={() => setSelected(id)}
                      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${
                        active
                          ? isDisability
                            ? 'bg-purple-500/20 border-purple-500/40'
                            : 'bg-blue-500/20 border-blue-500/40'
                          : 'bg-white/3 border-white/8 hover:bg-white/6'
                      }`}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xl">{icon}</span>
                        {active && (
                          <span className={`text-xs font-bold ${isDisability ? 'text-purple-400' : 'text-blue-400'}`}>✓</span>
                        )}
                      </div>
                      <p className={`text-xs font-semibold ${active ? (isDisability ? 'text-purple-300' : 'text-blue-300') : 'text-white/70'}`}>
                        {label}
                      </p>
                      <p className="text-xs text-white/30 leading-tight">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Confirm */}
        <div className="p-4 pt-2 border-t border-white/8">
          <button onClick={() => onSelect(selected)}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
            Continue as {POPULATIONS.flatMap(p => p.options).find(o => o.id === selected)?.label}
            <ChevronRight size={16}/>
          </button>
          <p className="text-center text-xs text-white/20 mt-2">You can change this anytime by resetting the session</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const ghost = useGhostAuth();
  const [toast, setToast] = useState(null);
  const [population, setPopulation] = useState(null); // null = show modal

  const showToast = (msg, type = 'warning') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSendMoney = (amount, to, verified) => {
    if (ghost.camouflageActive) {
      showToast('Transaction silently blocked — attacker sees fake success', 'danger');
      return;
    }
    if (verified || parseInt(amount) <= 10000) {
      showToast(`Sent ₹${parseInt(amount).toLocaleString('en-IN')} to ${to || 'recipient'}`, 'success');
    }
  };

  const backendColor = ghost.backendConnected ? '#22c55e' : '#f97316';
  const backendLabel = ghost.backendConnected ? 'LSTM ●' : 'Backend offline ○';

  const selectedPop = population
    ? POPULATIONS.flatMap(p => p.options).find(o => o.id === population)
    : null;

  const handleReset = () => {
    ghost.resetProfile();
    setPopulation(null);
  };

  return (
    <div className="min-h-screen bg-[#080c16] flex flex-col" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>

      {/* Population selector modal */}
      {!population && <PopulationModal onSelect={setPopulation} />}

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/20 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield size={16} className="text-white"/>
          </div>
          <div>
            <span className="text-white font-bold text-sm">GhostAuth</span>
            <span className="text-white/30 text-xs ml-2">× Canara Bank · Behavioral LSTM · L0–L6</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedPop && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-white/50">
              <span>{selectedPop.icon}</span>
              <span>{selectedPop.label}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
            style={{ background: `${backendColor}18`, border: `1px solid ${backendColor}40`, color: backendColor }}>
            {backendLabel}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
            style={{ background: `${ghost.trustLevel.color}18`, border: `1px solid ${ghost.trustLevel.color}40`, color: ghost.trustLevel.color }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ghost.trustLevel.color }}/>
            Score: {ghost.score}
          </div>
        </div>
      </div>

      {/* Main layout: phone | left dash | right dash */}
      <div className="flex-1 flex flex-row gap-3 p-4 min-h-0 overflow-hidden">

        {/* Phone */}
        <div className="flex-shrink-0">
          <div className="relative" style={{ width: 340 }}>
            <div className="relative rounded-[44px] overflow-hidden shadow-2xl"
              style={{
                width: 340, height: 720,
                background: '#1a1a2e',
                border: '8px solid #1e2235',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.1)',
              }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-[#1a1a2e] rounded-b-2xl z-50"/>
              <BankingApp
                onInteract={ghost.recordEvent}
                camouflageActive={ghost.camouflageActive}
                trustLevel={ghost.trustLevel}
                onSendMoney={handleSendMoney}
                phase={ghost.phase}
                enrollProgress={ghost.enrollProgress}
                trajectoryPoints={ghost.trajectoryPoints}
              />
              <CamouflageOverlay active={ghost.camouflageActive}/>
              <div className="absolute top-10 left-3 z-50 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${ghost.trustLevel.color}40`, color: ghost.trustLevel.color }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ghost.trustLevel.color }}/>
                <span className="font-mono font-bold">{ghost.score}</span>
                <span className="opacity-60">{ghost.trustLevel.threshold}</span>
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-full"/>
          </div>
        </div>

        {/* Left dashboard column — L0 to L2 */}
        <div className="flex-shrink-0 w-100 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          <GhostAuthDashboard
            score={ghost.score}
            vec={ghost.vec}
            trustLevel={ghost.trustLevel}
            auraHash={ghost.auraHash}
            alertLog={ghost.alertLog}
            scoreHistory={ghost.scoreHistory}
            driftWarning={ghost.driftWarning}
            simulateAttack={ghost.simulateAttack}
            resetProfile={handleReset}
            phase={ghost.phase}
            enrollProgress={ghost.enrollProgress}
            hasEnrolled={ghost.hasEnrolled}
            startEnrollment={ghost.startEnrollment}
            duressDetected={ghost.duressDetected}
            federatedLog={ghost.federatedLog}
            osStats={ghost.osStats}
            isRecovering={ghost.isRecovering}
            recoveryPct={ghost.recoveryPct}
            userSegment={ghost.userSegment}
            setUserSegment={ghost.setUserSegment}
            panel="left"
          />
        </div>

        {/* Right dashboard column — L3 onwards */}
        <div className="flex-1 min-w-0 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          <GhostAuthDashboard
            score={ghost.score}
            vec={ghost.vec}
            trustLevel={ghost.trustLevel}
            auraHash={ghost.auraHash}
            alertLog={ghost.alertLog}
            scoreHistory={ghost.scoreHistory}
            driftWarning={ghost.driftWarning}
            simulateAttack={ghost.simulateAttack}
            resetProfile={handleReset}
            phase={ghost.phase}
            enrollProgress={ghost.enrollProgress}
            hasEnrolled={ghost.hasEnrolled}
            startEnrollment={ghost.startEnrollment}
            duressDetected={ghost.duressDetected}
            federatedLog={ghost.federatedLog}
            osStats={ghost.osStats}
            isRecovering={ghost.isRecovering}
            recoveryPct={ghost.recoveryPct}
            userSegment={ghost.userSegment}
            setUserSegment={ghost.setUserSegment}
            panel="right"
          />
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <div className="text-center py-2 text-xs text-white/12 border-t border-white/5">
        Team Laxman Rekha · Canara Bank Hackathon · GhostAuth v2.0 · LSTM · DPDP Compliant
      </div>
    </div>
  );
}
