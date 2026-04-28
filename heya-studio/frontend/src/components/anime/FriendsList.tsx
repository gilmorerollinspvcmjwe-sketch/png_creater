import React, { useState } from 'react'
import { Friend } from '@/types'

interface FriendsListProps {
  friends: Friend[]
  variant?: 'grid' | 'list'
}

const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  variant = 'grid',
}) => {
  const [hoveredFriend, setHoveredFriend] = useState<string | null>(null)

  if (friends.length === 0) {
    return (
      <div className="p-3 text-center text-gray-400 text-xs">
        添加好友到友人帐
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {friends.map((friend, i) => (
          <div 
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            onMouseEnter={() => setHoveredFriend(friend.name)}
            onMouseLeave={() => setHoveredFriend(null)}
          >
            {/* 头像 */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm"
              style={{ background: friend.color || '#F5F5F5' }}
            >
              {friend.avatar ? (
                <img 
                  src={friend.avatar} 
                  alt={friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg">😊</span>
              )}
            </div>
            
            {/* 昵称和介绍 */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{friend.name}</div>
              {hoveredFriend === friend.name && friend.intro && (
                <div className="text-xs text-gray-400 truncate mt-0.5 animate-fade-in">
                  {friend.intro}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Grid variant (默认)
  return (
    <div className="flex justify-around flex-wrap gap-2 p-2">
      {friends.map((friend, i) => (
        <div 
          key={i}
          className="flex flex-col items-center cursor-pointer group relative"
          onMouseEnter={() => setHoveredFriend(friend.name)}
          onMouseLeave={() => setHoveredFriend(null)}
        >
          {/* 头像 */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm transition-transform group-hover:scale-110"
            style={{ background: friend.color || '#F5F5F5' }}
          >
            {friend.avatar ? (
              <img 
                src={friend.avatar} 
                alt={friend.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg">😊</span>
            )}
          </div>
          
          {/* 昵称 */}
          <span className="text-xs mt-1 max-w-[56px] overflow-hidden text-overflow-ellipsis whitespace-nowrap text-center">
            {friend.name}
          </span>
          
          {/* Hover 显示介绍 */}
          {hoveredFriend === friend.name && friend.intro && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 animate-fade-in">
              {friend.intro}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default FriendsList