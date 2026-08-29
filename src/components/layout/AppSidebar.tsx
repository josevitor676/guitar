import { Guitar, BookOpen } from 'lucide-react';
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav';
import { useUiStore } from '../../state/ui-store';
import type { TabId } from '../../state/ui-store';

export function AppSidebar() {
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  const selectTab = (tab: TabId) => () => setActiveTab(tab);

  return (
    <SideNav collapsible={true}>
      <SideNavItem
        label="Prática Livre"
        icon={Guitar}
        isSelected={activeTab === 'practice'}
        onClick={selectTab('practice')}
      />
      <SideNavItem
        label="Exercícios"
        icon={BookOpen}
        isSelected={activeTab === 'exercises'}
        onClick={selectTab('exercises')}
      />
    </SideNav>
  );
}
