import React, { useRef, useEffect } from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { ChatMessageItem } from './ChatMessageItem';
import { MoreHorizontal, Smile, Folder, ArrowLeft } from 'lucide-react';

export const ChatInterface: React.FC = () => {
  const { 
    chats, 
    messages, 
    activeChatId, 
    setActiveChat,
    addMessage 
  } = usePhase1Store();
  
  const [inputText, setInputText] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentChat = chats.find(c => c.id === activeChatId);
  const currentMessages = messages[activeChatId] || [];
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, activeChatId]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    addMessage(activeChatId, {
      sender: 'user',
      text: inputText.trim()
    });
    setInputText('');
  };
  
  const getQuickActions = () => {
    if (activeChatId === 'explore') {
      return ['周边拾荒', '深入废墟', '返回基地'];
    } else if (activeChatId === 'shelter') {
      return ['查看物资', '加固防御', '开启发电机'];
    } else if (activeChatId.startsWith('NPC_')) {
      return ['聊天', '交易', '招募'];
    }
    return [];
  };
  
  const handleQuickAction = (action: string) => {
    addMessage(activeChatId, {
      sender: 'user',
      text: action
    });
    
    // 模拟响应
    setTimeout(() => {
      if (activeChatId === 'explore') {
        const scenes = [
          '你来到了一处废弃的超市，货架倾倒，地上散落着过期的罐头。',
          '前方是一片寂静的居民区，偶尔能听到远处丧尸的嘶吼。',
          '你发现了一辆翻倒的运钞车，但车门被焊死了。'
        ];
        const rewards = [
          { text: '获得：食物×2, 水×1', resources: { food: 2, water: 1 } },
          { text: '获得：废铁×3', resources: { scrap: 3 } },
          { text: '什么也没发现。', resources: {} }
        ];
        
        const scene = scenes[Math.floor(Math.random() * scenes.length)];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        
        addMessage('explore', {
          sender: 'system',
          text: `【探索发现】${scene}\n\n${reward.text}`
        });
        
        if (reward.resources) {
          Object.entries(reward.resources).forEach(([key, value]) => {
            usePhase1Store.getState().addResource(key as any, value);
          });
        }
      }
    }, 800);
  };
  
  return (
    <div className="flex-grow flex flex-col bg-neutral-50">
      {/* 聊天头部 */}
      <div className="h-[60px] flex items-center justify-between px-6 border-b border-neutral-300 bg-neutral-50">
        <div className="flex items-center space-x-3">
          <button className="text-neutral-500 hover:text-neutral-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-[18px] text-neutral-900 font-medium">
              {currentChat?.name}
            </span>
            {currentChat?.type === 'group' && (
              <span className="ml-1 text-neutral-500 text-[14px]">
                ({currentChat.memberCount})
              </span>
            )}
          </div>
        </div>
        <button className="text-neutral-500 hover:text-neutral-700">
          <MoreHorizontal size={20} />
        </button>
      </div>
      
      {/* 消息区域 */}
      <div className="flex-grow overflow-y-auto p-4">
        {currentMessages.map((msg) => (
          <ChatMessageItem 
            key={msg.id} 
            message={msg} 
            chatId={activeChatId} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 快捷操作栏 */}
      {getQuickActions().length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-neutral-200">
          <div className="flex flex-wrap gap-2">
            {getQuickActions().map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-1 text-[12px] bg-neutral-100 border border-neutral-300 rounded-md hover:bg-neutral-200 text-neutral-700 transition-colors btn-interaction"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 输入区域 */}
      <div className="h-48 border-t border-neutral-300 bg-neutral-50 flex flex-col">
        <div className="h-10 flex items-center px-4 space-x-4 text-neutral-500 border-b border-neutral-200/50">
          <button className="hover:text-neutral-700">
            <Smile size={20} />
          </button>
          <button className="hover:text-neutral-700">
            <Folder size={20} />
          </button>
          <div className="flex-grow" />
          <span className="text-[12px] text-neutral-400">
            按下 Enter 发送，Shift+Enter 换行
          </span>
        </div>
        
        <form onSubmit={handleSendMessage} className="flex-grow flex flex-col px-4 py-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            className="flex-grow bg-transparent resize-none outline-none text-[15px] text-neutral-800 leading-normal"
            placeholder="输入消息..."
          />
          <div className="flex justify-end items-center space-x-4 mt-2">
            <button
              type="submit"
              className="px-6 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-md transition-colors border border-neutral-300 text-[14px] btn-interaction"
            >
              发送 (S)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
