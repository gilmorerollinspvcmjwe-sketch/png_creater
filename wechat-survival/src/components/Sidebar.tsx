import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { MessageSquare, Users, Folder, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = usePhase1Store();
  
  return (
    <div className="w-[60px] bg-neutral-800 flex flex-col items-center py-4 space-y-6 flex-shrink-0">
      {/* 用户头像 */}
      <div className="w-10 h-10 rounded-md bg-neutral-400 overflow-hidden mb-4 cursor-pointer hover:opacity-80 transition-opacity">
        <img 
          src="https://picsum.photos/seed/user/50/50" 
          alt="User" 
          className="w-full h-full object-cover" 
        />
      </div>
      
      {/* 消息按钮 */}
      <button 
        onClick={() => setActiveTab('message')}
        className={`transition-colors clickable-interaction ${
          activeTab === 'message' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <MessageSquare 
          size={24} 
          fill={activeTab === 'message' ? 'currentColor' : 'none'} 
        />
      </button>
      
      {/* 联系人按钮 */}
      <button 
        onClick={() => setActiveTab('task')}
        className={`transition-colors clickable-interaction ${
          activeTab === 'task' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Users 
          size={24} 
          fill={activeTab === 'task' ? 'currentColor' : 'none'} 
        />
      </button>
      
      {/* 收藏夹（占位） */}
      <button className="text-neutral-400 hover:text-neutral-200 transition-colors clickable-interaction">
        <Folder size={24} />
      </button>
      
      {/* 占位 */}
      <div className="flex-grow" />
      
      {/* 设置按钮 */}
      <button className="text-neutral-400 hover:text-neutral-200 transition-colors clickable-interaction">
        <Settings size={24} />
      </button>
    </div>
  );
};

export default Sidebar;
