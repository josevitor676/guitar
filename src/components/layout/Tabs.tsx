interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTabId, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-2 border-b border-zinc-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTabId}
          onClick={() => onChange(tab.id)}
          className={[
            'px-4 py-2 text-sm font-medium tracking-wide transition-all duration-200',
            tab.id === activeTabId
              ? 'border-b-2 border-amber-400 text-amber-400'
              : 'text-zinc-400 hover:text-zinc-200',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
