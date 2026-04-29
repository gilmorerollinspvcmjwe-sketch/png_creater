import React, { useState } from 'react'
import { ThemeId } from '@/types'

interface GalleryImage {
  id: string
  url: string
  caption?: string
  date?: string
  tags?: string[]
}

interface GalleryProps {
  title?: string
  images: GalleryImage[]
  layout?: 'grid' | 'masonry' | 'carousel'
  columns?: number
  theme?: ThemeId
  width?: number
  height?: number
}

const Gallery: React.FC<GalleryProps> = ({
  title = '我的创作',
  images = [],
  layout = 'grid',
  columns = 3,
  theme: _theme = 'sakura',
  width = 680,
  height = 400,
}) => {
  const [hoveredImage, setHoveredImage] = useState<string | null>(null)
  // _theme reserved for future styling

  // 空状态
  if (images.length === 0) {
    return (
      <div 
        className="w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
        style={{ width, minHeight: height }}
      >
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <span>🎨</span>
            {title}
          </h2>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <span className="text-3xl mb-2">🖼️</span>
            <p className="text-sm">还没有添加作品</p>
          </div>
        </div>
      </div>
    )
  }

  // Grid 布局
  if (layout === 'grid') {
    return (
      <div 
        className="w-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
        style={{ width }}
      >
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <span>🎨</span>
            {title}
            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
              {images.length}
            </span>
          </h2>
        </div>
        <div 
          className="p-3 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
              onMouseEnter={() => setHoveredImage(image.id)}
              onMouseLeave={() => setHoveredImage(null)}
            >
              <img
                src={image.url}
                alt={image.caption || '作品'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Hover overlay */}
              {hoveredImage === image.id && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-2">
                  {image.caption && (
                    <p className="text-white text-xs font-medium truncate">{image.caption}</p>
                  )}
                  {image.date && (
                    <p className="text-white/70 text-xs">{image.date}</p>
                  )}
                  {image.tags && image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {image.tags.slice(0, 3).map((tag, i) => (
                        <span 
                          key={i}
                          className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Masonry 布局 (瀑布流)
  if (layout === 'masonry') {
    return (
      <div 
        className="w-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
        style={{ width }}
      >
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <span>🎨</span>
            {title}
            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
              {images.length}
            </span>
          </h2>
        </div>
        <div className="p-3 columns-3 gap-2">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`relative rounded-lg overflow-hidden cursor-pointer group mb-2 ${
                index % 3 === 0 ? 'aspect-square' : index % 3 === 1 ? 'aspect-[3/4]' : 'aspect-[4/3]'
              }`}
              onMouseEnter={() => setHoveredImage(image.id)}
              onMouseLeave={() => setHoveredImage(null)}
            >
              <img
                src={image.url}
                alt={image.caption || '作品'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {hoveredImage === image.id && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-2">
                  {image.caption && (
                    <p className="text-white text-xs font-medium truncate">{image.caption}</p>
                  )}
                  {image.date && (
                    <p className="text-white/70 text-xs">{image.date}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Carousel 布局
  return (
    <div 
      className="w-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
      style={{ width, minHeight: height }}
    >
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b border-gray-100">
        <h2 className="font-medium text-gray-900 flex items-center gap-2">
          <span>🎨</span>
          {title}
        </h2>
      </div>
      <div className="p-3 flex gap-3 overflow-x-auto">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative flex-shrink-0 w-48 h-48 rounded-lg overflow-hidden cursor-pointer group"
            onMouseEnter={() => setHoveredImage(image.id)}
            onMouseLeave={() => setHoveredImage(null)}
          >
            <img
              src={image.url}
              alt={image.caption || '作品'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {hoveredImage === image.id && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-2">
                {image.caption && (
                  <p className="text-white text-xs font-medium truncate">{image.caption}</p>
                )}
                {image.date && (
                  <p className="text-white/70 text-xs">{image.date}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Gallery