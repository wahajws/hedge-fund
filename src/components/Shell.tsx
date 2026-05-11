import {
  Activity,
  Archive,
  Bot,
  Database,
  FileText,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Radio,
  Presentation,
  Server,
  UserCheck
} from 'lucide-react';
import { ReactNode } from 'react';
import { useCoreData } from '../lib/queries';
import { PageKey, useUiStore } from '../lib/store';
import { useLiveEvents } from '../lib/useLiveEvents';
import { Badge, StatusDot } from './Primitives';

const nav: Array<{ key: PageKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'executive', label: 'Executive Dashboard', icon: LayoutDashboard },
  { key: 'command', label: 'AI Command Center', icon: Bot },
  { key: 'risk', label: 'Portfolio Risk Monitor', icon: Gauge },
  { key: 'workflow', label: 'Multi-Agent Workflow', icon: GitBranch },
  { key: 'approvals', label: 'Approval Queue', icon: UserCheck },
  { key: 'audit', label: 'Audit Trail', icon: Archive },
  { key: 'data', label: 'Data Lake / Integrations', icon: Database },
  { key: 'brief', label: 'CIO Morning Brief', icon: FileText },
  { key: 'health', label: 'System Health', icon: Server },
  { key: 'demo', label: 'Presentation Mode', icon: Presentation }
];

export function Shell({ children }: { children: ReactNode }) {
  const activePage = useUiStore((state) => state.activePage);
  const setActivePage = useUiStore((state) => state.setActivePage);
  const presentationMode = useUiStore((state) => state.presentationMode);
  const { risk, approvals, alerts } = useCoreData();
  const live = useLiveEvents();
  const riskLevel = risk.data?.data.severity ?? 'watch';

  return (
    <div className={`${presentationMode ? 'fixed inset-0 z-50 overflow-auto' : ''} grid min-h-screen grid-cols-[232px_minmax(0,1fr)_390px] grid-rows-[48px_minmax(calc(100vh-80px),auto)_32px] bg-terminal-base text-slate-100 max-[1280px]:grid-cols-[218px_minmax(0,1fr)] max-[760px]:grid-cols-[64px_minmax(0,1fr)]`}>
      <header className="col-span-full row-start-1 flex items-center gap-3 border-b border-terminal-line bg-terminal-shell px-3">
        <div className="flex min-w-[210px] items-center gap-2 text-xs font-black uppercase text-slate-300 max-[760px]:min-w-fit">
          <Radio size={15} className="text-cyan-300" />
          <span>Asia Live</span>
          <span className="text-slate-500">SGT</span>
        </div>
        <div className="flex flex-1 gap-2 overflow-hidden max-[760px]:hidden">
          <Badge value={`Risk: ${riskLevel}`} tone={riskLevel} />
          <Badge value={`Approvals: ${approvals.data?.data.length ?? 0}`} tone="critical" />
          <Badge value={`Alerts: ${alerts.data?.data.length ?? 0}`} tone="elevated" />
          <Badge value={`WS: ${live.status}`} tone={live.status === 'open' ? 'normal' : 'elevated'} />
        </div>
        <div className="flex items-center gap-2 border border-terminal-line bg-terminal-panel px-3 py-2 text-xs text-slate-300">
          <Bot size={14} />
          Qwen Orchestration
        </div>
      </header>

      <aside className="sticky top-12 row-start-2 h-[calc(100vh-80px)] border-r border-terminal-line bg-terminal-shell p-3 max-[760px]:p-2">
        <div className="mb-3 flex items-center gap-3 border-b border-terminal-line px-1 pb-4">
          <div className="grid h-9 w-9 place-items-center border border-terminal-strong bg-cyan-300/10 text-xs font-black text-cyan-200">MF</div>
          <div className="max-[760px]:hidden">
            <div className="text-sm font-black">Macro OS</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Institutional AI</div>
          </div>
        </div>
        <nav className="grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                aria-label={item.label}
                onClick={() => setActivePage(item.key)}
                className={`flex items-center gap-3 border-l-2 px-2 py-2 text-left text-xs text-slate-300 hover:bg-cyan-300/5 hover:text-white max-[760px]:justify-center ${
                  active ? 'border-cyan-300 bg-cyan-300/10 text-white' : 'border-transparent'
                }`}
              >
                <Icon size={16} />
                <span className="max-[760px]:hidden">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="row-start-2 min-w-0 p-4">{children}</main>

      <aside className="sticky top-12 row-start-2 h-[calc(100vh-80px)] overflow-auto border-l border-terminal-line bg-terminal-shell p-3 max-[1280px]:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wide text-cyan-300">Live Context</div>
            <h3 className="text-sm font-black">Workflow & Alert Stream</h3>
          </div>
          <StatusDot status={live.status} />
        </div>
        <div className="grid gap-2">
          {live.events.slice(0, 12).map((event, index) => (
            <div key={`${event.createdAt}-${index}`} className="border border-terminal-line bg-terminal-panel p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-cyan-300">{event.type}</span>
                <span className="font-mono text-[10px] text-slate-500">{new Date(event.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">{JSON.stringify(event.payload).slice(0, 120)}</div>
            </div>
          ))}
        </div>
      </aside>

      <footer className="col-span-full row-start-3 flex items-center gap-6 overflow-hidden whitespace-nowrap border-t border-terminal-line bg-terminal-base px-3 font-mono text-[11px] text-slate-500">
        <span className="text-cyan-300">LIVE</span>
        {live.events.slice(0, 8).map((event, index) => (
          <span key={`${event.type}-${index}`}>
            <b className="text-slate-300">{event.type}</b> {new Date(event.createdAt).toLocaleTimeString()}
          </span>
        ))}
      </footer>
    </div>
  );
}
