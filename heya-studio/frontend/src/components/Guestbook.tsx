import React, { useState } from 'react'
import { GuestbookComponentProps, GuestbookMessage } from '../types'

interface GuestbookProps {
  component: GuestbookComponentProps
  isPreview?: boolean
  onEdit?: (id: string) => void
  onAddMessage?: (content: string) => void
}

const formatDate = (timestamp: string) => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return timestamp
  }
}

export const Guestbook: React.FC<GuestbookProps> = ({
  component,
  isPreview = false,
  onEdit,
  onAddMessage,
}) => {
  const { id, messages, title = '留言板' } = component
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isPreview) return

    setIsSubmitting(true)
    if (onAddMessage) {
      await onAddMessage(newMessage.trim())
    }
    setNewMessage('')
    setIsSubmitting(false)
  }

  const handleClick = () => {
    if (!isPreview && onEdit) {
      onEdit(id)
    }
  }

  return (
    <div
      className={`rounded-xl overflow-hidden border border-gray-100 
        ${isPreview ? 'bg-gradient-to-br from-white to-gray-50' : 'bg-white cursor-pointer hover:shadow-md transition-shadow'}
        shadow-sm`}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b border-gray-100">
        <h2 className="font-medium text-gray-900 flex items-center gap-2">
          <span className="text-lg">💬</span>
          {title}
          {messages.length > 0 && (
            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
              {messages.length} 条留言
            </span>
          )}
        </h2>
      </div>

      {/* 留言列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl mb-2">🌸</span>
            <p className="text-sm">还没有人留言，快来抢沙发吧~</p>
          </div>
        ) : (
          messages.map((msg) => (
            <GuestbookMessageItem key={msg.id} message={msg} />
          ))
        )}
      </div>

      {/* 留言输入框（非预览模式） */}
      {!isPreview && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="留下你的足迹~"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm 
                focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200
                bg-white"
              maxLength={200}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 
                text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed
                hover:from-pink-500 hover:to-purple-500 transition-all"
            >
              发送
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

const GuestbookMessageItem: React.FC<{ message: GuestbookMessage }> = ({ message }) => {
  const { author, avatar, content, timestamp, isOwnerReply, replyTo } = message

  return (
    <div className={`relative ${isOwnerReply ? 'ml-8 bg-gradient-to-r from-pink-50 to-purple-50' : 'bg-gray-50'} rounded-lg p-3`}>
      {/* 头部和昵称 */}
      <div className="flex items-center gap-2 mb-2">
        {avatar ? (
          <img
            src={avatar}
            alt={author}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
            ${isOwnerReply ? 'bg-gradient-to-br from-pink-400 to-purple-400 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {author.charAt(0)}
          </div>
        )}
        <span className={`font-medium text-sm ${isOwnerReply ? 'text-purple-600' : 'text-gray-700'}`}>
          {isOwnerReply ? '✨ 主人' : author}
        </span>
        <span className="text-xs text-gray-400">
          {formatDate(timestamp)}
        </span>
      </div>

      {/* 留言内容 */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {content}
      </p>

      {/* 回复标记 */}
      {replyTo && (
        <div className="mt-1 text-xs text-gray-400">
          ↩ 回复留言
        </div>
      )}
    </div>
  )
}

export default Guestbook