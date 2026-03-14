import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import type { ChatMessage } from '../types/phase1';

interface ChatMessageProps {
  message: ChatMessage;
  chatId: string;
}

export const ChatMessageItem: React.FC<ChatMessageProps> = ({ message, chatId }) => {
  const { addMessage } = usePhase1Store();
  
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isNpc = message.sender === 'npc';
  
  const handleAction = (action: string) => {
    addMessage(chatId, {
      sender: 'user',
      text: action
    });
    
    // 根据动作类型触发不同逻辑
    if (chatId === 'explore') {
      handleExploreAction(action);
    } else if (chatId === 'quest' && action === '接受任务') {
      handleQuestAction(action);
    }
  };
  
  const handleExploreAction = (action: string) => {
    setTimeout(() => {
      const scenes = [
        '你来到了一处废弃的超市，货架倾倒，地上散落着过期的罐头。',
        '前方是一片寂静的居民区，偶尔能听到远处丧尸的嘶吼。',
        '你发现了一辆翻倒的运钞车，但车门被焊死了。',
        '一片荒芜的农田，泥土中似乎埋着什么。'
      ];
      const rewards = [
        { text: '获得：食物×2, 水×1', resources: { food: 2, water: 1 } },
        { text: '获得：废铁×3', resources: { scrap: 3 } },
        { text: '什么也没发现，但你感到有人在暗中观察你。', resources: {} },
        { text: '获得：瓶盖×5', resources: { caps: 5 } },
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
    }, 800);
  };
  
  const handleQuestAction = (action: string) => {
    if (action === '接受任务') {
      usePhase1Store.getState().acceptQuest('MAIN_01');
      addMessage('quest', {
        sender: 'system',
        text: '【任务已接受】第一天：基础生存\n\n任务目标：\n- 收集食物 ×0/10\n- 收集水 ×0/10\n\n开始探索收集资源吧！'
      });
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <img 
            src={
              isNpc 
                ? 'https://picsum.photos/seed/npc/50/50' 
                : 'https://picsum.photos/seed/system/50/50'
            } 
            alt="avatar" 
            className="w-9 h-9 rounded-md object-cover" 
          />
        </div>
      )}
      
      <div className={`max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {isNpc && (
          <span className="text-[12px] text-gray-500 mb-1 ml-1">
            {message.senderName || 'NPC'}
          </span>
        )}
        
        <div className={`px-3 py-2 rounded-lg text-[14px] leading-relaxed shadow-sm ${
          isUser 
            ? 'bg-bubble-user-bg text-neutral-900 rounded-tr-none' 
            : isSystem
              ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
              : 'bg-white text-neutral-900 rounded-tl-none border border-neutral-200'
        }`}>
          {message.text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              <br />
            </React.Fragment>
          ))}
          
          {/* 快捷操作按钮 */}
          {message.actions && message.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action)}
                  className="px-3 py-1 text-xs bg-neutral-100 border border-neutral-300 rounded-md hover:bg-neutral-200 text-neutral-700 transition-colors btn-interaction"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <span className="text-[11px] text-gray-400 mt-1 mx-1">
          {message.time}
        </span>
      </div>
      
      {isUser && (
        <img 
          src="https://picsum.photos/seed/user/50/50" 
          alt="avatar" 
          className="w-9 h-9 rounded-md object-cover ml-3 flex-shrink-0" 
        />
      )}
    </div>
  );
};

export default ChatMessageItem;
