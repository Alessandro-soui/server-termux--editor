import { VscFolder, VscFolderOpened, VscFile } from 'react-icons/vsc';
import { validIcons } from './validIcons';

const getFileIconName = (filename: string) => {
  const lower = filename.toLowerCase();
  
  if (lower === 'package.json') return 'nodejs';
  if (lower === 'vite.config.ts' || lower === 'vite.config.js') return 'vite';
  if (lower === 'tsconfig.json' || lower === 'jsconfig.json') return 'tsconfig';
  if (lower === 'readme.md') return 'readme';
  
  const ext = lower.split('.').pop();
  
  switch (ext) {
    case 'js': case 'cjs': case 'mjs': return 'javascript';
    case 'ts': return 'typescript';
    case 'jsx': return 'react';
    case 'tsx': return 'react_ts';
    case 'json': return 'json';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'md': return 'markdown';
    case 'py': return 'python';
    case 'svg': return 'svg';
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz': return 'zip';
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': return 'image';
    case 'pdf': return 'pdf';
    default: return ext; // tenta a própria extensão
  }
};

export function getFileIcon(filename: string, size: number = 15) {
  const iconName = getFileIconName(filename);
  
  if (iconName && validIcons.has(iconName)) {
    return (
      <img 
        src={`/icons/${iconName}.svg`}
        width={size}
        height={size}
        className="shrink-0"
        alt="icon"
        style={{ display: 'inline-block' }}
      />
    );
  }

  // Fallback imediato (sem fazer request)
  return <VscFile size={size} className="shrink-0" style={{ color: 'var(--vs-file-icon)' }} />;
}

export function getFolderIcon(foldername: string, isExpanded: boolean, size: number = 15) {
  const state = isExpanded ? '-open' : '';
  const specificName = `folder-${foldername.toLowerCase()}${state}`;
  const defaultName = `folder${state}`;

  if (validIcons.has(specificName)) {
    return (
      <img 
        src={`/icons/${specificName}.svg`}
        width={size}
        height={size}
        className="shrink-0"
        alt="folder-icon"
        style={{ display: 'inline-block' }}
      />
    );
  }

  if (validIcons.has(defaultName)) {
    return (
      <img 
        src={`/icons/${defaultName}.svg`}
        width={size}
        height={size}
        className="shrink-0"
        alt="folder-icon"
        style={{ display: 'inline-block' }}
      />
    );
  }

  // Fallback imediato (sem fazer request e sem logar 404 no express)
  return isExpanded 
    ? <VscFolderOpened size={size} className="shrink-0" style={{ color: 'var(--vs-folder-icon)' }} />
    : <VscFolder size={size} className="shrink-0" style={{ color: 'var(--vs-folder-icon)' }} />;
}
