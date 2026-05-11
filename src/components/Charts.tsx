import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { RiskSnapshot } from '../lib/types';

const tooltip = {
  background: '#07131d',
  border: '1px solid #244050',
  color: '#d8e7ee',
  borderRadius: 4,
  fontSize: 12
};

export function RiskAreaChart({ score }: { score: number }) {
  const data = [42, 47, 58, 64, score].map((risk, index) => ({ t: `${index * 2 + 6}:00`, risk }));
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="riskFillPhase6" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f3342" vertical={false} />
          <XAxis dataKey="t" stroke="#789" fontSize={11} />
          <YAxis stroke="#789" fontSize={11} />
          <Tooltip contentStyle={tooltip} />
          <Area type="monotone" dataKey="risk" stroke="#f97316" fill="url(#riskFillPhase6)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ContributionChart({ risk }: { risk: RiskSnapshot }) {
  const data = risk.positionContributions.map((row) => ({ name: row.symbol, value: row.pressureContribution }));
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="#1f3342" vertical={false} />
          <XAxis dataKey="name" stroke="#789" fontSize={11} />
          <YAxis stroke="#789" fontSize={11} />
          <Tooltip contentStyle={tooltip} />
          <Bar dataKey="value">
            {data.map((row) => <Cell key={row.name} fill={row.value < -10 ? '#ef4444' : row.value < 0 ? '#f97316' : '#22c55e'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LatencyLine({ data }: { data: Array<{ service: string; latencyMs: number }> }) {
  const chart = data.map((row, index) => ({ t: index + 1, latency: row.latencyMs }));
  return (
    <div className="h-52">
      <ResponsiveContainer>
        <LineChart data={chart}>
          <CartesianGrid stroke="#1f3342" vertical={false} />
          <XAxis dataKey="t" stroke="#789" fontSize={11} />
          <YAxis stroke="#789" fontSize={11} />
          <Tooltip contentStyle={tooltip} />
          <Line dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
