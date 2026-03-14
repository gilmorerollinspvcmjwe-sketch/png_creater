import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { Shield, Zap, Home, Droplets, Users } from 'lucide-react';

export const ShelterPanel: React.FC = () => {
  const { shelter, resources, toggleShelterEditor } = usePhase1Store();
  
  const facilities = [
    { 
      name: '防御工事', 
      level: shelter.defenseLevel, 
      icon: Shield, 
      color: 'text-green-600',
      desc: '抵御丧尸潮的关键'
    },
    { 
      name: '电力系统', 
      level: shelter.powerLevel, 
      icon: Zap, 
      color: 'text-blue-600',
      desc: '解锁高级设施'
    },
    { 
      name: '农场', 
      level: shelter.farmLevel, 
      icon: Home, 
      color: 'text-yellow-600',
      desc: '持续产出食物'
    },
    { 
      name: '水处理', 
      level: shelter.waterLevel, 
      icon: Droplets, 
      color: 'text-cyan-600',
      desc: '储备饮用水'
    }
  ];
  
  return (
    <div className="flex-grow overflow-y-auto bg-neutral-50 p-4">
      {/* 避难所信息卡片 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-4 card-interaction">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-medium text-neutral-900">避难所</h2>
          <span className="text-[14px] text-primary">Lv.{shelter.level}</span>
        </div>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <Users size={16} className="text-neutral-500" />
            <span className="text-[13px] text-neutral-600">
              {shelter.npcSlots} 人
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Home size={16} className="text-neutral-500" />
            <span className="text-[13px] text-neutral-600">
              {shelter.space}m²
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => toggleShelterEditor(true)}
          className="w-full py-2 bg-neutral-100 text-neutral-700 rounded-md text-[14px] hover:bg-neutral-200 transition-colors btn-interaction"
        >
          可视化管理
        </button>
      </div>
      
      {/* 设施升级 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="text-[15px] font-medium text-gray-900 mb-3">核心设施</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {facilities.map((facility, index) => {
            const Icon = facility.icon;
            return (
              <div 
                key={index}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon size={18} className={facility.color} />
                  <span className={`text-[12px] font-medium ${facility.color}`}>
                    Lv.{facility.level}
                  </span>
                </div>
                <div className="text-[13px] text-gray-900 font-medium mb-1">
                  {facility.name}
                </div>
                <div className="text-[11px] text-gray-500">
                  {facility.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 资源概览 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-[15px] font-medium text-gray-900 mb-3">资源储备</h3>
        
        <div className="grid grid-cols-3 gap-3">
          <ResourceItem 
            icon="💧" 
            name="水" 
            value={resources.water} 
            color="text-blue-500" 
          />
          <ResourceItem 
            icon="🍞" 
            name="食物" 
            value={resources.food} 
            color="text-orange-500" 
          />
          <ResourceItem 
            icon="🪵" 
            name="木材" 
            value={resources.wood} 
            color="text-amber-700" 
          />
          <ResourceItem 
            icon="⚙️" 
            name="废铁" 
            value={resources.scrap} 
            color="text-gray-500" 
          />
          <ResourceItem 
            icon="💰" 
            name="瓶盖" 
            value={resources.caps} 
            color="text-yellow-600" 
          />
          <ResourceItem 
            icon="💊" 
            name="药品" 
            value={resources.medicine} 
            color="text-pink-500" 
          />
        </div>
      </div>
    </div>
  );
};

const ResourceItem: React.FC<{
  icon: string;
  name: string;
  value: number;
  color: string;
}> = ({ icon, name, value, color }) => (
  <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
    <span className="text-[20px] mb-1">{icon}</span>
    <span className={`text-[16px] font-bold ${color}`}>{value}</span>
    <span className="text-[11px] text-gray-500">{name}</span>
  </div>
);

export default ShelterPanel;
