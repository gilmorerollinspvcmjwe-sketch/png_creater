import React, { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores'
import { ComponentInstance, THEME_COLORS } from '@/types'
import { X } from 'lucide-react'

const PropertyPanel: React.FC = () => {
  const { 
    currentPage, 
    selectedComponentId, 
    updateComponentImmediate, 
    pushHistory,
    changeTheme,
    selectComponent,
  } = useEditorStore()
  
  const selectedComponent = currentPage?.components.find(
    c => c.id === selectedComponentId
  ) as ComponentInstance | undefined
  
  // Debounce 定时器，用于在编辑停止后记录历史
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // 组件切换时清除定时器并记录历史
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      // 切换组件时立即记录历史
      pushHistory()
    }
  }, [selectedComponentId, pushHistory])
  
  // 实时更新函数（不记录历史）
  const handleChange = (id: string, updates: Partial<ComponentInstance>) => {
    updateComponentImmediate(id, updates)
    
    // 设置 debounce 定时器，500ms 后记录历史
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      pushHistory()
      debounceTimerRef.current = null
    }, 500)
  }
  
  if (!currentPage) return null
  
  return (
    <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto scrollbar-thin">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium">属性面板</h3>
        {selectedComponentId && (
          <button 
            onClick={() => selectComponent(null)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {/* 主题选择 */}
      <div className="p-3 border-b border-gray-200">
        <div className="property-label mb-2">主题配色</div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(THEME_COLORS).map(([id, colors]) => (
            <button
              key={id}
              onClick={() => changeTheme(id)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                currentPage.theme === id 
                  ? 'border-gray-800 scale-110' 
                  : 'border-gray-200'
              }`}
              style={{ background: colors.primary }}
              title={id}
            />
          ))}
        </div>
      </div>
      
      {/* 组件属性 */}
      {selectedComponent ? (
        <div className="p-3 space-y-4">
          {/* 基础属性 */}
          <div className="property-group">
            <div className="property-label">位置</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400">X</label>
                <input
                  type="number"
                  className="property-input"
                  value={selectedComponent.x}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    x: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Y</label>
                <input
                  type="number"
                  className="property-input"
                  value={selectedComponent.y}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    y: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
            </div>
          </div>
          
          <div className="property-group">
            <div className="property-label">尺寸</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400">宽度</label>
                <input
                  type="number"
                  className="property-input"
                  value={selectedComponent.width}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    width: parseInt(e.target.value) || 50 
                  })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">高度</label>
                <input
                  type="number"
                  className="property-input"
                  value={selectedComponent.height}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    height: parseInt(e.target.value) || 50 
                  })}
                />
              </div>
            </div>
          </div>
          
          {/* Bug 3 Fix: zIndex 编辑 */}
          <div className="property-group">
            <div className="property-label">层级 (z-index)</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400">层级值</label>
                <input
                  type="number"
                  className="property-input"
                  value={selectedComponent.zIndex || 1}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    zIndex: Math.max(1, parseInt(e.target.value) || 1) 
                  })}
                />
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => handleChange(selectedComponentId!, { 
                  zIndex: Math.max(1, selectedComponent.zIndex - 1) 
                })}
                className="flex-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                下移一层
              </button>
              <button
                onClick={() => handleChange(selectedComponentId!, { 
                  zIndex: selectedComponent.zIndex + 1 
                })}
                className="flex-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                上移一层
              </button>
            </div>
          </div>
          
          {/* 类型特定属性 */}
          {selectedComponent.type === 'text' && (
            <div className="property-group">
              <div className="property-label">文本内容</div>
              <textarea
                className="property-input min-h-[60px]"
                value={selectedComponent.content}
                onChange={(e) => handleChange(selectedComponentId!, { 
                  content: e.target.value 
                })}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">字号</label>
                  <input
                    type="number"
                    className="property-input"
                    value={selectedComponent.fontSize || 14}
                    onChange={(e) => handleChange(selectedComponentId!, { 
                      fontSize: parseInt(e.target.value) || 14 
                    })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">颜色</label>
                  <input
                    type="color"
                    className="property-input h-8"
                    value={selectedComponent.color || '#2A2A2A'}
                    onChange={(e) => handleChange(selectedComponentId!, { 
                      color: e.target.value 
                    })}
                  />
                </div>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'tag-group' && (
            <div className="property-group">
              <div className="property-label">标签（逗号分隔）</div>
              <input
                type="text"
                className="property-input"
                value={selectedComponent.tags.join(', ')}
                onChange={(e) => handleChange(selectedComponentId!, { 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
              />
            </div>
          )}
          
          {selectedComponent.type === 'image' && (
            <div className="property-group">
              <div className="property-label">图片链接</div>
              <input
                type="text"
                className="property-input"
                value={selectedComponent.src}
                onChange={(e) => handleChange(selectedComponentId!, { 
                  src: e.target.value 
                })}
                placeholder="输入图片URL"
              />
            </div>
          )}
          
          {selectedComponent.type === 'avatar' && (
            <div className="property-group">
              <div className="property-label">头像链接</div>
              <input
                type="text"
                className="property-input"
                value={selectedComponent.src}
                onChange={(e) => handleChange(selectedComponentId!, { 
                  src: e.target.value 
                })}
                placeholder="输入头像URL"
              />
              <div className="mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedComponent.showGlow || false}
                    onChange={(e) => handleChange(selectedComponentId!, { 
                      showGlow: e.target.checked 
                    })}
                  />
                  <span className="text-xs">呼吸光晕动画</span>
                </label>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'oshi-card' && (
            <div className="property-group">
              <div className="property-label">推し角色</div>
              <div className="space-y-2">
                {selectedComponent.characters.map((char, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      className="property-input flex-1"
                      value={char.name}
                      onChange={(e) => {
                        const chars = [...selectedComponent.characters]
                        chars[i] = { ...chars[i], name: e.target.value }
                        handleChange(selectedComponentId!, { characters: chars })
                      }}
                      placeholder="角色名"
                    />
                    <input
                      type="text"
                      className="property-input flex-1"
                      value={char.from}
                      onChange={(e) => {
                        const chars = [...selectedComponent.characters]
                        chars[i] = { ...chars[i], from: e.target.value }
                        handleChange(selectedComponentId!, { characters: chars })
                      }}
                      placeholder="作品"
                    />
                  </div>
                ))}
                <button
                  onClick={() => handleChange(selectedComponentId!, { 
                    characters: [...selectedComponent.characters, { name: '', from: '' }]
                  })}
                  className="w-full py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  + 添加角色
                </button>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'attribute-wall' && (
            <div className="property-group">
              <div className="property-label">属性标签</div>
              <div className="space-y-2">
                {selectedComponent.attributes.map((attr, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      className="property-input flex-1"
                      value={attr.label}
                      onChange={(e) => {
                        const attrs = [...selectedComponent.attributes]
                        attrs[i] = { ...attrs[i], label: e.target.value }
                        handleChange(selectedComponentId!, { attributes: attrs })
                      }}
                      placeholder="标签名"
                    />
                    <input
                      type="text"
                      className="property-input flex-1"
                      value={attr.value}
                      onChange={(e) => {
                        const attrs = [...selectedComponent.attributes]
                        attrs[i] = { ...attrs[i], value: e.target.value }
                        handleChange(selectedComponentId!, { attributes: attrs })
                      }}
                      placeholder="值"
                    />
                  </div>
                ))}
                <button
                  onClick={() => handleChange(selectedComponentId!, { 
                    attributes: [...selectedComponent.attributes, { type: 'custom', label: '', value: '' }]
                  })}
                  className="w-full py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  + 添加属性
                </button>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'friends-list' && (
            <div className="property-group">
              <div className="property-label">友人帐</div>
              <div className="space-y-2">
                {selectedComponent.friends.map((friend, i) => (
                  <div key={i} className="p-2 bg-gray-50 rounded space-y-1">
                    <input
                      type="text"
                      className="property-input"
                      value={friend.name}
                      onChange={(e) => {
                        const friends = [...selectedComponent.friends]
                        friends[i] = { ...friends[i], name: e.target.value }
                        handleChange(selectedComponentId!, { friends })
                      }}
                      placeholder="昵称"
                    />
                    <input
                      type="text"
                      className="property-input"
                      value={friend.avatar || ''}
                      onChange={(e) => {
                        const friends = [...selectedComponent.friends]
                        friends[i] = { ...friends[i], avatar: e.target.value }
                        handleChange(selectedComponentId!, { friends })
                      }}
                      placeholder="头像链接"
                    />
                    <input
                      type="text"
                      className="property-input"
                      value={friend.intro || ''}
                      onChange={(e) => {
                        const friends = [...selectedComponent.friends]
                        friends[i] = { ...friends[i], intro: e.target.value }
                        handleChange(selectedComponentId!, { friends })
                      }}
                      placeholder="简介（hover 显示）"
                    />
                    <input
                      type="text"
                      className="property-input"
                      value={friend.color || ''}
                      onChange={(e) => {
                        const friends = [...selectedComponent.friends]
                        friends[i] = { ...friends[i], color: e.target.value }
                        handleChange(selectedComponentId!, { friends })
                      }}
                      placeholder="背景色"
                    />
                  </div>
                ))}
                <button
                  onClick={() => handleChange(selectedComponentId!, { 
                    friends: [...selectedComponent.friends, { name: '', color: '#F5F5F5' }]
                  })}
                  className="w-full py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  + 添加好友
                </button>
              </div>
              <div className="mt-2">
                <label className="text-xs text-gray-400">布局样式</label>
                <select
                  className="property-input"
                  value={selectedComponent.variant || 'grid'}
                  onChange={(e) => handleChange(selectedComponentId!, { variant: e.target.value as 'grid' | 'list' })}
                >
                  <option value="grid">网格</option>
                  <option value="list">列表</option>
                </select>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'music-player' && (
            <div className="property-group">
              <div className="property-label">音乐播放器</div>
              <div className="space-y-2">
                <input
                  type="text"
                  className="property-input"
                  value={selectedComponent.song.name}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    song: { ...selectedComponent.song, name: e.target.value } 
                  })}
                  placeholder="歌曲名称"
                />
                <input
                  type="text"
                  className="property-input"
                  value={selectedComponent.song.artist}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    song: { ...selectedComponent.song, artist: e.target.value } 
                  })}
                  placeholder="歌手"
                />
                <input
                  type="text"
                  className="property-input"
                  value={selectedComponent.song.cover || ''}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    song: { ...selectedComponent.song, cover: e.target.value } 
                  })}
                  placeholder="封面图片链接"
                />
                <input
                  type="text"
                  className="property-input"
                  value={selectedComponent.song.url || ''}
                  onChange={(e) => handleChange(selectedComponentId!, { 
                    song: { ...selectedComponent.song, url: e.target.value } 
                  })}
                  placeholder="播放链接（可选）"
                />
                <div className="mt-2">
                  <label className="text-xs text-gray-400">显示样式</label>
                  <select
                    className="property-input"
                    value={selectedComponent.variant || 'minimal'}
                    onChange={(e) => handleChange(selectedComponentId!, { variant: e.target.value as 'minimal' | 'full' })}
                  >
                    <option value="minimal">简约</option>
                    <option value="full">完整</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'quote' && (
            <div className="property-group">
              <div className="property-label">引言</div>
              <div className="space-y-2">
                <textarea
                  className="property-input min-h-[80px]"
                  value={selectedComponent.text}
                  onChange={(e) => handleChange(selectedComponentId!, { text: e.target.value })}
                  placeholder="引言内容"
                />
                <input
                  type="text"
                  className="property-input"
                  value={selectedComponent.translation || ''}
                  onChange={(e) => handleChange(selectedComponentId!, { translation: e.target.value })}
                  placeholder="翻译/来源"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">字号</label>
                    <input
                      type="number"
                      className="property-input"
                      value={selectedComponent.fontSize || 12}
                      onChange={(e) => handleChange(selectedComponentId!, { fontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedComponent.typewriterEffect ?? true}
                      onChange={(e) => handleChange(selectedComponentId!, { typewriterEffect: e.target.checked })}
                    />
                    <span className="text-xs">打字机效果</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'hero-section' && (
            <div className="property-group">
              <div className="property-label">头部组件</div>
              <div className="space-y-2">
                <input
                  type="text"
                  className="property-input"
                  value={selectedComponent.avatar || ''}
                  onChange={(e) => handleChange(selectedComponentId!, { avatar: e.target.value })}
                  placeholder="头像链接"
                />
                <input
                  type="text"
                  className="property-input"
                  value={selectedComponent.name || ''}
                  onChange={(e) => handleChange(selectedComponentId!, { name: e.target.value })}
                  placeholder="用户名"
                />
                <textarea
                  className="property-input min-h-[40px]"
                  value={selectedComponent.signature || ''}
                  onChange={(e) => handleChange(selectedComponentId!, { signature: e.target.value })}
                  placeholder="个性签名"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">MBTI</label>
                    <input
                      type="text"
                      className="property-input"
                      value={selectedComponent.mbti || ''}
                      onChange={(e) => handleChange(selectedComponentId!, { mbti: e.target.value })}
                      placeholder="INFP"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">血型</label>
                    <input
                      type="text"
                      className="property-input"
                      value={selectedComponent.bloodType || ''}
                      onChange={(e) => handleChange(selectedComponentId!, { bloodType: e.target.value })}
                      placeholder="A"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">星座</label>
                    <input
                      type="text"
                      className="property-input"
                      value={selectedComponent.zodiac || ''}
                      onChange={(e) => handleChange(selectedComponentId!, { zodiac: e.target.value })}
                      placeholder="白羊座"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">年龄</label>
                    <input
                      type="text"
                      className="property-input"
                      value={selectedComponent.age || ''}
                      onChange={(e) => handleChange(selectedComponentId!, { age: e.target.value })}
                      placeholder="18"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedComponent.showGlow ?? true}
                      onChange={(e) => handleChange(selectedComponentId!, { showGlow: e.target.checked })}
                    />
                    <span className="text-xs">头像光晕动画</span>
                  </label>
                </div>
                <div className="mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedComponent.signatureTypewriter ?? true}
                      onChange={(e) => handleChange(selectedComponentId!, { signatureTypewriter: e.target.checked })}
                    />
                    <span className="text-xs">签名打字机效果</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {selectedComponent.type === 'media-list' && (
            <div className="property-group">
              <div className="property-label">书影音清单</div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400">标题</label>
                  <input
                    type="text"
                    className="property-input"
                    value={selectedComponent.title || ''}
                    onChange={(e) => handleChange(selectedComponentId!, { title: e.target.value })}
                    placeholder="我喜欢的动画"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">类型</label>
                    <select
                      className="property-input"
                      value={selectedComponent.mediaType || 'anime'}
                      onChange={(e) => handleChange(selectedComponentId!, { mediaType: e.target.value as any })}
                    >
                      <option value="anime">🎬 动画</option>
                      <option value="game">🎮 游戏</option>
                      <option value="music">🎵 音乐</option>
                      <option value="book">📚 书籍</option>
                      <option value="movie">🎥 电影</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">布局</label>
                    <select
                      className="property-input"
                      value={selectedComponent.variant || 'grid'}
                      onChange={(e) => handleChange(selectedComponentId!, { variant: e.target.value as any })}
                    >
                      <option value="grid">网格</option>
                      <option value="list">列表</option>
                      <option value="carousel">横滑</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">列数（网格模式）</label>
                  <input
                    type="number"
                    className="property-input"
                    value={selectedComponent.columns || 3}
                    onChange={(e) => handleChange(selectedComponentId!, { columns: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="mt-2 space-y-2">
                  {selectedComponent.items?.map((item, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded space-y-1">
                      <input
                        type="text"
                        className="property-input"
                        value={item.title}
                        onChange={(e) => {
                          const items = [...selectedComponent.items]
                          items[i] = { ...items[i], title: e.target.value }
                          handleChange(selectedComponentId!, { items })
                        }}
                        placeholder="标题"
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          className="property-input"
                          value={item.platform || ''}
                          onChange={(e) => {
                            const items = [...selectedComponent.items]
                            items[i] = { ...items[i], platform: e.target.value }
                            handleChange(selectedComponentId!, { items })
                          }}
                          placeholder="平台（B站）"
                        />
                        <input
                          type="number"
                          className="property-input"
                          value={item.rating || ''}
                          onChange={(e) => {
                            const items = [...selectedComponent.items]
                            items[i] = { ...items[i], rating: parseFloat(e.target.value) || undefined }
                            handleChange(selectedComponentId!, { items })
                          }}
                          placeholder="评分（1-5）"
                        />
                      </div>
                      <input
                        type="text"
                        className="property-input"
                        value={item.cover || ''}
                        onChange={(e) => {
                          const items = [...selectedComponent.items]
                          items[i] = { ...items[i], cover: e.target.value }
                          handleChange(selectedComponentId!, { items })
                        }}
                        placeholder="封面链接"
                      />
                      <input
                        type="text"
                        className="property-input"
                        value={item.comment || ''}
                        onChange={(e) => {
                          const items = [...selectedComponent.items]
                          items[i] = { ...items[i], comment: e.target.value }
                          handleChange(selectedComponentId!, { items })
                        }}
                        placeholder="简评"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => handleChange(selectedComponentId!, { 
                      items: [...(selectedComponent.items || []), { title: '' }] 
                    })}
                    className="w-full py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    + 添加条目
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 text-sm text-gray-400 text-center">
          选择一个组件来编辑属性
        </div>
      )}
    </div>
  )
}

export default PropertyPanel