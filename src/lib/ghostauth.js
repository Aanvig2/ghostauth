
export class RingBuffer {
  constructor(size = 512) {
    this.size = size;
    this.buffer = new Array(size).fill(null);
    this.head = 0; this.tail = 0; this.count = 0;
  }
  write(event) {
    this.buffer[this.head % this.size] = { ...event, ts: Date.now() };
    this.head++;
    if (this.count < this.size) this.count++;
    else this.tail++;
  }
  readBatch() {
    const out = [];
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[(this.tail + i) % this.size];
      if (item) out.push(item);
    }
    return out;
  }
  clear() { this.head = 0; this.tail = 0; this.count = 0; }
}

export function extractBehavioralVector(events) {
  const taps    = events.filter(e => e.type === 'tap' || e.type === 'click');
  const moves   = events.filter(e => e.type === 'move' && e.x !== undefined);
  const navs    = events.filter(e => e.type === 'nav');

  let deltaTap = 0;
  if (taps.length > 1) {
    const gaps = [];
    for (let i = 1; i < taps.length; i++) gaps.push((taps[i].ts || 0) - (taps[i-1].ts || 0));
    deltaTap = clamp(mean(gaps) / 1000, 0, 1); // normalize to 0-1 (0=fast, 1=slow/hesitant)
  }

  const pressures = taps.map(e => e.pressure || (0.4 + Math.random() * 0.3));
  const pAvgTouch = clamp(mean(pressures), 0, 1);

  const microDeltas = moves.map(e => Math.sqrt((e.dx || 0) ** 2 + (e.dy || 0) ** 2));
  const sigmaTremor = clamp(stddev(microDeltas) / 15, 0, 1);

  const velocities = [];
  for (let i = 1; i < moves.length; i++) {
    const dt = Math.max((moves[i].ts || 0) - (moves[i-1].ts || 0), 1);
    const dx = (moves[i].x || 0) - (moves[i-1].x || 0);
    const dy = (moves[i].y || 0) - (moves[i-1].y || 0);
    velocities.push(Math.sqrt(dx*dx + dy*dy) / dt);
  }
  const vSwipe = clamp(mean(velocities) / 2, 0, 1);

  const navOrder = clamp(navs.length / 10, 0, 1);

  const trajectory = buildTrajectory(moves);

  const accels = [];
  for (let i = 1; i < velocities.length; i++) accels.push(Math.abs(velocities[i] - velocities[i-1]));
  const avgJerk = clamp(mean(accels) / 0.5, 0, 1);

  const angles = trajectory.map(p => p.angle);
  const curvature = clamp(stddev(angles) / Math.PI, 0, 1);

  return {
    deltaTap,
    pAvgTouch,
    sigmaTremor,
    vSwipe,
    navOrder,
    avgJerk,
    curvature,
    trajectory,
    tapCount: taps.length,
    moveCount: moves.length,
  };
}

function buildTrajectory(moves) {
  const traj = [];
  for (let i = 1; i < moves.length; i++) {
    const prev = moves[i-1], curr = moves[i];
    const dt = Math.max((curr.ts||0) - (prev.ts||0), 1);
    const dx = (curr.x||0) - (prev.x||0);
    const dy = (curr.y||0) - (prev.y||0);
    const dist = Math.sqrt(dx*dx + dy*dy);
    traj.push({ velocity: dist/dt, angle: Math.atan2(dy, dx), dx, dy });
  }
  return traj;
}

export async function computeAuraHash(vec, salt = 'ghostauth-canara-2025') {
  const V = [vec.deltaTap, vec.pAvgTouch, vec.sigmaTremor, vec.vSwipe, vec.navOrder];
  const payload = JSON.stringify(V) + '||' + salt;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function dtwSimilarity(seqA, seqB) {
  if (!seqA?.length || !seqB?.length) return 0.5;
  const n = Math.min(seqA.length, 25), m = Math.min(seqB.length, 25);
  const a = seqA.slice(0, n), b = seqB.slice(0, m);
  const dtw = Array.from({ length: n+1 }, () => new Array(m+1).fill(Infinity));
  dtw[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.sqrt((a[i-1].velocity - b[j-1].velocity)**2 + (a[i-1].angle - b[j-1].angle)**2);
      dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
    }
  }
  return Math.exp(-dtw[n][m] / Math.max(n, m) * 0.5);
}

