import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { COMPONENT_DEFINITIONS, ComponentDefinition } from '@/types'
import { useUIStore } from '@/stores'
import {
  Square,
  Type,
  Image,
  User,
  Tags,
  Link,
  Heart,
  LayoutGrid,
  Users,
  Music,
  Quote,
  Minus,
  Space,
  Film
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  Square: <Square size={16} />, 
  Type: <Type size={16} />, 
  Image: <Image size={16} />, 
  User: <User size={16} />, 
  Tags: <Tags size={16} />, 
  Link: <Link size={16} />, 
  Heart: <Heart size={16} />, 
  LayoutGrid: <LayoutGrid size={16} />, 
  Users: <Users size={16} />, 
  Music: <Music size={16} />, 
  Quote: <Quote size={16} />, 
  Minus: <Minus size={16} />, 
  Space: <Space size={16} />, 
  Film: <Film size={16} />,
}

interface DraggableComponentItemProps {
  definition: ComponentDefinition
}

const DraggableComponentItem: React.FC<DraggableComponentItemProps> = ({ definition }) => {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `library-${definition.type}`,
    data: { type: definition.type, isNew: true },
  })

  const style = {
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="component-item"
      style={style}
    >
      <span className="text-gray-500">{ICON_MAP[definition.icon]}</span>
      <span className="text-sm">{definition.name}</span>
    </div>
  )
}

const ComponentLibrary: React.FC = () => {
  const { activeTab } = useUIStore()

  if (activeTab !== 'components') return null

  const categories = [
    { key: 'layout', name: '布局', icon: '📦' },
    { key: 'content', name: '内容', icon: '📝' },
    { key: 'anime', name: '二次元专属', icon: '🌸' },
    { key: 'decor', name: '装饰', icon: '✨' },
  ]

  return (
    <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin max-h-[calc(100vh-200px)]">
      {categories.map((category) => (
        <div key={category.key}>
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COMPONENT_DEFINITIONS
              .filter(d => d.category === category.key)
              .map((definition) => (
                <DraggableComponentItem
                  key={definition.type}
                  definition={definition}
                />
              ))}
          </div>
        </div>
      ))}

      {/* 提示 */}
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
        <p className="mb-1">💡 操作提示</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>拖拽组件到画布添加</li>
          <li>点击组件进行编辑</li>
          <li>Ctrl+Z 撤销操作</li>
        </ul>
      </div>
    </div>
  )
}

export default ComponentLibrary