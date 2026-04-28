// 核心类型定义 - 二次元个人主页配置平台

// ============ 主题类型 ============

export type ThemeId = 'sakura' | 'lavender' | 'mint' | 'cream' | 'night' | 'pixel' | 'mono' | 'millennial'

export interface ThemeColors {
  primary: string
  secondary: string
  text: string
  accent: string
}

export const THEME_COLORS: Record<ThemeId, ThemeColors> = {
  sakura: { primary: '#F2A7B3', secondary: '#FFEEF2', text: '#2A2A2A', accent: '#E8909C' },
  lavender: { primary: '#B4A7D6', secondary: '#EDE8FF', text: '#2A2A2A', accent: '#9B8EC4' },
  mint: { primary: '#86EFAC', secondary: '#F0FFF4', text: '#2A2A2A', accent: '#6EE7B7' },
  cream: { primary: '#FDE68A', secondary: '#FFFBEB', text: '#2A2A2A', accent: '#FCD34D' },
  night: { primary: '#1E3A5F', secondary: '#0F172A', text: '#F2A7B3', accent: '#334155' },
  pixel: { primary: '#00FF41', secondary: '#000000', text: '#FFFFFF', accent: '#00CC33' },
  mono: { primary: '#000000', secondary: '#FFFFFF', text: '#888888', accent: '#333333' },
  millennial: { primary: '#FFB6C1', secondary: '#87CEEB', text: '#2A2A2A', accent: '#FF69B4' },
}

// ============ 组件类型 ============

export type ComponentType = 
  | 'container'     // 容器
  | 'text'          // 文本框
  | 'image'         // 图片
  | 'avatar'        // 头像（带呼吸光晕）
  | 'tag-group'     // 标签组
  | 'social-links'  // 社交链接
  | 'oshi-card'     // 推し展示卡
  | 'attribute-wall' // 属性墙（MBTI/星座/血型等）
  | 'friends-list'  // 友人帐
  | 'music-player'  // 音乐播放器
  | 'quote'         // 特色引言
  | 'divider'       // 分隔线
  | 'spacer'        // 间距块
  | 'hero-section'  // 头部组件（头像+名称+签名+属性）
  | 'media-list'    // 书影音清单
  // Phase 1 新增组件类型
  | 'merchandise-card' // 谷子/周边展示卡
  | 'guestbook'     // 访客留言板
  | 'watchlist'     // 追番列表
  // Phase 2 新增组件类型
  | 'gallery'       // 创作画廊
  | 'achievement-badges' // 成就徽章墙
  | 'memorial-calendar' // 纪念日日历
  | 'cp-card'       // CP 展示卡
  | 'media-card'    // 书影音高级卡片
  | 'support-record' // 应援记录

// ============ 组件实例 ============

export interface BaseComponentProps {
  id: string
  type: ComponentType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  locked?: boolean
  visible?: boolean
}

export interface TextComponentProps extends BaseComponentProps {
  type: 'text'
  content: string
  fontSize?: number
  fontWeight?: 'light' | 'normal' | 'medium' | 'semibold'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  letterSpacing?: number
}

export interface ImageComponentProps extends BaseComponentProps {
  type: 'image'
  src: string
  alt?: string
  objectFit?: 'cover' | 'contain' | 'fill'
  borderRadius?: number
  filter?: 'none' | 'brightness' | 'saturate' | 'blur'
}

export interface AvatarComponentProps extends BaseComponentProps {
  type: 'avatar'
  src: string
  alt?: string
  showGlow?: boolean  // 呼吸光晕动画
  glowColor?: string
  borderWidth?: number
}

export interface ContainerComponentProps extends BaseComponentProps {
  type: 'container'
  background?: string | { type: 'gradient'; colors: string[] }
  children?: string[]  // 子组件 ID 列表
  borderRadius?: number
  borderColor?: string
}

export interface TagGroupComponentProps extends BaseComponentProps {
  type: 'tag-group'
  tags: string[]
  variant?: 'default' | 'outlined' | 'filled'
  hoverColor?: string
  gap?: number
}

export interface SocialLinksComponentProps extends BaseComponentProps {
  type: 'social-links'
  links: SocialLink[]
  layout?: 'horizontal' | 'vertical' | 'grid'
  iconSize?: number
}

