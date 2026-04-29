import html2canvas from 'html2canvas'
import { PageConfig, ComponentInstance, THEME_COLORS, ThemeId } from '@/types'

// 导出分辨率选项
export type ExportResolution = '1x' | '2x' | '3x'

// 导出为 JSON
export function exportToJson(page: PageConfig): void {
  const json = JSON.stringify(page, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${page.title || 'page'}_${Date.now()}.json`
  a.click()
  
  URL.revokeObjectURL(url)
}

// 导出为 JPG（支持多分辨率）
// 🟡 5: html2canvas 导出质量优化
export async function exportToJpg(
  canvasElement: HTMLElement, 
  filename: string,
  resolution: ExportResolution = '2x'
): Promise<void> {
  const scale = resolution === '1x' ? 1 : resolution === '2x' ? 2 : 3
  
  try {
    const canvas = await html2canvas(canvasElement, {
      scale, // 🟡 5: scale 设置为 3x
      useCORS: true, // 🟡 5: useCORS: true
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      // 处理 CSS 动画
      onclone: (clonedDoc) => {
        // 停止所有动画，确保静态状态
        const clonedCanvas = clonedDoc.querySelector('.editor-canvas') as HTMLElement | null
        if (clonedCanvas) {
          // 移除动画类
          clonedCanvas.querySelectorAll<HTMLElement>('[style*="animation"]').forEach((el) => {
            el.style.animation = 'none'
          })
        }
      },
    })
    
    const url = canvas.toDataURL('image/jpeg', 0.95) // 🟡 5: 提高质量到 0.95
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${resolution}.jpg`
    a.click()
  } catch (e) {
    console.error('Export to JPG failed:', e)
    throw e
  }
}

