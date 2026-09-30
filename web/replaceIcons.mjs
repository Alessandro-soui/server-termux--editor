import fs from 'fs';
import path from 'path';

const replacements = {
  'ActivityBar.tsx': [
    { from: "import { Files, Search, Settings } from 'lucide-react';", to: "import { VscFiles as Files, VscSearch as Search, VscSettingsGear as Settings } from 'react-icons/vsc';" }
  ],
  'EditorPane.tsx': [
    { from: "import { Code2, FileWarning, FolderOpen } from 'lucide-react';", to: "import { VscCode as Code2, VscWarning as FileWarning, VscFolderOpened as FolderOpen } from 'react-icons/vsc';" }
  ],
  'FileTreeItem.tsx': [
    { from: "import { ChevronRight, ChevronDown } from 'lucide-react';", to: "import { VscChevronRight as ChevronRight, VscChevronDown as ChevronDown } from 'react-icons/vsc';" }
  ],
  'OpenFolderModal.tsx': [
    { from: "import {\n  ChevronRight,\n  ChevronDown,\n  Folder as FolderIcon,\n  FolderOpen as FolderOpenIcon,\n  Home,\n  Loader2,\n  FolderPlus,\n} from 'lucide-react';", to: "import {\n  VscChevronRight as ChevronRight,\n  VscChevronDown as ChevronDown,\n  VscFolder as FolderIcon,\n  VscFolderOpened as FolderOpenIcon,\n  VscHome as Home,\n  VscLoading as Loader2,\n  VscNewFolder as FolderPlus,\n} from 'react-icons/vsc';" }
  ],
  'QuickOpenModal.tsx': [
    { from: "import { FolderSearch, Loader2, Search } from 'lucide-react';", to: "import { VscSearch as FolderSearch, VscLoading as Loader2, VscSearch as Search } from 'react-icons/vsc';" }
  ],
  'Sidebar.tsx': [
    { from: "import { FilePlus, FolderPlus, FolderOpen, KeyRound, RefreshCw, X } from 'lucide-react';", to: "import { VscNewFile as FilePlus, VscNewFolder as FolderPlus, VscFolderOpened as FolderOpen, VscKey as KeyRound, VscRefresh as RefreshCw, VscClose as X } from 'react-icons/vsc';" }
  ],
  'StatusBar.tsx': [
    { from: "import { GitBranch, KeyRound, Wifi, WifiOff } from 'lucide-react';", to: "import { VscSourceControl as GitBranch, VscKey as KeyRound, VscRadioTower as Wifi, VscExclude as WifiOff } from 'react-icons/vsc';" }
  ],
  'TabBar.tsx': [
    { from: "import { X } from 'lucide-react';", to: "import { VscClose as X } from 'react-icons/vsc';" }
  ],
  'TitleBar.tsx': [
    { from: "import { MoreHorizontal, PanelLeft, Save } from 'lucide-react';", to: "import { VscEllipsis as MoreHorizontal, VscLayoutSidebarLeft as PanelLeft, VscSaveAll as Save } from 'react-icons/vsc';" }
  ],
  'TitleBarMenuModal.tsx': [
    { from: "import { Save } from 'lucide-react';", to: "import { VscSaveAll as Save } from 'react-icons/vsc';" }
  ],
  'Settings.tsx': [
    { from: "import { Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';", to: "import { VscEye as Eye, VscEyeClosed as EyeOff, VscKey as KeyRound, VscTrash as Trash2 } from 'react-icons/vsc';" }
  ],
  'iconUtils.tsx': [
    { from: "import { Folder, FolderOpen, File as FileIcon } from 'lucide-react';", to: "import { VscFolder as Folder, VscFolderOpened as FolderOpen, VscFile as FileIcon } from 'react-icons/vsc';" }
  ]
};

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
};

const files = walk('src');
files.forEach((file) => {
  const baseName = path.basename(file);
  if (replacements[baseName]) {
    let content = fs.readFileSync(file, 'utf8');
    replacements[baseName].forEach(rep => {
      content = content.replace(rep.from, rep.to);
    });
    // Replace Lucide-specific classes that might look weird with React Icons
    content = content.replace(/animate-spin/g, 'animate-spin'); // React icons can also spin
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