export interface SocialLink {
  platform: SocialPlatform
  url: string
  label?: string
}

export type SocialPlatform = 
  | 'bilibili' | 'weibo' | 'twitter' | 'pixiv' 
  | 'youtube' | 'lofter' | 'steam' | 'github'
  | 'discord' | 'instagram' | 'tiktok' | 'custom'

export interface OshiCardComponentProps extends BaseComponentProps {
  type: 'oshi-card'
  characters: OshiCharacter[]
  variant?: 'grid' | 'list' | 'carousel'
  columns?: number
}

export interface OshiCharacter {
  name: string
  from: string  // 作品/IP来源
  image?: string
  color?: string
}

export interface AttributeWallComponentProps extends BaseComponentProps {
  type: 'attribute-wall'
  attributes: UserAttribute[]
  variant?: 'grid' | 'list'
}

export interface UserAttribute {
  type: 'mbti' | 'blood' | 'zodiac' | 'age' | 'birthday' | 'height' | 'custom'
  label: string
  value: string
  icon?: string
}

export interface FriendsListComponentProps extends BaseComponentProps {
  type: 'friends-list'
  friends: Friend[]
  variant?: 'grid' | 'list'
}

export interface Friend {
  name: string
  avatar?: string
  intro?: string
  color?: string
}

export interface MusicPlayerComponentProps extends BaseComponentProps {
  type: 'music-player'
  song: {
    name: string
    artist: string
    cover?: string
    url?: string  // 可选播放链接
  }
  variant?: 'minimal' | 'full'
  autoplay?: boolean
}

export interface QuoteComponentProps extends BaseComponentProps {
  type: 'quote'
  text: string
  translation?: string
  typewriterEffect?: boolean
  fontSize?: number
}

export interface DividerComponentProps extends BaseComponentProps {
  type: 'divider'
  variant?: 'line' | 'dots' | 'stars' | 'custom'
  color?: string
}

export interface SpacerComponentProps extends BaseComponentProps {
  type: 'spacer'
  height: number
}

export interface HeroSectionComponentProps extends BaseComponentProps {
  type: 'hero-section'
  avatar?: string
  name: string
  signature?: string
  signatureTypewriter?: boolean
  mbti?: string
  bloodType?: string
  zodiac?: string
  age?: string
  customAttributes?: Array<{ label: string; value: string }>
  showGlow?: boolean
  glowColor?: string
  backgroundGradient?: string
  backgroundImage?: string
}

export interface MediaListComponentProps extends BaseComponentProps {
  type: 'media-list'
  items: MediaItem[]
  mediaType?: MediaType
  variant?: 'grid' | 'list' | 'carousel'
  columns?: number
  showRating?: boolean
  title?: string
}

export type MediaType = 'anime' | 'movie' | 'music' | 'game' | 'book'

export interface MediaItem {
  title: string
  platform?: string
  rating?: number
  cover?: string
  comment?: string
  link?: string
}

// ============ 新增组件 Props ============

export interface MerchandiseCardComponentProps extends BaseComponentProps {
  type: 'merchandise-card'
  name: string
  imageUrl?: string
  sourceWork?: string  // 来源作品/IP
  purchaseDate?: string
  price?: number
  series?: string  // 系列/品牌
  rarity?: string  // 稀有度：普通版/限定版/展会限定
  condition?: string  // 品相：全新未拆/品相完美/轻微划痕/轻微使用
  notes?: string  // 备注/感想
}

export interface GuestbookComponentProps extends BaseComponentProps {
  type: 'guestbook'
  messages: GuestbookMessage[]
  title?: string
  maxMessages?: number
}

export interface GuestbookMessage {
  id: string
  author: string
  avatar?: string
  content: string
  timestamp: string
  isOwnerReply?: boolean  // 是否为主人回复
  replyTo?: string  // 回复的留言ID
}

export interface WatchlistComponentProps extends BaseComponentProps {
  type: 'watchlist'
  items: WatchlistItem[]
  title?: string
  showScore?: boolean
  groupByStatus?: boolean  // 按状态分组显示
}

