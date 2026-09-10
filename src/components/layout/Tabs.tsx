interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTabId, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex items-center gap-8 border-b border-edge pb-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTabId}
          onClick={() => onChange(tab.id)}
          className={[
            'flex items-center gap-2 pb-3 text-sm font-semibold transition-all duration-200',
            tab.id === activeTabId
              ? 'border-b-2 border-accent text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {tab.label}
          {typeof tab.badge === 'number' && (
            <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-primary">
              {String(tab.badge).padStart(2, '0')}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
