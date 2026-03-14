import React from 'react';
import { usePhase1Store } from '../stores/phase1Store';
import { X, Home, Shield, Zap } from 'lucide-react';

export const ShelterEditor: React.FC = () => {
  const { shelter, resources, showShelterEditor, toggleShelterEditor } = usePhase1Store();
  
  if (!showShelterEditor) return null;
  
  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
      {/* 头部 */}
      <div className="h-[60px] flex items-center justify-between px-6 border-b border-gray-300">
        <span className="text-[16px] font-medium text-gray-900">
          避难所可视化编辑器
        </span>
        <button 
          onClick={() => toggleShelterEditor(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* 内容 */}
      <div className="flex-grow p-6 flex space-x-6 bg-neutral-50 overflow-y-auto">
        {/* 左侧：可视化预览 */}
        <div className="flex-1 bg-neutral-100 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center relative overflow-hidden min-h-[400px]">
          {/* 网格背景 */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{ 
              backgroundImage: 'radial-gradient(var(--neutral-900) 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }}
          />
          
          {/* 避难所中心图标 */}
          <div className="z-10 text-center">
            <Home size={120} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-[14px]">
              避难所预览 (Lv.{shelter.level})
            </p>
          </div>
          
          {/* 设施可视化 */}
          <div className="absolute bottom-10 left-10 w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Zap size={32} className="text-blue-500" />
          </div>
          <div className="absolute top-10 right-10 w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
            <Shield size={32} className="text-green-500" />
          </div>
        </div>
        
        {/* 右侧：控制面板 */}
        <div className="w-[400px] space-y-4">
          {/* 核心模组升级 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-[16px] font-medium text-gray-900 mb-4">
              核心模组升级
            </h3>
            
            <div className="space-y-3">
              <FacilityCard
                name="防御工事"
                level={shelter.defenseLevel}
                color="text-green-600"
                bgColor="bg-green-50"
                desc="抵御丧尸潮的关键"
                current={shelter.defense}
                upgradeCost={{ wood: 10, scrap: 5 }}
                onUpgrade={() => {}}
              />
              
              <FacilityCard
                name="电力系统"
                level={shelter.powerLevel}
                color="text-blue-600"
                bgColor="bg-blue-50"
                desc="解锁高级设施"
                current={shelter.power}
                upgradeCost={{ scrap: 20 }}
                locked
              />
              
              <FacilityCard
                name="农场"
                level={shelter.farmLevel}
                color="text-yellow-600"
                bgColor="bg-yellow-50"
                desc="持续产出食物"
                current={shelter.farmLevel}
                upgradeCost={{ wood: 15, food: 10 }}
              />
              
              <FacilityCard
                name="水处理"
                level={shelter.waterLevel}
                color="text-cyan-600"
                bgColor="bg-cyan-50"
                desc="储备饮用水"
                current={shelter.waterLevel}
                upgradeCost={{ scrap: 10, caps: 50 }}
              />
            </div>
          </div>
          
          {/* 资源概览 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">
              当前资源概览
            </h4>
            <div className="flex flex-wrap gap-3">
              <ResourceBadge icon="💧" name="水" value={resources.water} color="text-blue-500" />
              <ResourceBadge icon="🍞" name="粮" value={resources.food} color="text-orange-500" />
              <ResourceBadge icon="🪵" name="木" value={resources.wood} color="text-amber-700" />
              <ResourceBadge icon="⚙️" name="铁" value={resources.scrap} color="text-gray-500" />
              <ResourceBadge icon="💰" name="币" value={resources.caps} color="text-yellow-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FacilityCard: React.FC<{
  name: string;
  level: number;
  color: string;
  bgColor: string;
  desc: string;
  current: number;
  upgradeCost: Record<string, number>;
  locked?: boolean;
  onUpgrade: () => void;
}> = ({ name, level, color, bgColor, desc, current, upgradeCost, locked, onUpgrade }) => (
  <div className={`p-3 rounded-lg border ${bgColor} border-gray-200`}>
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium text-gray-900">{name}</span>
      <span className={`text-[13px] font-medium ${color}`}>Lv.{level}</span>
    </div>
    <p className="text-[11px] text-gray-500 mb-2">{desc} - 当前：{current}</p>
    <div className="flex items-center justify-between">
      <div className="flex space-x-2">
        {Object.entries(upgradeCost).map(([resource, amount]) => (
          <span key={resource} className="text-[11px] text-gray-600">
            {resource}: {amount}
          </span>
        ))}
      </div>
      <button
        onClick={onUpgrade}
        disabled={locked}
        className={`px-3 py-1 text-[12px] rounded-md transition-colors btn-interaction ${
          locked
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary-hover'
        }`}
      >
        {locked ? '需解锁' : '升级'}
      </button>
    </div>
  </div>
);

const ResourceBadge: React.FC<{
  icon: string;
  name: string;
  value: number;
  color: string;
}> = ({ icon, name, value, color }) => (
  <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg min-w-[60px]">
    <span className="text-[18px]">{icon}</span>
    <span className={`text-[14px] font-bold ${color}`}>{value}</span>
    <span className="text-[10px] text-gray-500">{name}</span>
  </div>
);

export default ShelterEditor;
