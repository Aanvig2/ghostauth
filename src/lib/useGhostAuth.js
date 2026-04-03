import { useState, useEffect, useRef, useCallback } from 'react';
import { getTrustLevel, computeAuraHash } from './ghostauth';

const WS_URL = 'wss://ghostauth.onrender.com/ws/user123';

const INITIAL_SCORE = 95;

export function useGhostAuth() {
  const wsRef   = useRef(null);
  const wsReady = useRef(false);

  const [score, setScore]           = useState(INITIAL_SCORE);
  const [trustLevel, setTrustLevel] = useState(getTrustLevel(INITIAL_SCORE));
  const [auraHash, setAuraHash]     = useState('');
  const [vec, setVec]               = useState({});
  const [camouflageActive, setCamouflage] = useState(false);
  const [duressDetected, setDuress]       = useState(false);
  const [alertLog, setAlertLog]           = useState([]);
  const [driftWarning, setDriftWarning]   = useState(false);
  const [trajectoryPoints, setTrajPoints] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [scoreHistory, setScoreHistory] = useState(
    Array.from({ length: 20 }, (_, i) => ({ t: i, score: INITIAL_SCORE }))
  );
  const [osStats, setOsStats] = useState({ battery: 0, memory: 0, inferences: 0 });

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        wsReady.current = true;
        setBackendConnected(true);
        console.log('[GhostAuth] Backend connected');
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const newScore = typeof data.score === 'number' ? data.score : INITIAL_SCORE;
          const level = getTrustLevel(newScore);

          setScore(newScore);
          setTrustLevel(level);
          setCamouflage(newScore < 50);

          if (data.auraHash) setAuraHash(data.auraHash);
          if (data.vec)      setVec(data.vec);
          if (data.drift)    { setDriftWarning(true); setTimeout(() => setDriftWarning(false), 3000); }

          const duress = data.vec
            ? (data.vec.move_variance > 0.8 && data.vec.hesitation_ms > 1200)
            : false;
          setDuress(duress);

          setScoreHistory(prev => [...prev.slice(-49), { t: prev.length, score: newScore }]);

          if (newScore < 70 || duress) {
            setAlertLog(prev => [{
              ts:     new Date().toLocaleTimeString(),
              score:  newScore,
              level:  level.level,
              action: level.action,
              duress,
            }, ...prev.slice(0, 9)]);
          }

          setOsStats(prev => ({
            battery:    parseFloat((prev.battery + 0.003).toFixed(3)),
            memory:     parseFloat((prev.memory + 0.01).toFixed(2)),
            inferences: prev.inferences + 1,
          }));
        } catch (e) {
          console.error('[GhostAuth] parse error', e);
        }
      };

      ws.onclose = () => {
        wsReady.current = false;
        setBackendConnected(false);
        console.log('[GhostAuth] Disconnected — retrying in 2s');
        setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  const recordEvent = useCallback((event) => {
    const e = { ...event, ts: Date.now() };

    if (wsRef.current && wsReady.current) {
      wsRef.current.send(JSON.stringify(e));
    }

    if (e.type === 'move' && e.x !== undefined) {
      setTrajPoints(prev => [...prev, { x: e.x, y: e.y, ts: e.ts }].slice(-50));
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 1500;
      setTrajPoints(prev => prev.filter(p => p.ts > cutoff));
    }, 100);
    return () => clearInterval(t);
  }, []);

  const resetProfile = useCallback(() => {
    setScore(INITIAL_SCORE);
    setTrustLevel(getTrustLevel(INITIAL_SCORE));
    setCamouflage(false);
    setDuress(false);
    setAlertLog([]);
    setTrajPoints([]);
    setDriftWarning(false);
    setAuraHash('');
    setVec({});
    setOsStats({ battery: 0, memory: 0, inferences: 0 });
    setScoreHistory(Array.from({ length: 20 }, (_, i) => ({ t: i, score: INITIAL_SCORE })));
    if (wsRef.current && wsReady.current) {
      wsRef.current.send(JSON.stringify({ type: 'reset' }));
    }
  }, []);


  const simulateAttack = useCallback((type) => {
    if (!wsRef.current || !wsReady.current) return;
    const now = Date.now();
    const burst = [];

    if (type === 'tap_anomaly') {
      for (let i = 0; i < 40; i++)
        burst.push({ type: 'move', x: Math.random() * 400, y: Math.random() * 700, dx: Math.random() * 40 - 20, dy: Math.random() * 40 - 20, ts: now + i * 16 });
    } else if (type === 'tremor_spike') {
      for (let i = 0; i < 60; i++)
        burst.push({ type: 'move', x: 200 + (Math.random() - 0.5) * 80, y: 350 + (Math.random() - 0.5) * 80, dx: (Math.random() - 0.5) * 60, dy: (Math.random() - 0.5) * 60, ts: now + i * 5 });
      for (let i = 0; i < 5; i++)
        burst.push({ type: 'key', code: 'Backspace', is_backspace: true, hold_ms: 30, ts: now + i * 900 });
    } else if (type === 'robot_session') {
      for (let i = 0; i < 40; i++)
        burst.push({ type: 'move', x: i * 9, y: 300, dx: 9, dy: 0, ts: now + i * 50 });
      for (let i = 0; i < 10; i++)
        burst.push({ type: 'click', phase: 'end', x: 200, y: 400, ts: now + i * 100 });
    } else if (type === 'full_takeover') {
      for (let i = 0; i < 60; i++)
        burst.push({ type: 'move', x: Math.random() * 360, y: Math.random() * 700, dx: (Math.random() - 0.5) * 200, dy: (Math.random() - 0.5) * 200, ts: now + i * 8 });
    }

    burst.forEach(e => wsRef.current.send(JSON.stringify(e)));
  }, []);

  return {
    score, trustLevel, auraHash, vec,
    camouflageActive, duressDetected,
    alertLog, scoreHistory, driftWarning,
    trajectoryPoints, backendConnected,
    osStats,
    phase: 'enrolled',
    enrollProgress: 100,
    hasEnrolled: true,
    isRecovering: false,
    recoveryPct: 0,
    federatedLog: [],
    userSegment: 'default',
    setUserSegment: () => {},
    recordEvent, resetProfile, simulateAttack,
    startEnrollment: () => {},
  };
}
