import { useNavigate } from 'react-router-dom';
import { VscSourceControl as GitBranch, VscKey as KeyRound, VscRadioTower as Wifi, VscExclude as WifiOff } from 'react-icons/vsc';
import { useSettings } from '../context/SettingsContext';
import type { Tab } from '../context/WorkspaceContext';

interface StatusBarProps {
  activeTab?: Tab;
}

export default function StatusBar({ activeTab }: StatusBarProps) {
  const { hasToken } = useSettings();
  const navigate = useNavigate();

  return (
    <div
      className="h-[22px] flex items-center justify-between gap-2 px-2 text-[12px] shrink-0 select-none"
      style={{
        background: 'var(--vs-bg-app)',
        color: 'var(--vs-text)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="hidden sm:flex items-center gap-1">
          <GitBranch size={13} /> home
        </span>
        <button
          onClick={() => navigate('/settings')}
          title={hasToken ? 'Trocar o token desta sessao' : 'Configurar o token em Settings'}
          className="flex items-center gap-1 hover:underline min-w-0"
        >
          {hasToken ? <Wifi size={13} className="shrink-0" /> : <WifiOff size={13} className="shrink-0" />}
          <span className="truncate">
            {hasToken ? 'Token configurado' : 'Sem token — clique para configurar'}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {activeTab && (
          <>
            <span className="hidden sm:inline">{activeTab.content.split('\n').length} linhas</span>
            <span className="hidden md:inline">UTF-8</span>
          </>
        )}
        <span className="hidden lg:flex items-center gap-1">
          <KeyRound size={12} /> sessão
        </span>
        <span>termux-file-api</span>
      </div>
    </div>
  );
}
