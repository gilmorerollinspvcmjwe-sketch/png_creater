import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { Heart, Zap, Utensils, Droplets, X } from 'lucide-react';

export const CharacterPanel: React.FC = () => {
  const { player, showCharacterPanel, toggleCharacterPanel } = usePhase1Store();
  
  if (!showCharacterPanel) return null;
  
  const StatBar: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    maxValue: number;
    color: string;
  }> = ({ icon, label, value, maxValue, color }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-[13px] text-gray-700">{label}</span>
        </div>
        <span className={`text-[13px] font-medium ${color}`}>
          {value} / {maxValue}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color.replace('text', 'bg')} transition-all`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
    </div>
  );
  
  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
      {/* 头部 */}
      <div className="h-[60px] flex items-center justify-between px-6 border-b border-gray-300 bg-white">
        <span className="text-[16px] font-medium text-gray-900">角色属性</span>
        <button 
          onClick={() => toggleCharacterPanel(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* 内容 */}
      <div className="flex-grow overflow-y-auto bg-neutral-50 p-6">
        <div className="max-w-lg mx-auto">
          {/* 角色信息卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-4">
            <div className="flex items-center space-x-4 mb-4">
              <img 
                src="https://picsum.photos/seed/user/100/100" 
                alt="角色头像" 
                className="w-20 h-20 rounded-full border-4 border-primary object-cover" 
              />
              <div>
                <h2 className="text-[20px] font-bold text-neutral-900">
                  幸存者
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[14px] text-neutral-600">
                    Lv.{player.level}
                  </span>
                  <span className="text-[12px] px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                    房间之主
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                    <span>经验值</span>
                    <span>{player.exp} / {player.level * 100}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${(player.exp / (player.level * 100)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 状态条 */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-4">
            <h3 className="text-[15px] font-medium text-neutral-900 mb-4">
              生存状态
            </h3>
            
            <StatBar
              icon={<Heart size={16} className="text-red-500" />}
              label="生命值"
              value={player.health}
              maxValue={100}
              color="text-red-500"
            />
            
            <StatBar
              icon={<Utensils size={16} className="text-orange-500" />}
              label="饱食度"
              value={player.hunger}
              maxValue={100}
              color="text-orange-500"
            />
            
            <StatBar
              icon={<Droplets size={16} className="text-blue-500" />}
              label="口渴度"
              value={player.thirst}
              maxValue={100}
              color="text-blue-500"
            />
            
            <StatBar
              icon={<Zap size={16} className="text-green-500" />}
              label="体力"
              value={player.stamina}
              maxValue={100}
              color="text-green-500"
            />
          </div>
          
          {/* 属性面板 */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <h3 className="text-[15px] font-medium text-neutral-900 mb-4">
              核心属性
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center border border-amber-200">
                <div className="text-[24px] font-bold text-amber-600">
                  {player.strength}
                </div>
                <div className="text-[12px] text-amber-700 mt-1">力量</div>
                <div className="text-[10px] text-amber-600 mt-1">
                  影响战斗伤害
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
                <div className="text-[24px] font-bold text-blue-600">
                  {player.agility}
                </div>
                <div className="text-[12px] text-blue-700 mt-1">敏捷</div>
                <div className="text-[10px] text-blue-600 mt-1">
                  影响闪避和速度
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center border border-purple-200">
                <div className="text-[24px] font-bold text-purple-600">
                  {player.intelligence}
                </div>
                <div className="text-[12px] text-purple-700 mt-1">智力</div>
                <div className="text-[10px] text-purple-600 mt-1">
                  影响经验和科技
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-[12px] text-gray-600">
                💡 <span className="font-medium">提示：</span>
                升级时可获得属性点，合理分配以应对不同挑战。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterPanel;