export function vectorSimilarity(vecA, vecB) {
  const keys = ['deltaTap','pAvgTouch','sigmaTremor','vSwipe','navOrder','avgJerk','curvature'];
  let dot=0, normA=0, normB=0;
  for (const k of keys) {
    dot  += (vecA[k]||0) * (vecB[k]||0);
    normA += (vecA[k]||0)**2;
    normB += (vecB[k]||0)**2;
  }
  if (!normA || !normB) return 0.5;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}


export class CUSUMDetector {
  constructor(k = 0.5, h = 5) {
    this.k = k; this.h = h;
    this.S_pos = 0; this.S_neg = 0; this.history = [];
  }
  update(score) {
    this.history.push(score);
    const avg = mean(this.history.slice(-20));
    this.S_pos = Math.max(0, this.S_pos + score - avg - this.k);
    this.S_neg = Math.max(0, this.S_neg - score + avg - this.k);
    return { drift: this.S_pos > this.h || this.S_neg > this.h, S_pos: this.S_pos, S_neg: this.S_neg };
  }
  reset() { this.S_pos = 0; this.S_neg = 0; this.history = []; }
}


export const GLOBAL_POPULATION_BASELINE = {
  youngAdult:  { deltaTap: 0.25, pAvgTouch: 0.60, sigmaTremor: 0.10, vSwipe: 0.65, navOrder: 0.45, avgJerk: 0.20, curvature: 0.22 },
  middleAged:  { deltaTap: 0.40, pAvgTouch: 0.65, sigmaTremor: 0.15, vSwipe: 0.45, navOrder: 0.35, avgJerk: 0.18, curvature: 0.28 },
  senior:      { deltaTap: 0.65, pAvgTouch: 0.70, sigmaTremor: 0.30, vSwipe: 0.28, navOrder: 0.25, avgJerk: 0.25, curvature: 0.35 },
  default:     { deltaTap: 0.35, pAvgTouch: 0.63, sigmaTremor: 0.12, vSwipe: 0.55, navOrder: 0.40, avgJerk: 0.19, curvature: 0.25 },


  motorImpairment: {
    deltaTap: 0.72, pAvgTouch: 0.68, sigmaTremor: 0.55,
    vSwipe: 0.22, navOrder: 0.20, avgJerk: 0.48, curvature: 0.50,
  },


  visualImpairment: {
    deltaTap: 0.78, pAvgTouch: 0.72, sigmaTremor: 0.18,
    vSwipe: 0.18, navOrder: 0.30, avgJerk: 0.15, curvature: 0.20,
  },

  cognitiveDisability: {
    deltaTap: 0.68, pAvgTouch: 0.75, sigmaTremor: 0.12,
    vSwipe: 0.25, navOrder: 0.15, avgJerk: 0.12, curvature: 0.18,
  },

  temporaryImpairment: {
    deltaTap: 0.50, pAvgTouch: 0.58, sigmaTremor: 0.28,
    vSwipe: 0.35, navOrder: 0.30, avgJerk: 0.38, curvature: 0.42,
  },
};


export const SEGMENT_CUSUM_CONFIG = {
  default:             { k: 0.5, h: 5  },
  youngAdult:          { k: 0.5, h: 5  },
  middleAged:          { k: 0.5, h: 6  },
  senior:              { k: 0.6, h: 8  },
  motorImpairment:     { k: 0.8, h: 12 },
  visualImpairment:    { k: 0.7, h: 10 },
  cognitiveDisability: { k: 0.6, h: 10 },
  temporaryImpairment: { k: 0.7, h: 9  },
};


