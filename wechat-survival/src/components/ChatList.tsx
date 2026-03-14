import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { MessageSquare, Users, PlusCircle } from 'lucide-react';

export const ChatList: React.FC = () => {
  const { 
    chats, 
    messages, 
    activeChatId, 
    setActiveChat,
    activeTab,
    contacts,
    setSelectedContact
  } = usePhase1Store();
  
  const getChatAvatar = (chat: typeof chats[0]) => {
    if (Array.isArray(chat.avatar)) {
      return (
        <div className="w-10 h-10 rounded-md bg-neutral-300 grid grid-cols-2 gap-1 p-1 overflow-hidden">
          {chat.avatar.slice(0, 4).map((src, i) => (
            <img 
              key={i} 
              src={src} 
              alt="avatar" 
              className="w-full h-full object-cover" 
            />
          ))}
        </div>
      );
    }
    return (
      <img 
        src={chat.avatar} 
        alt="avatar" 
        className="w-10 h-10 rounded-md object-cover" 
      />
    );
  };
  
  const getLastMessage = (chatId: string) => {
    const chatMessages = messages[chatId] || [];
    return chatMessages[chatMessages.length - 1];
  };
  
  return (
    <div className="w-64 bg-neutral-200 border-r border-neutral-300 flex flex-col flex-shrink-0">
      {/* 搜索栏 */}
      <div className="h-[60px] flex items-center px-4 bg-neutral-50 border-b border-neutral-300">
        <div className="bg-neutral-200 rounded-md px-3 py-1.5 flex-grow text-[13px] text-neutral-500 flex items-center">
          <span className="mr-1">🔍</span> 搜索
        </div>
        <button className="ml-2 bg-neutral-200 rounded-md p-1.5 text-neutral-600 hover:bg-neutral-300 transition-colors">
          <PlusCircle size={16} />
        </button>
      </div>
      
      {/* 列表内容 */}
      <div className="flex-grow overflow-y-auto">
        {activeTab === 'message' ? (
          // 消息列表
          <div className="divide-y divide-neutral-200/50">
            {chats
              .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
              .map(chat => {
                const lastMsg = getLastMessage(chat.id);
                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChat(chat.id)}
                    className={`flex items-center px-3 py-3 cursor-pointer transition-colors list-item-interaction ${
                      activeChatId === chat.id 
                        ? 'bg-neutral-300' 
                        : chat.pinned 
                          ? 'bg-neutral-100' 
                          : 'hover:bg-neutral-200'
                    }`}
                  >
                    {getChatAvatar(chat)}
                    <div className="flex-col flex-grow overflow-hidden ml-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[14px] text-neutral-900 truncate font-medium">
                          {chat.name}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {lastMsg?.time || '12:00'}
                        </span>
                      </div>
                      <div className="text-[12px] text-neutral-500 truncate mt-1">
                        {lastMsg?.text.replace(/【.*?】/g, '') || chat.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          // 联系人列表
          <div>
            <div className="px-4 py-2 text-[12px] text-neutral-500 bg-neutral-50">
              新的朋友
            </div>
            <div className="px-4 py-2 text-[12px] text-neutral-500 bg-neutral-50">
              群聊
            </div>
            <div className="px-4 py-2 text-[12px] text-neutral-500 bg-neutral-50">
              星标朋友
            </div>
            
            {contacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="flex items-center px-3 py-3 cursor-pointer hover:bg-neutral-200 bg-white border-b border-neutral-100 list-item-interaction"
              >
                <img 
                  src={contact.avatar} 
                  alt={contact.name} 
                  className="w-10 h-10 rounded-md mr-3 object-cover" 
                />
                <div>
                  <span className="text-[14px] text-neutral-900">
                    {contact.name}
                  </span>
                  <div className="text-[11px] text-neutral-500">
                    {contact.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
