import { NavLink } from 'react-router-dom';
import { VscFiles as Files, VscSearch as Search, VscSettingsGear as Settings } from 'react-icons/vsc';

const linkBase =
  'w-8 h-8 flex items-center justify-center rounded-[4px] text-[color:var(--vs-text-muted)] hover:text-[color:var(--vs-text)]';

const linkActive = 'bg-[color:var(--vs-bg-hover)] text-white';

export default function ActivityBar() {
  return (
    <div className="w-10 shrink-0 h-full flex flex-col justify-between items-center py-1">
      <nav className="flex flex-col items-center gap-1 w-full">
        <NavLink
          to="/"
          end
          title="Explorer"
          className={({ isActive }) => (isActive ? `${linkBase} ${linkActive}` : linkBase)}
        >
          <Files size={20} strokeWidth={1.5} />
        </NavLink>

        <button className={linkBase} title="Search (nao implementado)" disabled>
          <Search size={20} strokeWidth={1.5} />
        </button>
      </nav>

      <nav className="flex flex-col items-center gap-1 w-full pb-1">
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) => (isActive ? `${linkBase} ${linkActive}` : linkBase)}
        >
          <Settings size={20} strokeWidth={1.5} />
        </NavLink>
      </nav>
    </div>
  );
}
