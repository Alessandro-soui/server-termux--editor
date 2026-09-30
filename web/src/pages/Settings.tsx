import { useState, type FormEvent } from 'react';
import { VscEye as Eye, VscEyeClosed as EyeOff, VscKey as KeyRound, VscTrash as Trash2 } from 'react-icons/vsc';
import { api, getErrorMessage } from '../api/client';
import { useSettings } from '../context/SettingsContext';

export default function Settings() {
  const { setToken, clearToken, hasToken } = useSettings();

  const [tokenInput, setTokenInput] = useState('');
  const [revealToken, setRevealToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // Um unico botao salva o token digitado e testa a conexao.
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    flashSaved();

    const value = tokenInput.trim();
    if (!value) return;

    setToken(value);
    setTokenInput('');

    setTesting(true);
    try {
      await api.listFolder('/');
      setMessage('Token salvo e conexao testada com sucesso.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const handleForgetToken = () => {
    if (!confirm('Esquecer o token desta sessao?')) return;
    clearToken();
    setMessage('Token esquecido.');
    setError(null);
  };

  return (
    <div
      className="flex-1 min-w-0 overflow-y-auto vs-scroll rounded-[5px] p-6 sm:p-8"
      style={{ background: 'var(--vs-bg-app)', border: '1px solid var(--vs-border-group)' }}
    >
      <div className="max-w-lg">
        <h1 className="text-[20px] font-semibold mb-1">Settings</h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--vs-text-muted)' }}>
          Configure a conexao com a termux-file-api.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-[13px]">
            <span style={{ color: 'var(--vs-text-muted)' }}>Token da API (x-api-token)</span>

            <div
              className="flex items-center"
              style={{ background: 'var(--vs-bg-app)', border: '1px solid var(--vs-border-light)' }}
            >
              <input
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setError(null);
                  setMessage(null);
                }}
                type={revealToken ? 'text' : 'password'}
                placeholder={hasToken ? 'Token desta sessao (digite para trocar)' : 'API_TOKEN'}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-[13px] text-[color:var(--vs-text)] outline-none"
              />
              <button
                type="button"
                onClick={() => setRevealToken((v) => !v)}
                title={revealToken ? 'Ocultar' : 'Mostrar'}
                className="px-2 py-1.5"
                style={{ color: 'var(--vs-text-muted)' }}
              >
                {revealToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className="flex items-center gap-2 text-[12px] min-w-0"
                style={{ color: hasToken ? 'var(--vs-success)' : 'var(--vs-danger)' }}
              >
                <KeyRound size={13} className="shrink-0" />
                <span className="truncate">
                  {hasToken ? 'Token configurado nesta sessao' : 'Nenhum token nesta sessao'}
                </span>
              </span>

              {hasToken && (
                <button
                  type="button"
                  onClick={handleForgetToken}
                  title="Esquecer o token desta sessao"
                  className="flex items-center gap-1 px-2 py-1.5 text-[12px] shrink-0"
                  style={{ color: 'var(--vs-text-muted)' }}
                >
                  <Trash2 size={13} /> Esquecer
                </button>
              )}
            </div>

            <span className="text-[11px]" style={{ color: 'var(--vs-text-dim)' }}>
              Fica so em sessionStorage (some ao fechar a aba). Nunca vem de .env. Sem token, o
              botao Abrir pasta leva para esta tela.
            </span>
          </div>

          {error && (
            <div
              className="px-2 py-1.5 text-[12px]"
              style={{ color: 'var(--vs-danger)', background: 'rgba(241, 76, 76, 0.12)' }}
            >
              {error}
            </div>
          )}

          {message && !error && (
            <div className="px-2 py-1.5 text-[12px]" style={{ color: 'var(--vs-success)' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={testing}
            className="self-start px-3 py-1.5 text-[13px] disabled:opacity-60"
            style={{ background: 'var(--vs-accent)', color: '#fff' }}
          >
            {testing ? 'Salvando e testando...' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  );
}
