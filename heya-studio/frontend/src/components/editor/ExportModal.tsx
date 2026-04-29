import React, { useState, useCallback, useEffect } from 'react'
import html2canvas from 'html2canvas'
import GIF from 'gif.js'
import { useEditorStore } from '@/stores'
import { 
  Download, 
  ImageIcon, 
  Film, 
  Share2, 
  X, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Settings,
  AlertTriangle
} from 'lucide-react'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  canvasRef: React.RefObject<HTMLDivElement | null>
}

type ExportMode = 'full' | 'selected' | 'poster' | 'gif'

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
}) => {
  const { currentPage, selectedComponentId } = useEditorStore()
  const [mode, setMode] = useState<ExportMode>('full')
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [gifSizeWarning, setGifSizeWarning] = useState<string | null>(null)
  
  // GIF 设置
  const [gifDuration, setGifDuration] = useState(3) // 秒
  const [gifFps, setGifFps] = useState(15)
  const [gifScale, setGifScale] = useState<'full' | 'half'>('full')
  
  // 海报设置
  const [posterTitle, setPosterTitle] = useState('')
  const [posterSubtitle, setPosterSubtitle] = useState('Heya Studio 生成的个人主页')
  
  // 同步海报标题
  useEffect(() => {
    if (currentPage?.title) {
      setPosterTitle(currentPage.title)
    }
  }, [currentPage?.title])
  
  // 检测页面是否有动画
  const hasAnimation = useCallback(() => {
    if (!canvasRef.current) return false
    const canvas = canvasRef.current
    // 检查 CSS 动画相关样式和类
    const animatedElements = canvas.querySelectorAll(`
      [style*="animation"],
      [class*="animate-"],
      [class*="motion-"],
      [class*="pulse"],
      [class*="spin"],
      [class*="ping"],
      [class*="bounce"],
      [class*="transition"]
    `)
    // 检查是否有粒子效果等
    const hasParticles = canvas.querySelector('[class*="particle"], [class*="glow"]')
    return animatedElements.length > 0 || hasParticles !== null
  }, [canvasRef])
  
  // 预估 GIF 文件大小
  const estimateGifSize = useCallback(() => {
    if (!canvasRef.current) return 0
    const canvas = canvasRef.current
    const width = canvas.offsetWidth * (gifScale === 'half' ? 0.5 : 1)
    const height = canvas.offsetHeight * (gifScale === 'half' ? 0.5 : 1)
    const totalFrames = gifFps * gifDuration
    // 粗略估算：每帧约为 width * height * 3 bytes (RGB) * 压缩率 0.3
    const estimatedBytes = width * height * 3 * totalFrames * 0.3
    return estimatedBytes / (1024 * 1024) // MB
  }, [canvasRef, gifDuration, gifFps, gifScale])
  
  // GIF 设置变化时检查文件大小
  useEffect(() => {
    if (mode === 'gif') {
      const estimatedSize = estimateGifSize()
      if (estimatedSize > 10) {
        setGifSizeWarning(`预估文件大小约 ${Math.round(estimatedSize)}MB，超过 10MB。建议降低帧率或时长，或选择 50% 缩放。`)
      } else if (estimatedSize > 5) {
        setGifSizeWarning(`预估文件大小约 ${Math.round(estimatedSize)}MB，文件较大。建议降低帧率或时长。`)
      } else {
        setGifSizeWarning(null)
      }
    }
  }, [mode, estimateGifSize])
  
  // PNG 导出 - 完整页面
  const exportFullPage = async () => {
    if (!canvasRef.current) {
      setError('画布未找到')
      return
    }
    
    setIsExporting(true)
    setProgress(10)
    setProgressText('正在准备画布...')
    setError(null)
    
    try {
      const canvas = canvasRef.current
      setProgress(20)
      setProgressText('正在生成图片...')
      
      const canvasImage = await html2canvas(canvas, {
        scale: 2, // 高清输出
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      })
      
      setProgress(80)
      setProgressText('正在保存...')
      
      // 下载
      const link = document.createElement('a')
      link.download = `${currentPage?.title || 'heya-studio'}-${Date.now()}.png`
      link.href = canvasImage.toDataURL('image/png')
      link.click()
      
      setProgress(100)
      setProgressText('导出完成！')
      setSuccess(true)
      
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
      
    } catch (err) {
      setError(`导出失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsExporting(false)
    }
  }
  
  // PNG 导出 - 选中区域
  const exportSelectedArea = async () => {
    if (!selectedComponentId) {
      setError('请先选择要导出的组件')
      return
    }
    
    if (!canvasRef.current) {
      setError('画布未找到')
      return
    }
    
    setIsExporting(true)
    setProgress(10)
    setProgressText('正在查找选中组件...')
    setError(null)
    
    try {
      // 找到选中的组件元素
      const selectedElement = canvasRef.current.querySelector(`[data-component-id="${selectedComponentId}"]`)
      if (!selectedElement) {
        setError('选中的组件未找到')
        return
      }
      
      setProgress(20)
      setProgressText('正在生成组件图片...')
      
      const canvasImage = await html2canvas(selectedElement as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      })
      
      setProgress(80)
      setProgressText('正在保存...')
      
      const link = document.createElement('a')
      link.download = `component-${selectedComponentId}-${Date.now()}.png`
      link.href = canvasImage.toDataURL('image/png')
      link.click()
      
      setProgress(100)
      setProgressText('导出完成！')
      setSuccess(true)
      
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
      
    } catch (err) {
      setError(`导出失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsExporting(false)
    }
  }
  
  // 分享海报生成
  const exportPoster = async () => {
    if (!canvasRef.current) {
      setError('画布未找到')
      return
    }
    
    setIsExporting(true)
    setProgress(10)
    setProgressText('正在创建海报布局...')
    setError(null)
    
    try {
      // 创建海报容器
      const posterContainer = document.createElement('div')
      posterContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        width: 720px;
        padding: 40px;
        background: linear-gradient(135deg, #FFF5F8 0%, #F2A7B3 50%, #E8D4E8 100%);
        font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      `
      
      // 标题区域
      const titleSection = document.createElement('div')
      titleSection.style.cssText = `
        text-align: center;
        margin-bottom: 30px;
      `
      titleSection.innerHTML = `
        <h1 style="font-size: 32px; color: #2A2A2A; margin-bottom: 10px; font-weight: 600;">${posterTitle || currentPage?.title || '我的主页'}</h1>
        <p style="font-size: 16px; color: #6B7280;">${posterSubtitle}</p>
      `
      posterContainer.appendChild(titleSection)
      
      // 画布预览区域
      setProgress(20)
      setProgressText('正在生成预览...')
      
      const canvasPreview = await html2canvas(canvasRef.current, {
        scale: 0.7,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      })
      
      const previewImg = document.createElement('img')
      previewImg.src = canvasPreview.toDataURL('image/png')
      previewImg.style.cssText = `
        width: 640px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        margin-bottom: 30px;
        display: block;
        margin-left: auto;
        margin-right: auto;
      `
      posterContainer.appendChild(previewImg)
      
      // 水印区域
      const watermarkSection = document.createElement('div')
      watermarkSection.style.cssText = `
        text-align: center;
        padding-top: 20px;
        border-top: 2px dashed rgba(242, 167, 179, 0.5);
      `
      const dateStr = new Date().toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      watermarkSection.innerHTML = `
        <p style="font-size: 16px; color: #9CA3AF; margin-bottom: 8px;">
          ✨ 由 <span style="color: #F2A7B3; font-weight: 600;">Heya Studio</span> 生成
        </p>
        <p style="font-size: 13px; color: #9CA3AF;">
          heyastudio.com · ${dateStr}
        </p>
      `
      posterContainer.appendChild(watermarkSection)
      
      // 添加到 DOM
      document.body.appendChild(posterContainer)
      
      // 等待图片加载
      setProgress(40)
      setProgressText('正在渲染海报...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setProgress(60)
      
      // 截取海报
      const posterCanvas = await html2canvas(posterContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      })
      
      // 移除临时容器
      document.body.removeChild(posterContainer)
      
      setProgress(80)
      setProgressText('正在保存海报...')
      
      // 下载
      const link = document.createElement('a')
      link.download = `poster-${currentPage?.title || 'heya-studio'}-${Date.now()}.png`
      link.href = posterCanvas.toDataURL('image/png')
      link.click()
      
      setProgress(100)
      setProgressText('海报导出完成！')
      setSuccess(true)
      
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
      
    } catch (err) {
      setError(`海报生成失败: ${err instanceof Error ? err.message : '未知错误'}`)
      // 清理临时元素
      const posterContainer = document.querySelector('div[style*="position: fixed"][style*="left: -9999px"]')
      if (posterContainer) {
        document.body.removeChild(posterContainer)
      }
    } finally {
      setIsExporting(false)
    }
  }
  
  // GIF 动态导出
  const exportGif = async () => {
    if (!canvasRef.current) {
      setError('画布未找到')
      return
    }
    
    // 检测是否有动画，如果没有则降级为 PNG
    const animationDetected = hasAnimation()
    if (!animationDetected) {
      setError('页面没有检测到动画效果，建议使用 PNG 导出。已自动切换到完整页面导出。')
      setTimeout(() => {
        setError(null)
        setMode('full')
        exportFullPage()
      }, 2000)
      return
    }
    
    setIsExporting(true)
    setProgress(0)
    setProgressText('正在初始化 GIF 编码器...')
    setError(null)
    
    try {
      const canvas = canvasRef.current
      const fps = gifFps
      const totalFrames = fps * gifDuration
      const frameDelay = 1000 / fps
      const scale = gifScale === 'half' ? 0.5 : 1
      const width = Math.round(canvas.offsetWidth * scale)
      const height = Math.round(canvas.offsetHeight * scale)
      
      // 创建 GIF 编码器
      const gif = new GIF({
        workers: 2,
        quality: 10, // 1-30, 越小质量越高
        width: width,
        height: height,
        workerScript: '/gif.worker.js', // 需要将 gif.worker.js 放到 public 目录
        background: '#FFFFFF',
        repeat: 0, // 0 = 无限循环
      })
      
      // 收集帧
      setProgressText(`正在捕获动画帧 (0/${totalFrames})...`)
      
      for (let i = 0; i < totalFrames; i++) {
        // 等待动画帧
        await new Promise(resolve => setTimeout(resolve, frameDelay))
        
        // 截取当前帧
        const frameCanvas = await html2canvas(canvas, {
          scale: scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF',
          logging: false,
          width: canvas.offsetWidth,
          height: canvas.offsetHeight,
        })
        
        // 添加帧到 GIF
        gif.addFrame(frameCanvas, { delay: Math.round(frameDelay), copy: true })
        
        // 更新进度
        const frameProgress = Math.round((i + 1) / totalFrames * 70)
        setProgress(frameProgress)
        setProgressText(`正在捕获动画帧 (${i + 1}/${totalFrames})...`)
      }
      
      setProgress(70)
      setProgressText('正在编码 GIF...')
      
      // 监听进度
      gif.on('progress', (p: number) => {
        const encodingProgress = 70 + Math.round(p * 25)
        setProgress(encodingProgress)
        setProgressText(`正在编码 GIF (${Math.round(p * 100)}%)...`)
      })
      
      // 监听完成
      gif.on('finished', (blob: Blob) => {
        setProgress(95)
        setProgressText('正在保存 GIF...')
        
        // 检查文件大小
        const fileSizeMB = blob.size / (1024 * 1024)
        if (fileSizeMB > 10) {
          setError(`GIF 文件大小为 ${Math.round(fileSizeMB)}MB，超过 10MB。建议降低帧率或时长后重新导出。`)
        }
        
        // 下载
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `${currentPage?.title || 'heya-studio'}-animation-${Date.now()}.gif`
        link.href = url
        link.click()
        
        // 清理
        URL.revokeObjectURL(url)
        
        setProgress(100)
        setProgressText('GIF 导出完成！')
        setSuccess(true)
        
        setTimeout(() => {
          setSuccess(false)
          setIsExporting(false)
          onClose()
        }, 1500)
      })
      
      // 开始渲染
      gif.render()
      
    } catch (err) {
      setError(`GIF 导出失败: ${err instanceof Error ? err.message : '未知错误'}`)
      setIsExporting(false)
    }
  }
  
  // 执行导出
  const handleExport = async () => {
    switch (mode) {
      case 'full':
        await exportFullPage()
        break
      case 'selected':
        await exportSelectedArea()
        break
      case 'poster':
        await exportPoster()
        break
      case 'gif':
        await exportGif()
        break
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-[560px] max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-pink-50 to-purple-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-pink-500" />
            导出页面
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white rounded-lg transition-colors"
            disabled={isExporting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 导出模式选择 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-3 block">导出模式</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('full')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'full' 
                    ? 'border-pink-400 bg-pink-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <ImageIcon className="w-6 h-6 mb-2 text-pink-500" />
                <div className="text-sm font-medium">完整页面</div>
                <div className="text-xs text-gray-500 mt-1">导出整个页面为 PNG</div>
              </button>
              
              <button
                onClick={() => setMode('selected')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'selected' 
                    ? 'border-pink-400 bg-pink-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                } ${!selectedComponentId ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!selectedComponentId}
              >
                <ImageIcon className={`w-6 h-6 mb-2 ${selectedComponentId ? 'text-pink-500' : 'text-gray-400'}`} />
                <div className="text-sm font-medium">选中区域</div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedComponentId ? '导出选中组件' : '请先选择组件'}
                </div>
              </button>
              
              <button
                onClick={() => setMode('poster')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'poster' 
                    ? 'border-pink-400 bg-pink-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <Share2 className="w-6 h-6 mb-2 text-purple-500" />
                <div className="text-sm font-medium">分享海报</div>
                <div className="text-xs text-gray-500 mt-1">生成带水印的分享图</div>
              </button>
              
              <button
                onClick={() => setMode('gif')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'gif' 
                    ? 'border-pink-400 bg-pink-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <Film className="w-6 h-6 mb-2 text-blue-500" />
                <div className="text-sm font-medium">动态 GIF</div>
                <div className="text-xs text-gray-500 mt-1">保留 CSS 动画效果</div>
              </button>
            </div>
          </div>
          
          {/* GIF 设置 */}
          {mode === 'gif' && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">GIF 动态导出设置</span>
              </div>
              
              {/* 文件大小警告 */}
              {gifSizeWarning && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg mb-3 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-amber-700">{gifSizeWarning}</span>
                </div>
              )}
              
              <div className="space-y-4">
                {/* 时长 */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">时长（秒）</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min="1"
                      max="10"
                      value={gifDuration}
                      onChange={(e) => setGifDuration(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-600 w-8">{gifDuration}s</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1秒</span>
                    <span>5秒</span>
                    <span>10秒</span>
                  </div>
                </div>
                
                {/* 帧率 */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">帧率（FPS）</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 30].map((fps) => (
                      <button
                        key={fps}
                        onClick={() => setGifFps(fps)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          gifFps === fps 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {fps} FPS
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {gifFps === 10 && '较小文件，适合简单动画'}
                    {gifFps === 15 && '推荐：平衡流畅度与文件大小'}
                    {gifFps === 20 && '流畅动画，文件较大'}
                    {gifFps === 30 && '高帧率，文件最大'}
                  </div>
                </div>
                
                {/* 尺寸 */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">输出尺寸</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGifScale('full')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        gifScale === 'full' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      原始尺寸
                    </button>
                    <button
                      onClick={() => setGifScale('half')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        gifScale === 'half' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      50% 缩放
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {gifScale === 'half' && '文件体积减少约 75%'}
                  </div>
                </div>
                
                {/* 提示 */}
                <div className="text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-100">
                  <strong>💡 提示：</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>GIF 会捕获页面的 CSS 动画效果</li>
                    <li>如果页面没有动画，将自动降级为 PNG 导出</li>
                    <li>导出时间取决于时长和帧率设置</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* 海报设置 */}
          {mode === 'poster' && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">海报设置</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">海报标题</label>
                  <input 
                    type="text"
                    value={posterTitle}
                    onChange={(e) => setPosterTitle(e.target.value)}
                    placeholder={currentPage?.title || '我的主页'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">副标题</label>
                  <input 
                    type="text"
                    value={posterSubtitle}
                    onChange={(e) => setPosterSubtitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
                  />
                </div>
                
                <div className="text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-100">
                  <strong>📷 海报包含：</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>自定义标题和副标题</li>
                    <li>页面核心内容预览</li>
                    <li>Heya Studio 水印和日期</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* 进度和状态 */}
          {isExporting && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                <span className="text-sm text-gray-700">{progressText}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-pink-400 to-purple-400 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2 text-right">{progress}%</div>
            </div>
          )}
          
          {/* 成功提示 */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl mb-4 border border-green-100 animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700 font-medium">导出成功！文件已开始下载</span>
            </div>
          )}
          
          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl mb-4 border border-red-100 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          
          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            disabled={isExporting || (mode === 'selected' && !selectedComponentId)}
            className={`w-full py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              isExporting || (mode === 'selected' && !selectedComponentId)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                开始导出
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal