import { AreaChart, Area, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const v = payload[0].value;
    const color = v >= 86 ? '#22c55e' : v >= 71 ? '#eab308' : v >= 51 ? '#f97316' : '#ef4444';
    return (
      <div className="bg-black/80 border border-white/10 rounded px-2 py-1 text-xs font-mono" style={{ color }}>
        {v}
      </div>
    );
  }
  return null;
};

export default function ScoreChart({ data }) {
  const latest = data[data.length - 1]?.score ?? 90;
  const strokeColor = latest >= 86 ? '#22c55e' : latest >= 71 ? '#eab308' : latest >= 51 ? '#f97316' : '#ef4444';

  return (
    <div className="w-full h-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <ReferenceLine y={86} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine y={71} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine y={51} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.3} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
