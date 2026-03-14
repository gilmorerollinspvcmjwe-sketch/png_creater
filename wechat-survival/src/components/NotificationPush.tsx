import React, { useEffect, useState } from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { Bell, X, AlertTriangle, Gift, MessageSquare } from 'lucide-react';

/**
 * 微信服务通知推送组件
 * 模拟微信服务通知的推送效果
 */
export const NotificationPush: React.FC = () => {
  const { addMessage, addResource } = usePhase1Store();
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'system' | 'event' | 'gift' | 'message';
    title: string;
    content: string;
    timestamp: number;
  }>>([]);
  
  useEffect(() => {
    // 模拟定时推送通知
    const pushTypes = [
      {
        type: 'system' as const,
        title: '系统警告',
        content: '丧尸潮即将来袭，请加固防御！',
        icon: AlertTriangle
      },
      {
        type: 'event' as const,
        title: '新事件',
        content: '流浪商人出现在避难所附近',
        icon: MessageSquare
      },
      {
        type: 'gift' as const,
        title: '每日签到',
        content: '领取今日补给包：食物×5, 水×5',
        icon: Gift
      }
    ];
    
    // 每 30 秒随机推送一条通知
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const push = pushTypes[Math.floor(Math.random() * pushTypes.length)];
        const id = Math.random().toString(36).substr(2, 9);
        
        setNotifications(prev => [...prev, {
          id,
          type: push.type,
          title: push.title,
          content: push.content,
          timestamp: Date.now()
        }]);
        
        // 同时在系统消息中添加
        addMessage('sys_notice', {
          sender: 'system',
          text: `【推送通知】${push.title}\n${push.content}`
        });
        
        // 如果是礼物，发放奖励
        if (push.type === 'gift') {
          addResource('food', 5);
          addResource('water', 5);
        }
        
        // 3 秒后自动消失
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [addMessage, addResource]);
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'system': return <AlertTriangle size={20} className="text-red-500" />;
      case 'event': return <MessageSquare size={20} className="text-blue-500" />;
      case 'gift': return <Gift size={20} className="text-yellow-500" />;
      default: return <Bell size={20} className="text-gray-500" />;
    }
  };
  
  const getColor = (type: string) => {
    switch (type) {
      case 'system': return 'border-red-500';
      case 'event': return 'border-blue-500';
      case 'gift': return 'border-yellow-500';
      default: return 'border-gray-500';
    }
  };
  
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`w-80 bg-white rounded-lg shadow-lg border-l-4 ${getColor(notification.type)} p-3 animate-slide-in-right card-interaction`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-medium text-neutral-900">
                    {notification.title}
                  </h4>
                  <button
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    className="text-neutral-400 hover:text-neutral-600 clickable-interaction"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[13px] text-neutral-600 mt-1">
                  {notification.content}
                </p>
                <p className="text-[11px] text-neutral-400 mt-2">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationPush;