// 导出为 PNG（支持多分辨率，保留透明度）
// 🟡 5: html2canvas 导出质量优化
export async function exportToPng(
  canvasElement: HTMLElement, 
  filename: string,
  resolution: ExportResolution = '2x'
): Promise<void> {
  const scale = resolution === '1x' ? 1 : resolution === '2x' ? 2 : 3
  
  try {
    const canvas = await html2canvas(canvasElement, {
      scale, // 🟡 5: scale 设置为 3x
      useCORS: true, // 🟡 5: useCORS: true
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedCanvas = clonedDoc.querySelector('.editor-canvas') as HTMLElement | null
        if (clonedCanvas) {
          clonedCanvas.querySelectorAll<HTMLElement>('[style*="animation"]').forEach((el) => {
            el.style.animation = 'none'
          })
        }
      },
    })
    
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${resolution}.png`
    a.click()
  } catch (e) {
    console.error('Export to PNG failed:', e)
    throw e
  }
}

// 生成组件 HTML（完整实现）
function generateComponentHtml(comp: ComponentInstance, themeColors: typeof THEME_COLORS[ThemeId]): string {
  const basePosition = `position:absolute;left:${comp.x}px;top:${comp.y}px;width:${comp.width}px;height:${comp.height}px;z-index:${comp.zIndex};`
  
  switch (comp.type) {
    case 'text': {
      const fontSize = comp.fontSize || 14
      const fontWeight = comp.fontWeight || 'normal'
      const textAlign = comp.textAlign || 'left'
      const color = comp.color || themeColors.text
      const letterSpacing = comp.letterSpacing || 0
      return `<div style="${basePosition}font-size:${fontSize}px;font-weight:${fontWeight};text-align:${textAlign};color:${color};letter-spacing:${letterSpacing}px;padding:8px;line-height:1.5;">${escapeHtml(comp.content)}</div>`
    }
    
    case 'image': {
      const objectFit = comp.objectFit || 'cover'
      const borderRadius = comp.borderRadius || 0
      const filterStyle = comp.filter && comp.filter !== 'none' 
        ? `filter:${comp.filter === 'brightness' ? 'brightness(0.85)' : comp.filter === 'saturate' ? 'saturate(0.8)' : comp.filter === 'blur' ? 'blur(2px)' : ''};` 
        : ''
      return comp.src 
        ? `<img src="${comp.src}" alt="${escapeHtml(comp.alt || '')}" style="${basePosition}object-fit:${objectFit};border-radius:${borderRadius}px;${filterStyle}" />`
        : `<div style="${basePosition}background:#F5F5F5;border-radius:${borderRadius}px;display:flex;align-items:center;justify-content:center;color:#AAA;font-size:12px;">图片占位</div>`
    }
    
    case 'avatar': {
      const borderWidth = comp.borderWidth || 3
      const glowAnimation = comp.showGlow 
        ? `animation:avatarGlow 3s ease-in-out infinite;box-shadow:0 2px 8px rgba(0,0,0,0.15),0 0 0 0 rgba(0,0,0,0);` 
        : 'box-shadow:0 2px 8px rgba(0,0,0,0.15);'
      return comp.src 
        ? `<div style="${basePosition}border-radius:50%;overflow:hidden;border:${borderWidth}px solid white;${glowAnimation}"><img src="${comp.src}" style="width:100%;height:100%;object-fit:cover;" /></div>`
        : `<div style="${basePosition}border-radius:50%;background:#F5F5F5;display:flex;align-items:center;justify-content:center;font-size:24px;border:${borderWidth}px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);">👤</div>`
    }
    
    case 'container': {
      const bg = typeof comp.background === 'string' 
        ? comp.background 
        : comp.background?.type === 'gradient' 
          ? `linear-gradient(${comp.background.colors?.join(',') || '135deg, #FFF, #FFF'})` 
          : '#FFFFFF'
      const borderRadius = comp.borderRadius || 8
      const borderColor = comp.borderColor || '#EEE'
      return `<div style="${basePosition}background:${bg};border-radius:${borderRadius}px;border:1px solid ${borderColor};overflow:hidden;"></div>`
    }
    
    case 'tag-group': {
      const gap = comp.gap || 4
      const hoverColor = comp.hoverColor || themeColors.primary
      const tagsHtml = comp.tags.map(tag => 
        `<span class="heya-tag" style="display:inline-block;border-radius:9999px;padding:2px 7px;background:#F5F5F5;font-size:9px;margin:2px;transition:all 0.15s ease;" data-hover-color="${hoverColor}">${escapeHtml(tag)}</span>`
      ).join('')
      return `<div style="${basePosition}padding:8px;display:flex;flex-wrap:wrap;gap:${gap}px;">${tagsHtml}</div>`
    }
    
    case 'social-links': {
      const iconSize = comp.iconSize || 24
      const layout = comp.layout || 'horizontal'
      const layoutStyle = layout === 'vertical' ? 'flex-direction:column;' : layout === 'grid' ? 'display:grid;grid-template-columns:repeat(4,1fr);' : ''
      const linksHtml = comp.links.map(link => {
        const iconEmoji = getSocialIconEmoji(link.platform)
        return `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" style="width:${iconSize}px;height:${iconSize}px;border-radius:50%;background:#F5F5F5;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:background 0.15s ease;" title="${link.platform}" data-hover-color="${themeColors.primary}"><span style="font-size:${iconSize * 0.5}px;">${iconEmoji}</span></a>`
      }).join('')
      return `<div style="${basePosition}padding:8px;display:flex;${layoutStyle}gap:8px;">${linksHtml}</div>`
    }
    
    case 'oshi-card': {
      const columns = comp.columns || 4
      const charsHtml = comp.characters.map(char => {
        return `<div class="heya-oshi-card" style="padding:5px;background:linear-gradient(135deg,rgba(242,167,179,0.06),rgba(180,167,214,0.06));border-radius:5px;text-align:center;transition:transform 0.2s;">
          ${char.image ? `<img src="${char.image}" alt="${escapeHtml(char.name)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;margin-bottom:4px;" />` : ''}
          <div style="font-size:10px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(char.name)}</div>
          <div style="font-size:8px;color:#AAA;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(char.from)}</div>
        </div>`
      }).join('')
      return `<div style="${basePosition}padding:8px;display:grid;grid-template-columns:repeat(${columns},1fr);gap:4px;">${charsHtml}</div>`
    }
    
    case 'attribute-wall': {
      const attrsHtml = comp.attributes.map(attr => {
        return `<div style="display:flex;gap:6px;font-size:10px;padding:4px 0;">
          <span style="color:#BBB;min-width:40px;">${escapeHtml(attr.label)}</span>
          <span style="color:${themeColors.text};">${escapeHtml(attr.value)}</span>
        </div>`
      }).join('')
      return `<div style="${basePosition}padding:8px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">${attrsHtml}</div>`
    }
    
    case 'friends-list': {
      const friendsHtml = comp.friends.map(friend => {
        const friendColor = friend.color || '#F5F5F5'
        return `<div class="heya-friend" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;" data-intro="${escapeHtml(friend.intro || '')}">
          <div style="width:32px;height:32px;border-radius:50%;background:${friendColor};display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #EEE;">
            ${friend.avatar ? `<img src="${friend.avatar}" style="width:100%;height:100%;object-fit:cover;" />` : '<span style="font-size:14px;">😊</span>'}
          </div>
          <span style="font-size:8px;margin-top:4px;max-width:48px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(friend.name)}</span>
        </div>`
      }).join('')
      return `<div style="${basePosition}padding:8px;display:flex;justify-content:space-around;flex-wrap:wrap;gap:8px;">${friendsHtml}</div>`
    }
    
    case 'music-player': {
      const song = comp.song
      const coverBg = song.cover ? `background-image:url('${song.cover}');background-size:cover;` : 'background:#F5F5F5;'
      return `<div style="${basePosition}padding:8px;display:flex;align-items:center;gap:8px;background:rgba(245,245,245,0.8);border-radius:8px;">
        <div style="width:40px;height:40px;border-radius:4px;${coverBg}display:flex;align-items:center;justify-content:center;">${song.cover ? '' : '🎵'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(song.name || '歌曲名称')}</div>
          <div style="font-size:8px;color:#AAA;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(song.artist || '歌手')}</div>
        </div>
        <div style="width:24px;height:24px;border-radius:50%;background:${themeColors.primary};display:flex;align-items:center;justify-content:center;color:white;cursor:pointer;" class="heya-music-play">▶</div>
      </div>`
    }
    
    case 'quote': {
      const fontSize = comp.fontSize || 12
      const typewriterAttr = comp.typewriterEffect ? 'data-typewriter="true"' : ''
      const cursorHtml = comp.typewriterEffect ? '<span class="heya-typewriter-cursor" style="animation:cursorBlink 0.8s infinite;">|</span>' : ''
      return `<div style="${basePosition}padding:8px;text-align:center;font-style:${comp.typewriterEffect ? 'normal' : 'italic'};">
        <div style="font-size:${fontSize}px;color:${themeColors.text};line-height:1.6;" ${typewriterAttr}>${escapeHtml(comp.text || '「引言内容」')}${cursorHtml}</div>
        ${comp.translation ? `<div style="font-size:8px;color:#AAA;margin-top:4px;">— ${escapeHtml(comp.translation)}</div>` : ''}
      </div>`
    }
    
    case 'divider': {
      const dividerColor = comp.color || '#DDD'
      if (comp.variant === 'line') {
        return `<div style="${basePosition}display:flex;align-items:center;justify-content:center;"><div style="width:80%;height:1px;background:${dividerColor};"></div></div>`
      } else if (comp.variant === 'stars') {
        return `<div style="${basePosition}display:flex;align-items:center;justify-content:center;color:${dividerColor};font-size:10px;letter-spacing:4px;">✦ ✦ ✦</div>`
      } else if (comp.variant === 'custom') {
        return `<div style="${basePosition}display:flex;align-items:center;justify-content:center;color:${dividerColor};font-size:10px;">☆ · ☆ · ☆</div>`
      } else {
        // dots variant (default)
        return `<div style="${basePosition}display:flex;align-items:center;justify-content:center;color:${dividerColor};font-size:10px;letter-spacing:2px;">☆ · ☆ · ☆</div>`
      }
    }
    
    case 'spacer': {
      return `<div style="${basePosition}background:transparent;"></div>`
    }
    
    case 'hero-section': {
      const glowAnimation = comp.showGlow 
        ? 'animation:avatarGlow 3s ease-in-out infinite;' 
        : ''
      const avatarHtml = comp.avatar 
        ? `<div style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:3px solid white;${glowAnimation}box-shadow:0 2px 8px rgba(0,0,0,0.15);"><img src="${comp.avatar}" style="width:100%;height:100%;object-fit:cover;" /></div>`
        : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#F5F5F5,#E5E5E5);display:flex;align-items:center;justify-content:center;font-size:24px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);">👤</div>`
      
      const attrs = [
        ...(comp.mbti ? [{ label: 'MBTI', value: comp.mbti }] : []),
        ...(comp.bloodType ? [{ label: '血型', value: comp.bloodType + '型' }] : []),
        ...(comp.zodiac ? [{ label: '星座', value: comp.zodiac }] : []),
        ...(comp.age ? [{ label: '年龄', value: comp.age }] : []),
        ...(comp.customAttributes || []),
      ]
      const attrsHtml = attrs.map(attr => 
        `<span style="display:inline-block;padding:2px 8px;background:${themeColors.primary}20;color:${themeColors.text};border:1px solid ${themeColors.primary}40;border-radius:9999px;font-size:10px;margin:2px;">${escapeHtml(attr.value)}</span>`
      ).join('')
      
      const bgGradient = comp.backgroundGradient || `linear-gradient(135deg, ${themeColors.secondary} 0%, rgba(255,255,255,0.8) 100%)`
      const bgImageStyle = comp.backgroundImage ? `background-image:url('${comp.backgroundImage}');background-size:cover;background-position:center;` : `background:${bgGradient};`
      
      const signatureHtml = comp.signatureTypewriter 
        ? `<div style="font-size:12px;margin-bottom:8px;opacity:0.8;" data-typewriter="true">${escapeHtml(comp.signature || '')}<span class="heya-typewriter-cursor" style="animation:cursorBlink 0.8s infinite;">|</span></div>`
        : `<div style="font-size:12px;margin-bottom:8px;opacity:0.8;">${escapeHtml(comp.signature || '')}</div>`
      
      return `<div style="${basePosition}${bgImageStyle}border-radius:8px;overflow:hidden;display:flex;align-items:center;gap:24px;padding:24px;">
        <div style="flex-shrink:0;">${avatarHtml}</div>
        <div style="flex:1;min-width:0;">
          <h1 style="font-size:20px;font-weight:bold;margin-bottom:4px;color:${themeColors.text};">${escapeHtml(comp.name || '用户名')}</h1>
          ${signatureHtml}
          <div style="display:flex;flex-wrap:wrap;gap:4px;">${attrsHtml}</div>
        </div>
        <div style="position:absolute;top:8px;right:8px;font-size:12px;opacity:0.3;">✨</div>
      </div>`
    }
    
    case 'media-list': {
      const mediaType = comp.mediaType || 'anime'
      const columns = comp.columns || 3
      const showRating = comp.showRating ?? true
      
      const itemsHtml = comp.items.map(item => {
        const ratingHtml = showRating && item.rating 
          ? `<div style="font-size:8px;color:${themeColors.primary};">${'★'.repeat(Math.floor(item.rating))}${item.rating % 1 >= 0.5 ? '☆' : ''}${'☆'.repeat(5 - Math.ceil(item.rating))}</div>`
          : ''
        const platformHtml = item.platform 
          ? `<span style="position:absolute;top:4px;right:4px;padding:2px 4px;background:#333;color:white;font-size:8px;border-radius:2px;">${escapeHtml(item.platform)}</span>`
          : ''
        
        return `<div style="position:relative;border-radius:6px;overflow:hidden;cursor:pointer;transition:transform 0.2s;" class="heya-media-item">
          <div style="aspect-ratio:1;background:linear-gradient(135deg,#F5F5F5,#E5E5E5);display:flex;align-items:center;justify-content:center;font-size:16px;color:#AAA;">
            ${item.cover ? `<img src="${item.cover}" style="width:100%;height:100%;object-fit:cover;" />` : (mediaType === 'anime' ? '🎬' : mediaType === 'game' ? '🎮' : mediaType === 'music' ? '🎵' : mediaType === 'book' ? '📚' : '🎥')}
            ${platformHtml}
          </div>
          <div style="padding:4px;background:white;">
            <div style="font-size:10px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.title)}</div>
            ${ratingHtml}
            ${item.comment ? `<div style="font-size:8px;color:#AAA;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${escapeHtml(item.comment)}</div>` : ''}
          </div>
        </div>`
      }).join('')
      
      const titleHtml = comp.title 
        ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;font-weight:500;color:${themeColors.text};"><span>${mediaType === 'anime' ? '🎬' : mediaType === 'game' ? '🎮' : mediaType === 'music' ? '🎵' : mediaType === 'book' ? '📚' : '🎥'}</span>${escapeHtml(comp.title)}</div>`
        : ''
      
      return `<div style="${basePosition}padding:8px;">${titleHtml}<div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px;">${itemsHtml}</div></div>`
    }
    
    default:
      return ''
  }
}