export interface WatchlistItem {
  title: string
  titleCn?: string  // 中文标题
  status: WatchStatus
  score?: number  // 评分 1-10
  tags?: string[]
  imageUrl?: string
  episodes?: number  // 总集数
  watchedEpisodes?: number  // 已看集数
  comment?: string  // 吐槽/评论
}

export type WatchStatus = 'watching' | 'completed' | 'dropped' | 'on_hold' | 'plan_to_watch'

// ============ Phase 2 组件 Props ============

export interface GalleryComponentProps extends BaseComponentProps {
  type: 'gallery'
  title?: string
  images: GalleryImage[]
  layout?: 'grid' | 'masonry' | 'carousel'  // 布局方式
  columns?: number  // 列数，默认 3
}

export interface GalleryImage {
  id: string
  url: string
  caption?: string
  date?: string
  tags?: string[]
}

export interface AchievementBadgesComponentProps extends BaseComponentProps {
  type: 'achievement-badges'
  title?: string
  badges: AchievementBadge[]
}

export interface AchievementBadge {
  id: string
  name: string
  icon?: string  // emoji 或图片 URL
  source?: string  // 来源：漫展/游戏/社群
  date?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'  // 稀有度
  description?: string
}

export interface MemorialCalendarComponentProps extends BaseComponentProps {
  type: 'memorial-calendar'
  title?: string
  events: MemorialEvent[]
  showCountdown?: boolean  // 显示倒计时
}

export interface MemorialEvent {
  id: string
  name: string
  date: string  // YYYY-MM-DD 格式
  type: 'birthday' | 'anniversary' | 'debut' | 'event'
  character?: string  // 角色名（生日类型）
  sourceWork?: string  // 来源作品
  location?: string  // 地点（事件类型）
  isMe?: boolean  // 是否为自己的生日
}

export interface CPCardComponentProps extends BaseComponentProps {
  type: 'cp-card'
  character1: CPCharacter
  character2: CPCharacter
  relationship?: string  // 关系描述：CP/夫妻/羁绊/挚友
  sourceWork?: string
  tags?: string[]
}

export interface CPCharacter {
  name: string
  imageUrl?: string
  color?: string  // 角色代表色
}

export interface MediaCardComponentProps extends BaseComponentProps {
  type: 'media-card'
  title: string
  mediaType: MediaType  // anime | movie | game | book | music
  coverUrl?: string
  rating?: number  // 0-10
  review?: string  // 一句话简评
  tags?: string[]
}

export interface SupportRecordComponentProps extends BaseComponentProps {
  type: 'support-record'
  title?: string
  records: SupportRecordItem[]
}

export interface SupportRecordItem {
  id: string
  event: string  // 活动名称
  date: string
  location?: string
  notes?: string
  photoUrl?: string
}

// ============ 组件实例联合类型 ============

export type ComponentInstance = 
  | TextComponentProps
  | ImageComponentProps
  | AvatarComponentProps
  | ContainerComponentProps
  | TagGroupComponentProps
  | SocialLinksComponentProps
  | OshiCardComponentProps
  | AttributeWallComponentProps
  | FriendsListComponentProps
  | MusicPlayerComponentProps
  | QuoteComponentProps
  | DividerComponentProps
  | SpacerComponentProps
  | HeroSectionComponentProps
  | MediaListComponentProps
  // Phase 1 新增组件
  | MerchandiseCardComponentProps
  | GuestbookComponentProps
  | WatchlistComponentProps
  // Phase 2 新增组件
  | GalleryComponentProps
  | AchievementBadgesComponentProps
  | MemorialCalendarComponentProps
  | CPCardComponentProps
  | MediaCardComponentProps
  | SupportRecordComponentProps

// ============ 页面配置 ============

export interface PageConfig {
  id: string
  title: string
  slug?: string
  theme: ThemeId
  canvasWidth: number  // 默认 680
  canvasHeight: number // 默认 900
  components: ComponentInstance[]
  background?: {
    type: 'solid' | 'gradient' | 'image'
    value: string
    overlay?: string
  }
  metadata?: {
    author?: string
    createdAt?: string
    updatedAt?: string
    description?: string
  }
}

// ============ 编辑器状态 ============

export interface EditorState {
  currentPage: PageConfig | null
  selectedComponentId: string | null
  hoveredComponentId: string | null
  isDragging: boolean
  isResizing: boolean
  zoom: number
  showGrid: boolean
  history: HistoryState
}