export function calculateTrustScore(vec, enrolledProfile, cusum, hasEnrolled, userSegment = 'default') {
  const populationBaseline = GLOBAL_POPULATION_BASELINE[userSegment] || GLOBAL_POPULATION_BASELINE.default;

  const cusumCfg = SEGMENT_CUSUM_CONFIG[userSegment] || SEGMENT_CUSUM_CONFIG.default;
  cusum.k = cusumCfg.k;
  cusum.h = cusumCfg.h;

  let personalScore, populationScore;

  if (hasEnrolled) {
    const dtwScore    = vec.trajectory?.length > 3 && enrolledProfile?.trajectory?.length > 3
      ? dtwSimilarity(vec.trajectory, enrolledProfile.trajectory) : 0.75;
    const cosScore    = vectorSimilarity(vec, enrolledProfile);
    personalScore     = 0.6 * dtwScore + 0.4 * cosScore;
  } else {
    personalScore = vectorSimilarity(vec, populationBaseline);
  }

  populationScore = vectorSimilarity(vec, populationBaseline);

  const blended = hasEnrolled
    ? 0.85 * personalScore + 0.15 * populationScore
    : 0.50 * personalScore + 0.50 * populationScore;

  const raw = Math.round(clamp(blended, 0, 1) * 100);

  const { drift } = cusum.update(raw);
  const driftPenalty = drift ? 6 : 0;

  return clamp(raw - driftPenalty, 0, 100);
}

export function getTrustLevel(score) {
  if (score > 85)  return { level: 'TRUSTED',  color: '#22c55e', action: 'allow_session',   label: 'Trusted',       threshold: '>85' };
  if (score >= 70) return { level: 'WATCH',    color: '#eab308', action: 'silent_reauth',   label: 'Silent Re-auth', threshold: '70-85' };
  if (score >= 50) return { level: 'SUSPECT',  color: '#f97316', action: 'otp_pin',         label: 'OTP / PIN',     threshold: '50-70' };
  return             { level: 'THREAT',  color: '#ef4444', action: 'camouflage_alert', label: 'THREAT',        threshold: '<50' };
}


export function shouldCamouflage(score) { return score < 50; }

export function encodeDuressSignal(hexStr, duressCode) {
  const bytes = hexStr.split('').map(c => c.charCodeAt(0));
  for (let i = 0; i < 3; i++) bytes[i] = (bytes[i] & 0xFE) | ((duressCode >> i) & 1);
  return bytes.map(b => String.fromCharCode(b)).join('');
}

export function detectDuress(vec) {
  return vec.sigmaTremor > 0.6 && vec.deltaTap > 0.7;
}

export function simulateFederatedGradient(localVec, globalBaseline) {
  const gradient = {};
  const keys = ['deltaTap','pAvgTouch','sigmaTremor','vSwipe','navOrder'];
  for (const k of keys) {
    gradient[k] = ((localVec[k]||0) - (globalBaseline[k]||0)) * 0.01; // learning rate 0.01
  }
  return gradient;
}

export const OS_CONSTRAINTS = {
  threadPriority: 'IDLE',        
  wakeLockWindow: 500,           
  batteryBudget: 0.01,           
  memoryBudget: 20 * 1024 * 1024, // <20 MB
  inferenceInterval: 800,        
};

export function mean(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
export function stddev(arr) {
  if (!arr.length) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x=>(x-m)**2)));
}
export function clamp(v,min,max) { return Math.min(Math.max(v,min),max); }

export const DEFAULT_ENROLLED_PROFILE = {
  deltaTap: 0.35, pAvgTouch: 0.63, sigmaTremor: 0.12,
  vSwipe: 0.55, navOrder: 0.40, avgJerk: 0.19, curvature: 0.25,
  trajectory: [],
};
