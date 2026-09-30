import { VscSaveAll as Save } from 'react-icons/vsc';

interface TitleBarMenuModalProps {
  open: boolean;
  onClose: () => void;
  canSave: boolean;
  onSave: () => void;
}

export default function TitleBarMenuModal({ open, onClose, canSave, onSave }: TitleBarMenuModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110]"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onMouseDown={onClose}
    >
      <div
        role="menu"
        aria-label="Menu do editor"
        className="absolute top-9 right-2 w-52 py-1 shadow-2xl text-[13px]"
        style={{ background: 'var(--vs-bg-app)', border: '1px solid var(--vs-border-light)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          onClick={onSave}
          disabled={!canSave}
          className="w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-40"
          style={{ color: 'var(--vs-text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vs-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Save size={14} className="shrink-0" />
          Save
        </button>
      </div>
    </div>
  );
}
