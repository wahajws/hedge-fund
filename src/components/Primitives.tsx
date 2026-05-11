import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { RiskLevel } from '../lib/types';

const riskClass: Record<string, string> = {
  normal: 'border-risk-normal text-risk-normal bg-risk-normal/5',
  watch: 'border-risk-watch text-risk-watch bg-risk-watch/5',
  elevated: 'border-risk-elevated text-risk-elevated bg-risk-elevated/5',
  high: 'border-risk-high text-risk-high bg-risk-high/5',
  critical: 'border-risk-critical text-risk-critical bg-risk-critical/5',
  healthy: 'border-risk-normal text-risk-normal bg-risk-normal/5',
  degraded: 'border-risk-elevated text-risk-elevated bg-risk-elevated/5',
  failed: 'border-risk-critical text-risk-critical bg-risk-critical/5',
  running: 'border-risk-watch text-risk-watch bg-risk-watch/5',
  pending: 'border-risk-elevated text-risk-elevated bg-risk-elevated/5'
};

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border border-terminal-line bg-gradient-to-r from-cyan-400/10 to-amber-400/5 p-4 shadow-panel xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Macro Fund AI Operating System</div>
        <h1 className="text-[22px] font-black leading-tight text-slate-100">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`min-w-0 border border-terminal-line bg-terminal-panel shadow-panel ${className}`}
    >
      <div className="flex min-h-10 items-center justify-between border-b border-terminal-line bg-white/[0.015] px-3">
        <h2 className="flex items-center gap-2 text-[13px] font-black text-slate-100">{icon}{title}</h2>
        <div className="h-2 w-2 bg-cyan-300/80" />
      </div>
      <div className="p-3">{children}</div>
    </motion.section>
  );
}

export function MetricTile({ label, value, meta, risk = 'watch' }: { label: string; value: ReactNode; meta?: string; risk?: RiskLevel | string }) {
  return (
    <div className={`border border-terminal-line border-l-4 bg-terminal-panel p-3 ${riskClass[risk] ?? riskClass.watch}`}>
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 font-mono text-2xl font-black text-slate-100">{value}</div>
      {meta ? <div className="mt-2 text-xs text-slate-400">{meta}</div> : null}
    </div>
  );
}

export function Badge({ value, tone = 'watch' }: { value: ReactNode; tone?: RiskLevel | string }) {
  return (
    <span className={`inline-flex h-5 items-center whitespace-nowrap border px-2 text-[10px] font-black uppercase tracking-wide ${riskClass[String(tone).toLowerCase()] ?? riskClass.watch}`}>
      {value}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const key = status.toLowerCase();
  const color = key.includes('healthy') || key.includes('approved') || key.includes('completed')
    ? 'bg-risk-normal'
    : key.includes('running') || key.includes('open')
      ? 'bg-risk-watch animate-pulse'
      : key.includes('critical') || key.includes('failed')
        ? 'bg-risk-critical'
        : 'bg-risk-elevated';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export function Button({ children, onClick, tone = 'primary', disabled = false }: { children: ReactNode; onClick?: () => void; tone?: 'primary' | 'ghost' | 'danger'; disabled?: boolean }) {
  const classes = tone === 'primary'
    ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
    : tone === 'danger'
      ? 'border-red-400/60 bg-red-400/10 text-red-100'
      : 'border-terminal-strong bg-terminal-muted text-slate-300';
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-8 items-center gap-2 border px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      {children}
    </button>
  );
}

export function DenseTable<T>({ columns, rows, renderRow }: { columns: string[]; rows: T[]; renderRow: (row: T, index: number) => ReactNode[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[620px] border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className="sticky top-0 border-b border-terminal-line bg-terminal-muted px-2 py-2 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-cyan-300/[0.035]">
              {renderRow(row, index).map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-terminal-line/70 px-2 py-2 align-middle text-slate-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingBlock({ label = 'Loading institutional data' }: { label?: string }) {
  return (
    <div className="grid gap-2">
      <div className="h-4 w-1/3 animate-pulse bg-slate-700" />
      <div className="h-20 animate-pulse bg-slate-800/80" />
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return <div className="border border-risk-critical bg-risk-critical/10 p-3 text-xs text-red-100">{message}</div>;
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}