export interface HistoryState {
  past: PageConfig[]
  present: PageConfig
  future: PageConfig[]
}

// ============ UI 状态 ============

export interface UIState {
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  agentPanelOpen: boolean
  previewMode: boolean
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  activeTab: 'components' | 'templates' | 'assets'
}

// ============ 模板类型 ============

export interface Template {
  id: string
  name: string
  category: TemplateCategory
  thumbnail: string
  config: PageConfig
  isOfficial: boolean
  creatorId?: string
  useCount: number
}

export type TemplateCategory = 
  | 'sakura' | 'gothic' | 'pixel' | 'minimal' 
  | 'y2k' | 'vtuber' | 'oc' | 'creator'

// ============ 组件库定义 ============

export interface ComponentDefinition {
  type: ComponentType
  name: string
  icon: string
  category: 'layout' | 'content' | 'anime' | 'decor'
  defaultProps: Partial<ComponentInstance>
  description?: string
}

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  {
    type: 'container',
    name: '容器',
    icon: 'Square',
    category: 'layout',
    defaultProps: { type: 'container', width: 200, height: 100, background: '#FFFFFF' },
  },
  {
    type: 'text',
    name: '文本框',
    icon: 'Type',
    category: 'content',
    defaultProps: { type: 'text', width: 150, height: 40, content: '输入文本', fontSize: 14 },
  },
  {
    type: 'image',
    name: '图片',
    icon: 'Image',
    category: 'content',
    defaultProps: { type: 'image', width: 100, height: 100, src: '', objectFit: 'cover' },
  },
  {
    type: 'avatar',
    name: '头像',
    icon: 'User',
    category: 'anime',
    defaultProps: { type: 'avatar', width: 72, height: 72, src: '', showGlow: true },
  },
  {
    type: 'tag-group',
    name: '标签组',
    icon: 'Tags',
    category: 'content',
    defaultProps: { type: 'tag-group', width: 200, height: 60, tags: ['标签1', '标签2'] },
  },
  {
    type: 'social-links',
    name: '社交链接',
    icon: 'Link',
    category: 'content',
    defaultProps: { type: 'social-links', width: 200, height: 40, links: [] },
  },
  {
    type: 'oshi-card',
    name: '推し展示',
    icon: 'Heart',
    category: 'anime',
    defaultProps: { type: 'oshi-card', width: 200, height: 100, characters: [], variant: 'grid', columns: 4 },
  },
  {
    type: 'attribute-wall',
    name: '属性墙',
    icon: 'LayoutGrid',
    category: 'anime',
    defaultProps: { type: 'attribute-wall', width: 200, height: 80, attributes: [] },
  },
  {
    type: 'friends-list',
    name: '友人帐',
    icon: 'Users',
    category: 'anime',
    defaultProps: { type: 'friends-list', width: 200, height: 60, friends: [] },
  },
  {
    type: 'music-player',
    name: '音乐播放器',
    icon: 'Music',
    category: 'anime',
    defaultProps: { type: 'music-player', width: 180, height: 50, song: { name: '', artist: '' } },
  },
  {
    type: 'quote',
    name: '引言',
    icon: 'Quote',
    category: 'decor',
    defaultProps: { type: 'quote', width: 200, height: 40, text: '', typewriterEffect: true },
  },
  {
    type: 'divider',
    name: '分隔线',
    icon: 'Minus',
    category: 'decor',
    defaultProps: { type: 'divider', width: 200, height: 20, variant: 'dots' },
  },
  {
    type: 'spacer',
    name: '间距块',
    icon: 'Space',
    category: 'layout',
    defaultProps: { type: 'spacer', width: 200, height: 20 },
  },
  {
    type: 'hero-section',
    name: '头部组件',
    icon: 'User',
    category: 'anime',
    defaultProps: { type: 'hero-section', width: 680, height: 200, name: '用户名', showGlow: true },
    description: '一站式解决头像+名称+签名+属性',
  },
  {
    type: 'media-list',
    name: '书影音清单',
    icon: 'Film',
    category: 'anime',
    defaultProps: { type: 'media-list', width: 300, height: 150, items: [], mediaType: 'anime', variant: 'grid' },
    description: '展示喜欢的番剧/游戏/音乐',
  },
  // Phase 1 新增组件定义
  {
    type: 'merchandise-card',
    name: '谷子展示卡',
    icon: 'Package',
    category: 'anime',
    defaultProps: {
      type: 'merchandise-card',
      width: 320,
      height: 180,
      name: '我的谷子',
      sourceWork: '',
      condition: '全新',
    },
    description: '展示二次元谷子/周边收藏',
  },
  {
    type: 'guestbook',
    name: '访客留言板',
    icon: 'MessageSquare',
    category: 'anime',
    defaultProps: {
      type: 'guestbook',
      width: 680,
      height: 400,
      messages: [],
      title: '留言板',
    },
    description: '访客留言互动组件',
  },
  {
    type: 'watchlist',
    name: '追番列表',
    icon: 'Tv',
    category: 'anime',
    defaultProps: {
      type: 'watchlist',
      width: 680,
      height: 300,
      items: [],
      title: '我的追番',
      showScore: true,
      groupByStatus: true,
    },
    description: '展示追番状态列表，可导入 Bangumi 数据',
  },
  // Phase 2 新增组件定义
  {
    type: 'gallery',
    name: '创作画廊',
    icon: 'Images',
    category: 'anime',
    defaultProps: {
      type: 'gallery',
      width: 680,
      height: 400,
      title: '我的创作',
      images: [],
      layout: 'grid',
      columns: 3,
    },
    description: '展示创作作品，支持 grid/masonry/carousel 布局',
  },
  {
    type: 'achievement-badges',
    name: '成就徽章墙',
    icon: 'Award',
    category: 'anime',
    defaultProps: {
      type: 'achievement-badges',
      width: 680,
      height: 200,
      title: '我的成就',
      badges: [],
    },
    description: '展示漫展打卡、游戏成就、社群勋章',
  },
  {
    type: 'memorial-calendar',
    name: '纪念日日历',
    icon: 'Calendar',
    category: 'anime',
    defaultProps: {
      type: 'memorial-calendar',
      width: 680,
      height: 300,
      title: '重要纪念日',
      events: [],
      showCountdown: true,
    },
    description: '展示推生日、出道纪念日等',
  },
  {
    type: 'cp-card',
    name: 'CP 展示卡',
    icon: 'Heart',
    category: 'anime',
    defaultProps: {
      type: 'cp-card',
      width: 680,
      height: 200,
      character1: { name: '角色1', imageUrl: '' },
      character2: { name: '角色2', imageUrl: '' },
      relationship: 'CP',
      tags: [],
    },
    description: '双角色并排展示 CP 关系',
  },
  {
    type: 'media-card',
    name: '书影音高级卡片',
    icon: 'Star',
    category: 'anime',
    defaultProps: {
      type: 'media-card',
      width: 340,
      height: 200,
      title: '作品标题',
      mediaType: 'anime',
      rating: 0,
      review: '',
      tags: [],
    },
    description: '仿 Bangumi 风格精美卡片',
  },
  {
    type: 'support-record',
    name: '应援记录',
    icon: 'MapPin',
    category: 'anime',
    defaultProps: {
      type: 'support-record',
      width: 680,
      height: 400,
      title: '我的应援',
      records: [],
    },
    description: '时间线样式展示应援/漫展记录',
  },
]

// ============ 工具函数 ============

export function createComponent(type: ComponentType, id: string): ComponentInstance {
  const definition = COMPONENT_DEFINITIONS.find(d => d.type === type)
  if (!definition) {
    throw new Error(`Unknown component type: ${type}`)
  }
  
  return {
    id,
    x: 50,
    y: 50,
    zIndex: 1,
    visible: true,
    ...definition.defaultProps,
  } as ComponentInstance
}

export function generateId(): string {
  return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createDefaultPage(): PageConfig {
  return {
    id: generateId(),
    title: '未命名主页',
    theme: 'sakura',
    canvasWidth: 680,
    canvasHeight: 900,
    components: [],
    background: { type: 'gradient', value: 'linear-gradient(135deg, rgba(242,167,179,0.05) 0%, rgba(180,167,214,0.05) 100%)' },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }
}