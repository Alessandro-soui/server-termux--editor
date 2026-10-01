import TabBar from './TabBar';
import EditorPane from './EditorPane';
import TerminalPanel from './TerminalPanel';

// O "grupo de editors" do VS Code: a tab strip e a area de edicao formam um
// unico card com borda e cantos arredondados. O espacamento ao redor vem do
// frame em Layout.tsx.
export default function EditorGroup() {
  return (
    <div
      className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-[5px]"
      style={{
        background: 'var(--vs-bg-editor)',
        border: '1px solid var(--vs-border-group)',
      }}
    >
      <TabBar />
      <EditorPane />
      <TerminalPanel />
    </div>
  );
}
