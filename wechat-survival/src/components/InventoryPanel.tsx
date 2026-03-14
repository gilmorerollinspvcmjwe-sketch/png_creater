import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { Backpack, Sword, Shield, Zap } from 'lucide-react';

export const InventoryPanel: React.FC = () => {
  const { inventory, player, toggleCharacterPanel } = usePhase1Store();
  
  // 按类型分组物品
  const groupedItems = inventory.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, typeof inventory>);
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword size={16} className="text-red-500" />;
      case 'armor': return <Shield size={16} className="text-blue-500" />;
      case 'consumable': return <Zap size={16} className="text-yellow-500" />;
      default: return <Backpack size={16} className="text-gray-500" />;
    }
  };
  
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'UR': return 'text-purple-600';
      case 'SSR': return 'text-orange-600';
      case 'SR': return 'text-blue-600';
      case 'R': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };
  
  return (
    <div className="flex-grow overflow-y-auto bg-neutral-50">
      {/* 角色状态概览 */}
      <div className="p-4 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-medium text-neutral-900">角色状态</h2>
          <button
            onClick={() => toggleCharacterPanel(true)}
            className="text-[13px] text-primary hover:text-primary-hover link-interaction"
          >
            查看详情
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-center">
            <span className="text-[12px] text-neutral-500">等级</span>
            <span className="text-[18px] font-bold text-primary">
              {player.level}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
              <span>经验值</span>
              <span>{player.exp} / {player.level * 100}</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${(player.exp / (player.level * 100)) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
            <span className="text-[16px] font-bold text-amber-600">{player.strength}</span>
            <span className="text-[11px] text-gray-500">力量</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
            <span className="text-[16px] font-bold text-blue-600">{player.agility}</span>
            <span className="text-[11px] text-gray-500">敏捷</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
            <span className="text-[16px] font-bold text-purple-600">{player.intelligence}</span>
            <span className="text-[11px] text-gray-500">智力</span>
          </div>
        </div>
      </div>
      
      {/* 背包物品 */}
      <div className="p-4">
        <h3 className="text-[15px] font-medium text-gray-900 mb-3 flex items-center">
          <Backpack size={18} className="mr-2" />
          背包
          <span className="ml-2 text-[12px] text-gray-500">
            ({inventory.reduce((sum, item) => sum + item.count, 0)} 件)
          </span>
        </h3>
        
        {inventory.length === 0 ? (
          <div className="text-center py-12">
            <Backpack size={64} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-[14px]">背包是空的</p>
            <p className="text-gray-400 text-[12px] mt-1">去探索收集物资吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([type, items]) => (
              <div key={type}>
                <div className="flex items-center mb-2">
                  {getTypeIcon(type)}
                  <span className="ml-2 text-[13px] font-medium text-gray-700 capitalize">
                    {type === 'weapon' && '武器'}
                    {type === 'armor' && '装备'}
                    {type === 'consumable' && '消耗品'}
                    {type === 'material' && '材料'}
                    {type === 'key' && '任务'}
                    {type === 'treasure' && '宝物'}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="aspect-square bg-white rounded-lg border border-gray-200 p-2 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="text-[24px] mb-1">
                        {item.icon || '📦'}
                      </div>
                      <div className="text-[11px] text-gray-700 text-center truncate w-full">
                        {item.name}
                      </div>
                      <div className={`text-[10px] font-medium ${getRarityColor(item.rarity)}`}>
                        ×{item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;
