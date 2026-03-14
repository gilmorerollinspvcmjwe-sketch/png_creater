import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { CheckCircle, Circle, Award, TrendingUp } from 'lucide-react';
import type { Quest } from '../types/phase1';

export const QuestPanel: React.FC = () => {
  const { quests, acceptQuest, completeQuest, addMessage } = usePhase1Store();
  
  const mainQuests = quests.filter(q => q.type === 'main');
  const sideQuests = quests.filter(q => q.type === 'side');
  
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-600';
    if (difficulty <= 6) return 'text-yellow-600';
    if (difficulty <= 8) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getStatusBadge = (status: Quest['status']) => {
    switch (status) {
      case 'pending':
        return <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">未接受</span>;
      case 'in_progress':
        return <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded">进行中</span>;
      case 'completed':
        return <span className="text-[11px] px-2 py-0.5 bg-green-100 text-green-600 rounded">已完成</span>;
      case 'failed':
        return <span className="text-[11px] px-2 py-0.5 bg-red-100 text-red-600 rounded">失败</span>;
    }
  };
  
  const handleAcceptQuest = (quest: Quest) => {
    acceptQuest(quest.id);
    addMessage('quest', {
      sender: 'system',
      text: `【任务已接受】${quest.title}\n\n${quest.description}`
    });
  };
  
  const handleCompleteQuest = (quest: Quest) => {
    completeQuest(quest.id);
    const rewardText = quest.rewards.map(r => {
      if (r.type === 'exp') return `经验×${r.amount}`;
      if (r.type === 'item') return `${r.name}×${r.amount}`;
      if (r.type === 'resource' && r.id) return `${r.id}×${r.amount}`;
      return '';
    }).join(', ');
    
    addMessage('quest', {
      sender: 'system',
      text: `【任务完成】${quest.title}\n\n获得奖励：${rewardText}`
    });
  };
  
  return (
    <div className="flex-grow overflow-y-auto bg-neutral-50">
      {/* 主线任务 */}
      <div className="mb-4">
        <div className="px-4 py-2 bg-white border-b border-neutral-200">
          <h2 className="text-[15px] font-medium text-neutral-900 flex items-center">
            <Award size={18} className="mr-2 text-primary" />
            主线任务
          </h2>
        </div>
        
        <div className="divide-y divide-neutral-200">
          {mainQuests.map(quest => (
            <QuestItem 
              key={quest.id} 
              quest={quest}
              onAccept={() => handleAcceptQuest(quest)}
              onComplete={() => handleCompleteQuest(quest)}
              getDifficultyColor={getDifficultyColor}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      </div>
      
      {/* 支线任务 */}
      <div>
        <div className="px-4 py-2 bg-white border-b border-neutral-200">
          <h2 className="text-[15px] font-medium text-neutral-900 flex items-center">
            <TrendingUp size={18} className="mr-2 text-blue-600" />
            支线任务
          </h2>
        </div>
        
        <div className="divide-y divide-neutral-200">
          {sideQuests.map(quest => (
            <QuestItem 
              key={quest.id} 
              quest={quest}
              onAccept={() => handleAcceptQuest(quest)}
              onComplete={() => handleCompleteQuest(quest)}
              getDifficultyColor={getDifficultyColor}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const QuestItem: React.FC<{
  quest: Quest;
  onAccept: () => void;
  onComplete: () => void;
  getDifficultyColor: (d: number) => string;
  getStatusBadge: (s: Quest['status']) => React.ReactNode;
}> = ({ quest, onAccept, onComplete, getDifficultyColor, getStatusBadge }) => {
  const isCompleted = quest.status === 'completed';
  const isInProgress = quest.status === 'in_progress';
  const allObjectivesCompleted = quest.objectives.every(o => o.completed);
  
  return (
    <div className="p-4 bg-white card-interaction">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[14px] font-medium text-neutral-900">
              {quest.title}
            </span>
            {getStatusBadge(quest.status)}
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-[12px] ${getDifficultyColor(quest.difficulty)}`}>
              难度：{quest.difficulty}
            </span>
            <span className="text-[12px] text-neutral-400">
              {quest.type === 'main' ? '主线' : '支线'}
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-[13px] text-neutral-600 mb-3 line-clamp-2">
        {quest.description}
      </p>
      
      {/* 任务目标 */}
      <div className="space-y-1 mb-3">
        {quest.objectives.map((obj, index) => (
          <div key={index} className="flex items-center text-[12px]">
            {obj.completed ? (
              <CheckCircle size={14} className="mr-2 text-green-500" />
            ) : (
              <Circle size={14} className="mr-2 text-neutral-400" />
            )}
            <span className={obj.completed ? 'text-neutral-400 line-through' : 'text-neutral-700'}>
              {obj.description} {obj.count}/{obj.target}
            </span>
          </div>
        ))}
      </div>
      
      {/* 任务奖励 */}
      <div className="flex items-center text-[12px] text-neutral-500 mb-3">
        <Award size={14} className="mr-1" />
        <span>
          {quest.rewards.map((r, i) => {
            if (r.type === 'exp') return `${r.amount}经验`;
            if (r.type === 'item') return r.name;
            if (r.type === 'resource' && r.id) return `${r.id}×${r.amount}`;
            return '';
          }).join(', ')}
        </span>
      </div>
      
      {/* 操作按钮 */}
      {!isCompleted && (
        <div className="flex space-x-2">
          {!isInProgress ? (
            <button
              onClick={onAccept}
              className="flex-1 py-1.5 bg-primary text-white rounded-md text-[13px] hover:bg-primary-hover transition-colors btn-interaction"
            >
              接受任务
            </button>
          ) : (
            <button
              onClick={onComplete}
              disabled={!allObjectivesCompleted}
              className={`flex-1 py-1.5 rounded-md text-[13px] transition-colors btn-interaction ${
                allObjectivesCompleted
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {allObjectivesCompleted ? '领取奖励' : '未完成'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestPanel;
