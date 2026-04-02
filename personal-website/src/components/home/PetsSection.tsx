import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ASCII 宠物艺术图（来自 pet skill）- 带颜色
const PETS = [
  {
    name: '小鸭子',
    ascii: [
      '    ╭―――╮      ',
      '   (・ω・) ノ     ',
      '   /  >       ',
      '  ノ    |        ',
    ],
    color: '#FCD34D', // 黄色
    side: 'left',
    position: 'top',
  },
  {
    name: '小猫咪',
    ascii: [
      '   ╱\\_/\\       ',
      '  ( •ω• )      ',
      '  /  づ      ',
      ' (  ""  )       ',
    ],
    color: '#F472B6', // 粉色
    side: 'right',
    position: 'top',
  },
  {
    name: '小龙龙',
    ascii: [
      '   /^\\  /^\\    ',
      '  ( ･ω･ )      ',
      ' / \\___/ \\    ',
      '(  )     (  )  ',
    ],
    color: '#EF4444', // 红色
    side: 'left',
    position: 'middle',
  },
  {
    name: '幽灵酱',
    ascii: [
      '   .-"-.      ',
      '  / ･ω･ \\     ',
      ' |   _   |    ',
      '  \\  _  /    ',
    ],
    color: '#A78BFA', // 紫色
    side: 'right',
    position: 'middle',
  },
  {
    name: '小布丁',
    ascii: [
      '   ╭――――╮      ',
      '  (  ●  ●  )    ',
      '  (   ω   )     ',
      '   ╰――――╯      ',
    ],
    color: '#34D399', // 绿色
    side: 'left',
    position: 'bottom',
  },
  {
    name: '小兔子',
    ascii: [
      '   \\ /         ',
      '  (・ω・)      ',
      '  (  )       ',
      '  "" ""        ',
    ],
    color: '#60A5FA', // 蓝色
    side: 'right',
    position: 'bottom',
  },
]

const EASTER_EGG_MESSAGES = [
  '再给我一点 token 吧 🥺',
  '这个需求很简单对吧？🤪',
  '要不要来杯特调？🍸',
  '简历看完了吗？📝',
  'Hello World! 🐣',
  '我是 ASCII 宠物！✨',
]

// 挥手动画帧
const waveFrames = [
  ['    ╭―――╮      ', '   (・ω・) ノ     ', '   /  >       ', '  ノ    |        '],
  ['    ╭―――╮      ', '   (・ω・) ノ     ', '      >       ', '  /    |        '],
  ['    ╭―――╮      ', '   (・ω・) ノ     ', '   \\  >       ', '  ノ    |        '],
]

// 眨眼动画帧
const blinkFrames = [
  ['   ╱\\_/\\       ', '  ( •ω• )      ', '  /  づ      ', ' (  ""  )       '],
  ['   ╱\\_/\\       ', '  ( >ω< )      ', '  /  づ      ', ' (  ""  )       '],
]

// 小龙龙吐息动画
const dragonFrames = [
  ['   /^\\  /^\\    ', '  ( ･ω･ )      ', ' / \\___/ \\    ', '(  )     (  )  '],
  ['   /^\\  /^\\    ', '  ( ･ω･ )      ', ' / \\___/ \\    ', '(  )  ~  (  )  '],
  ['   /^\\  /^\\    ', '  ( ･ω･ )      ', ' / \\___/ \\    ', '( ~)     (~  ) '],
]

// 幽灵浮动动画
const ghostFrames = [
  ['   .-"-.      ', '  / ･ω･ \\     ', ' |   _   |    ', '  \\  _  /    '],
  ['   .-"-.      ', '  / ･ω･ \\     ', ' |  (_)  |    ', '  \\  _  /    '],
  ['   .-"-.      ', '  / ･ω･ \\     ', ' |   _   |    ', '  \\  _  /    '],
]

// 小布丁眨眼
const blobFrames = [
  ['   ╭――――╮      ', '  (  ●  ●  )    ', '  (   ω   )     ', '   ╰――――╯      '],
  ['   ╭――――╮      ', '  (  ●  ●  )    ', '  (   _   )     ', '   ╰――――╯      '],
]

// 小兔子耳朵动
const rabbitFrames = [
  ['   \\ /         ', '  (・ω・)      ', '  (  )       ', '  "" ""        '],
  ['   / \\         ', '  (・ω・)      ', '  (  )       ', '  "" ""        '],
  ['   \\ |         ', '  (・ω・)      ', '  (  )       ', '  "" ""        '],
]

const ALL_FRAMES = [waveFrames, blinkFrames, dragonFrames, ghostFrames, blobFrames, rabbitFrames]

export default function PetsSection() {
  const [activePet, setActivePet] = useState<number | null>(null)
  const [easterEgg, setEasterEgg] = useState('')
  const [frameIndex, setFrameIndex] = useState(0)

  // ASCII 帧动画循环
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % 3)
    }, 400) // 0.4 秒切换一帧，更流畅

    return () => clearInterval(interval)
  }, [])

  const handlePetClick = (index: number) => {
    if (activePet === index) {
      setActivePet(null)
      setEasterEgg('')
    } else {
      setActivePet(index)
      const msg = EASTER_EGG_MESSAGES[index % EASTER_EGG_MESSAGES.length]
      setEasterEgg(msg)
      setTimeout(() => {
        setActivePet(null)
        setEasterEgg('')
      }, 3000)
    }
  }

  // 固定位置 - 两侧空白区域
  const getPosition = (pet: typeof PETS[0]) => {
    const horizontal = pet.side === 'left' 
      ? { left: 'clamp(20px, 5%, 100px)' }
      : { right: 'clamp(20px, 5%, 100px)' }
    
    const vertical = {
      top: '12vh',
      middle: '45vh',
      bottom: '75vh',
    }

    return {
      ...horizontal,
      top: vertical[pet.position as 'top' | 'middle' | 'bottom'],
    }
  }

  return (
    <>
      {/* ASCII 宠物 - 固定在屏幕两侧，不跟随滚动 */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {PETS.map((pet, index) => {
          const frames = ALL_FRAMES[index]
          const asciiArt = frames[frameIndex] || pet.ascii

          return (
            <div
              key={index}
              className="absolute select-none pointer-events-auto"
              style={getPosition(pet)}
            >
              {/* ASCII 艺术 - 纯文本，无背景无框 */}
              <pre
                className="font-mono text-xs md:text-sm leading-none"
                style={{ 
                  color: pet.color,
                  backgroundColor: 'transparent',
                }}
              >
                {asciiArt.join('\n')}
              </pre>
            </div>
          )
        })}
      </div>
    </>
  )
}
