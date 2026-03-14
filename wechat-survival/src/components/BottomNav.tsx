import React from 'react';
import { MessageSquare, List, ShoppingCart, Home } from 'lucide-react';
import { usePhase1Store } from '../stores/phase1Store';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = usePhase1Store();
  
  const tabs = [
    { id: 'message' as const, label: '消息', icon: MessageSquare },
    { id: 'task' as const, label: '任务', icon: List },
    { id: 'inventory' as const, label: '背包', icon: ShoppingCart },
    { id: 'shelter' as const, label: '避难所', icon: Home }
  ] as const;
  
  return (
    <div className="h-14 bg-white border-t border-neutral-200 flex items-center justify-around flex-shrink-0">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors btn-interaction ${
              isActive ? 'text-primary' : 'text-neutral-500'
            }`}
          >
            <Icon size={22} fill={isActive ? 'currentColor' : 'none'} />
            <span className="text-[10px] mt-1">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