// HTML 转义
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

// 获取社交平台图标 emoji
function getSocialIconEmoji(platform: string): string {
  const icons: Record<string, string> = {
    bilibili: '📺',
    weibo: '📱',
    twitter: '🐦',
    pixiv: '🎨',
    youtube: '▶',
    lofter: '📝',
    steam: '🎮',
    github: '💻',
    discord: '💬',
    instagram: '📷',
    tiktok: '🎵',
    custom: '🔗',
  }
  return icons[platform] || '🔗'
}

// 导出为 HTML（完整版）
export function exportToHtml(page: PageConfig): void {
  const themeColors = THEME_COLORS[page.theme]
  const themeVars = Object.entries(themeColors)
    .map(([k, v]) => `--theme-${k}:${v};`)
    .join('\n    ')
  
  const componentsHtml = page.components
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(comp => generateComponentHtml(comp, themeColors))
    .join('\n    ')
  
  const backgroundStyle = page.background?.type === 'gradient' 
    ? `background:${page.background.value};` 
    : page.background?.type === 'solid' 
      ? `background:${page.background.value};` 
      : page.background?.type === 'image' 
        ? `background-image:url('${page.background.value}');background-size:cover;background-position:center;` 
        : `background:${themeColors.secondary};`
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    :root {
    ${themeVars}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans SC', 'Inter', system-ui, sans-serif;
      background: linear-gradient(135deg, rgba(242,167,179,0.03) 0%, rgba(180,167,214,0.03) 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    .heya-page {
      width: ${page.canvasWidth}px;
      max-width: 100%;
      height: ${page.canvasHeight}px;
      position: relative;
      overflow: hidden;
      border-radius: 10px;
      /* 🟡 4: CSS 前缀兼容 */
      -webkit-border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      -webkit-box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      ${backgroundStyle}
    }
    /* 标签 hover 效果 */
    .heya-tag:hover {
      background: var(--theme-primary);
      color: white;
    }
    /* 推し卡片 hover */
    .heya-oshi-card:hover {
      transform: translateY(-1px);
      /* 🟡 4: CSS 前缀兼容 */
      -webkit-transform: translateY(-1px);
      background: linear-gradient(135deg, rgba(242,167,179,0.12) 0%, rgba(180,167,214,0.12) 100%);
      background: -webkit-linear-gradient(135deg, rgba(242,167,179,0.12) 0%, rgba(180,167,214,0.12) 100%);
    }
    /* 友人帐 hover */
    .heya-friend:hover::after {
      content: attr(data-intro);
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 8px;
      white-space: nowrap;
      z-index: 10;
    }
    /* 头像光晕动画 */
    @keyframes avatarGlow {
      0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 0 0 rgba(0,0,0,0); }
      50% { box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 12px 3px var(--theme-primary); }
    }
    /* 🟡 4: CSS 前缀兼容 - Webkit keyframes */
    @-webkit-keyframes avatarGlow {
      0%, 100% { -webkit-box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 0 0 rgba(0,0,0,0); }
      50% { -webkit-box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 12px 3px var(--theme-primary); }
    }
    /* 打字机光标 */
    @keyframes cursorBlink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    /* 🟡 4: CSS 前缀兼容 */
    @-webkit-keyframes cursorBlink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    /* 社交链接 hover */
    a[data-hover-color]:hover {
      background: var(--theme-primary);
    }
    /* 响应式 */
    @media (max-width: 720px) {
      .heya-page {
        width: 100%;
        height: auto;
        min-height: ${page.canvasHeight}px;
      }
      body {
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="heya-page" data-theme="${page.theme}">
    ${componentsHtml}
  </div>
  <script>
    // 打字机效果
    document.querySelectorAll('[data-typewriter="true"]').forEach(el => {
      const text = el.textContent.replace('|', '');
      el.textContent = '';
      let i = 0;
      const cursor = el.querySelector('.heya-typewriter-cursor') || document.createElement('span');
      cursor.className = 'heya-typewriter-cursor';
      cursor.textContent = '|';
      cursor.style.animation = 'cursorBlink 0.8s infinite';
      const timer = setInterval(() => {
        if (i < text.length) {
          el.textContent = text.slice(0, i + 1);
          el.appendChild(cursor);
          i++;
        } else {
          clearInterval(timer);
        }
      }, 80);
    });
  </script>
</body>
</html>`
  
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${page.title || 'heya-page'}_${Date.now()}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// 从 LocalStorage 加载草稿
export function loadDraft(): PageConfig | null {
  try {
    const saved = localStorage.getItem('heya-page-draft')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Load draft failed:', e)
  }
  return null
}

// 清除草稿
export function clearDraft(): void {
  localStorage.removeItem('heya-page-draft')
}