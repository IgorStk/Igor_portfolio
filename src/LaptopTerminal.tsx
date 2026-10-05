import { useEffect, useRef, useState } from 'react';

export const projectDestinations: Record<string, string> = {
  '1430': 'https://mollire.aulvi.com.br',
  '1431': 'https://github.com/IgorStk/Detector-de-Postura',
};

export function LaptopTerminal({ active, onClose }: { active: boolean; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [toast, setToast] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setCode(''); setToast(false);
    input.current?.blur();
    return () => clearTimeout(timer.current);
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [active, onClose]);
  const validate = (value: string) => {
    const destination = Object.hasOwn(projectDestinations, value) ? projectDestinations[value] : undefined;
    clearTimeout(timer.current);
    if (destination) {
      window.open(destination, '_blank', 'noopener,noreferrer');
      setToast(false);
      setCode('');
    } else {
      setToast(true);
      timer.current = setTimeout(() => setToast(false), 3000);
    }
  };
  return <div className="laptop-terminal" inert={!active}
    onPointerDown={event => {
      event.stopPropagation();
      if (event.target !== input.current) input.current?.blur();
    }}
    onClick={event => event.stopPropagation()}>
    {active && <button type="button" className="terminal-close" aria-label="Voltar à mesa" onClick={event => {
      event.preventDefault();
      event.stopPropagation();
      input.current?.blur();
      onClose();
    }}>×</button>}
    <form onSubmit={event => { event.preventDefault(); validate(code); }}>
      <p id="project-code-label" className="terminal-prompt">digite o código do projeto</p>
      <input ref={input} id="project-code" aria-labelledby="project-code-label" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} value={code} placeholder="0000" aria-invalid={toast} onChange={event => {
        clearTimeout(timer.current);
        setCode(event.target.value);
        setToast(false);
      }} />
    </form>
    {toast && <div className="terminal-toast" role="alert">código inválido</div>}
  </div>;
}
