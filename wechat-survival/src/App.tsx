import React, { useEffect } from 'react';
import { usePhase1Store } from './stores/phase1Store';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatInterface from './components/ChatInterface';
import QuestPanel from './components/QuestPanel';
import ShelterPanel from './components/ShelterPanel';
import InventoryPanel from './components/InventoryPanel';
import CharacterPanel from './components/CharacterPanel';
import ShelterEditor from './components/ShelterEditor';
import BottomNav from './components/BottomNav';
import NotificationPush from './components/NotificationPush';

export default function App() {
  const { 
    activeTab, 
    decreaseMonsterTimer,
    addMessage,
    addResource
  } = usePhase1Store();
  
  // 游戏主循环
  useEffect(() => {
    const timer = setInterval(() => {
      decreaseMonsterTimer();
      
      // 随机群聊消息
      if (Math.random() > 0.95) {
        const players = ['李四', '王五', '赵六', '废土客 9527'];
        const texts = [
          '刚才在加油站捡到了 3 个瓶盖，爽！',
          '谁有废铁？我拿水换。',
          '求生大楼的防御力够吗？',
          '听说今晚丧尸潮规模很大。'
        ];
        addMessage('group_building', {
          sender: 'player',
          senderName: players[Math.floor(Math.random() * players.length)],
          text: texts[Math.floor(Math.random() * texts.length)]
        });
      }
    }, 2000);
    
    return () => clearInterval(timer);
  }, [decreaseMonsterTimer, addMessage]);
  
  // 渲染主内容区域
  const renderMainContent = () => {
    switch (activeTab) {
      case 'message':
        return <ChatInterface />;
      case 'task':
        return <QuestPanel />;
      case 'inventory':
        return <InventoryPanel />;
      case 'shelter':
        return <ShelterPanel />;
      default:
        return <ChatInterface />;
    }
  };
  
  return (
    <div className="flex h-screen w-full bg-neutral-50 overflow-hidden font-sans text-[14px] select-none">
      {/* 通知推送 */}
      <NotificationPush />
      
      {/* 左侧边栏 */}
      <Sidebar />
      
      {/* 聊天列表 */}
      <ChatList />
      
      {/* 主内容区域 */}
      <div className="flex-grow flex flex-col bg-neutral-50 relative">
        {renderMainContent()}
        
        {/* 模态框 */}
        <CharacterPanel />
        <ShelterEditor />
      </div>
      
      {/* 底部导航栏（移动端优化） */}
      <div className="hidden md:block">
        <BottomNav />
      </div>
    </div>
  );
}
