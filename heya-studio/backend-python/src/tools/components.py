"""Component search tool with real data from JSON file.

Tier 2 改进项 #2: 替换 Mock 数据为真实数据源
- 从 data/components.json 加载组件定义
- 实现基于关键词的搜索（过滤匹配）
- 保留 mock 数据作为 fallback
"""

import json
import os
from typing import List, Optional
from pydantic import BaseModel, Field
from .base import BaseTool, ToolType, ToolPermission


class SearchComponentsInput(BaseModel):
    """Input for component search."""
    query: str = Field(..., description="Search query")
    category: Optional[str] = Field(None, description="Category filter")
    tags: Optional[List[str]] = Field(None, description="Tag filters")
    limit: int = Field(default=10, description="Max results")


class Component(BaseModel):
    """Component data."""
    id: str
    name: str
    type: str
    category: str
    tags: List[str]
    description: str
    preview_url: Optional[str] = None
    default_props: dict = {}


class SearchComponentsOutput(BaseModel):
    """Output for component search."""
    components: List[Component]
    total: int


# Mock component data - types must match frontend ComponentType
MOCK_COMPONENTS = [
    {
        "id": "hero-section",
        "name": "头部组件",
        "type": "hero-section",
        "category": "anime",
        "tags": ["avatar", "name", "signature", "attributes"],
        "description": "包含头像、名称、签名和属性的头部区域",
        "default_props": {"name": "用户名", "signature": "我的签名"}
    },
    {
        "id": "oshi-card",
        "name": "推し展示卡",
        "type": "oshi-card",
        "category": "anime",
        "tags": ["oshi", "推", "偶像", "角色"],
        "description": "展示你的推（偶像/角色）的卡片组件",
        "default_props": {"name": "推名", "fromWork": "来源作品"}
    },
    {
        "id": "attribute-wall",
        "name": "属性墙",
        "type": "attribute-wall",
        "category": "anime",
        "tags": ["mbti", "星座", "血型", "属性"],
        "description": "展示MBTI、星座、血型等属性的组件",
        "default_props": {"attributes": {"MBTI": "INFP"}}
    },
    {
        "id": "friends-list",
        "name": "友人帐",
        "type": "friends-list",
        "category": "anime",
        "tags": ["朋友", "社交", "链接"],
        "description": "展示朋友链接的列表组件",
        "default_props": {"friends": []}
    },
    {
        "id": "music-player",
        "name": "音乐播放器",
        "type": "music-player",
        "category": "anime",
        "tags": ["音乐", "播放器", "BGM"],
        "description": "展示正在播放的音乐的组件",
        "default_props": {"title": "正在播放...", "artist": "艺人"}
    },
    {
        "id": "tag-group",
        "name": "标签组",
        "type": "tag-group",
        "category": "anime",
        "tags": ["标签", "爱好", "关键词"],
        "description": "展示标签或关键词的组件",
        "default_props": {"tags": ["标签1", "标签2"]}
    },
    {
        "id": "social-links",
        "name": "社交链接",
        "type": "social-links",
        "category": "anime",
        "tags": ["社交", "链接", "平台"],
        "description": "展示社交媒体链接的组件",
        "default_props": {"links": [{"platform": "Twitter", "url": "#"}]}
    },
    {
        "id": "quote",
        "name": "特色引言",
        "type": "quote",
        "category": "anime",
        "tags": ["引言", "语录", "座右铭"],
        "description": "展示特色引言或座右铭的组件",
        "default_props": {"text": "这是我的座右铭"}
    },
    {
        "id": "media-list",
        "name": "书影音清单",
        "type": "media-list",
        "category": "anime",
        "tags": ["书籍", "电影", "音乐", "推荐"],
        "description": "展示书籍、电影、音乐推荐的列表",
        "default_props": {"items": []}
    },
    {
        "id": "avatar",
        "name": "头像",
        "type": "avatar",
        "category": "anime",
        "tags": ["头像", "头像框", "光晕"],
        "description": "带呼吸光晕效果的头像组件",
        "default_props": {"imageUrl": "", "size": 100}
    },
    {
        "id": "text",
        "name": "文本框",
        "type": "text",
        "category": "editor",
        "tags": ["文本", "段落", "内容"],
        "description": "普通文本框组件",
        "default_props": {"content": "这是一段文本"}
    },
    {
        "id": "image",
        "name": "图片",
        "type": "image",
        "category": "editor",
        "tags": ["图片", "图片展示"],
        "description": "图片展示组件",
        "default_props": {"imageUrl": "", "alt": "图片"}
    },
    {
        "id": "divider",
        "name": "分隔线",
        "type": "divider",
        "category": "editor",
        "tags": ["分隔", "分割"],
        "description": "分隔线组件",
        "default_props": {}
    },
    {
        "id": "spacer",
        "name": "间距块",
        "type": "spacer",
        "category": "editor",
        "tags": ["间距", "空白"],
        "description": "空白间距组件",
        "default_props": {"height": 20}
    },
    {
        "id": "container",
        "name": "容器",
        "type": "container",
        "category": "editor",
        "tags": ["容器", "布局"],
        "description": "容器组件，可包含其他组件",
        "default_props": {}
    },
    # ============ 新增组件 Mock 数据 ============
    {
        "id": "merchandise-card",
        "name": "谷子展示卡",
        "type": "merchandise-card",
        "category": "anime",
        "tags": ["谷子", "周边", "手办", "吧唧", "立牌", "收藏"],
        "description": "展示二次元谷子/周边收藏的卡片组件",
        "default_props": {
            "name": "阿尼亚手办",
            "imageUrl": "",
            "sourceWork": "SPY×FAMILY",
            "purchaseDate": "2024-01",
            "price": 580,
            "series": "Good Smile Company",
            "rarity": "普通版",
            "condition": "全新未拆",
            "notes": "最爱的谷子！"
        }
    },
    {
        "id": "guestbook",
        "name": "访客留言板",
        "type": "guestbook",
        "category": "anime",
        "tags": ["留言", "互动", "访客", "评论"],
        "description": "访客留言板组件，可以留言互动",
        "default_props": {
            "messages": []
        }
    },
    {
        "id": "watchlist",
        "name": "追番列表",
        "type": "watchlist",
        "category": "anime",
        "tags": ["追番", "番剧", "动漫", "Bangumi", "AniList"],
        "description": "展示追番状态的列表组件，支持观看状态分组",
        "default_props": {
            "items": []
        }
    },
    # ============ Phase 2 新增组件 Mock 数据 ============
    {
        "id": "gallery",
        "name": "创作画廊",
        "type": "gallery",
        "category": "anime",
        "tags": ["画廊", "创作", "图片", "作品", "展示"],
        "description": "展示创作作品的画廊组件，支持 grid/masonry/carousel 布局",
        "default_props": {
            "title": "我的创作",
            "images": [],
            "layout": "grid"
        }
    },
    {
        "id": "achievement-badges",
        "name": "成就徽章墙",
        "type": "achievement-badges",
        "category": "anime",
        "tags": ["徽章", "成就", "打卡", "漫展", "游戏"],
        "description": "展示漫展打卡、游戏成就、社群勋章等徽章",
        "default_props": {
            "title": "我的成就",
            "badges": []
        }
    },
    {
        "id": "memorial-calendar",
        "name": "纪念日日历",
        "type": "memorial-calendar",
        "category": "anime",
        "tags": ["日历", "纪念日", "生日", "出道", "倒计时"],
        "description": "展示推生日、出道纪念日等重要日期",
        "default_props": {
            "title": "重要纪念日",
            "events": []
        }
    },
    {
        "id": "cp-card",
        "name": "CP 展示卡",
        "type": "cp-card",
        "category": "anime",
        "tags": ["CP", "角色", "配对", "关系"],
        "description": "双角色并排展示，展示 CP 关系",
        "default_props": {
            "character1": {"name": "角色1", "imageUrl": ""},
            "character2": {"name": "角色2", "imageUrl": ""},
            "relationship": "CP",
            "sourceWork": "",
            "tags": []
        }
    },
    {
        "id": "media-card",
        "name": "书影音高级卡片",
        "type": "media-card",
        "category": "anime",
        "tags": ["书影音", "推荐", "评分", "番剧", "电影", "游戏"],
        "description": "仿 Bangumi 风格的精美卡片，评分星星 + 标签 + 简评",
        "default_props": {
            "title": "作品标题",
            "type": "anime",
            "coverUrl": "",
            "rating": 0,
            "review": "",
            "tags": []
        }
    },
    {
        "id": "support-record",
        "name": "应援记录",
        "type": "support-record",
        "category": "anime",
        "tags": ["应援", "漫展", "打卡", "时间线"],
        "description": "时间线样式展示应援/漫展记录",
        "default_props": {
            "title": "我的应援",
            "records": []
        }
    },
]


# Mock 谷子/周边数据
MOCK_MERCHANDISE_DATA = [
    {
        "id": "merch-1",
        "name": "阿尼亚·福杰 梦游仙境ver. Nendoroid",
        "imageUrl": "https://images.goodsmile.info/3/5772/5772_20240115174601.jpg",
        "sourceWork": "SPY\u00d7FAMILY 间谍过家家",
        "type": "手办",
        "purchaseDate": "2024-01-15",
        "price": 580,
        "series": "Good Smile Company",
        "rarity": "普通版",
        "condition": "全新未拆",
        "notes": "最喜欢的谷子！阿尼亚YYDS"
    },
    {
        "id": "merch-2",
        "name": "芙莉莲 普通ver. 吧唧",
        "imageUrl": "https://example.com/merch/frieren-badge.jpg",
        "sourceWork": "葬送的芙莉莲",
        "type": "吧唧",
        "purchaseDate": "2024-02-20",
        "price": 35,
        "series": "Animate限定",
        "rarity": "限定版",
        "condition": "品相完美",
        "notes": "芙莉莲太可爱了"
    },
    {
        "id": "merch-3",
        "name": "波奇酱 立牌",
        "imageUrl": "https://example.com/merch/bocchi-stand.jpg",
        "sourceWork": "孤独摇滚",
        "type": "立牌",
        "purchaseDate": "2024-03-10",
        "price": 120,
        "series": "POP UP PARADE",
        "rarity": "普通版",
        "condition": "轻微划痕",
        "notes": "社恐吉他手的灵魂共鸣"
    },
    {
        "id": "merch-4",
        "name": "进击的巨人 艾伦·耶格尔 色纸",
        "imageUrl": "https://example.com/merch/aot-shikishi.jpg",
        "sourceWork": "进击的巨人",
        "type": "色纸",
        "purchaseDate": "2023-12-25",
        "price": 88,
        "series": "动画官方",
        "rarity": "展会限定",
        "condition": "全新",
        "notes": "神作完结纪念"
    },
    {
        "id": "merch-5",
        "name": "鬼灭之刃 炭治郎 景品手办",
        "imageUrl": "https://example.com/merch/tanjiro-fig.jpg",
        "sourceWork": "鬼灭之刃",
        "type": "手办",
        "purchaseDate": "2023-08-15",
        "price": 180,
        "series": "SEGA景品",
        "rarity": "景品",
        "condition": "全新",
        "notes": "第一批入手的谷子"
    },
    {
        "id": "merch-6",
        "name": "辉夜大小姐 四宫辉夜 拼图吧唧套装",
        "imageUrl": "https://example.com/merch/kaguya-badges.jpg",
        "sourceWork": "辉夜大小姐想让我告白",
        "type": "吧唧套装",
        "purchaseDate": "2024-04-01",
        "price": 99,
        "series": "官方授权",
        "rarity": "拼图限定",
        "condition": "全新",
        "notes": "会长和辉夜都太可爱了"
    },
    {
        "id": "merch-7",
        "name": "宝可梦 皮卡丘 雨音挂件",
        "imageUrl": "https://example.com/merch/pikachu-keychain.jpg",
        "sourceWork": "宝可梦",
        "type": "挂件",
        "purchaseDate": "2022-06-18",
        "price": 28,
        "series": "Pokemon Center",
        "rarity": "官方限定",
        "condition": "轻微使用",
        "notes": "挂在包包上超级可爱"
    },
    {
        "id": "merch-8",
        "name": "莉可丽丝 锦木千束 Nendoroid",
        "imageUrl": "https://example.com/merch/chisato-nendoroid.jpg",
        "sourceWork": "莉可丽丝",
        "type": "手办",
        "purchaseDate": "2024-05-20",
        "price": 520,
        "series": "Good Smile Company",
        "rarity": "普通版",
        "condition": "全新未拆",
        "notes": "千束大人！"
    },
]


# ============ Phase 2 Mock 数据集合 ============

# Mock 画廊/创作图片数据
MOCK_GALLERY_DATA = [
    {
        "id": "gallery-1",
        "url": "https://example.com/gallery/art1.jpg",
        "caption": "阿尼亚同人图",
        "date": "2024-01-15",
        "tags": ["同人", "SPY\u00d7FAMILY", "阿尼亚"]
    },
    {
        "id": "gallery-2",
        "url": "https://example.com/gallery/art2.jpg",
        "caption": "芙莉莲夕阳场景",
        "date": "2024-02-20",
        "tags": ["场景", "葬送的芙莉莲"]
    },
    {
        "id": "gallery-3",
        "url": "https://example.com/gallery/art3.jpg",
        "caption": "波奇酱社恐日常",
        "date": "2024-03-10",
        "tags": ["同人", "孤独摇滚", "波奇"]
    },
    {
        "id": "gallery-4",
        "url": "https://example.com/gallery/art4.jpg",
        "caption": "原创OC 设定图",
        "date": "2024-04-01",
        "tags": ["原创", "OC", "设定"]
    },
    {
        "id": "gallery-5",
        "url": "https://example.com/gallery/art5.jpg",
        "caption": "CP 情头",
        "date": "2024-05-20",
        "tags": ["CP", "情头"]
    },
    {
        "id": "gallery-6",
        "url": "https://example.com/gallery/art6.jpg",
        "caption": "漫展现场摄影",
        "date": "2024-06-08",
        "tags": ["摄影", "漫展", "现场"]
    },
]

# Mock 成就徽章数据
MOCK_BADGES_DATA = [
    {
        "id": "badge-1",
        "name": "漫展打卡达人",
        "icon": "\ud83c\udf3f",
        "source": "CP29 上海",
        "date": "2024-05-02",
        "rarity": "common",
        "description": "连续打卡 3 场漫展"
    },
    {
        "id": "badge-2",
        "name": "谷子收藏家",
        "icon": "\ud83c\udf80",
        "source": "Heya Studio",
        "date": "2024-01-15",
        "rarity": "rare",
        "description": "收藏超过 50 个谷子"
    },
    {
        "id": "badge-3",
        "name": "追番大师",
        "icon": "\ud83d\udcfa",
        "source": "Bangumi",
        "date": "2024-03-01",
        "rarity": "epic",
        "description": "完成 100+ 部番剧"
    },
    {
        "id": "badge-4",
        "name": "创作者认证",
        "icon": "\ud83c\udfa8",
        "source": "Pixiv",
        "date": "2024-02-20",
        "rarity": "legendary",
        "description": "作品获赞 1000+"
    },
    {
        "id": "badge-5",
        "name": "社群活跃者",
        "icon": "\ud83d\udcac",
        "source": "Discord",
        "date": "2024-04-01",
        "rarity": "common",
        "description": "社群活跃度 Top 10%"
    },
    {
        "id": "badge-6",
        "name": "全勤观看",
        "icon": "\u2b50",
        "source": "Bilibili",
        "date": "2024-05-20",
        "rarity": "rare",
        "description": "连续签到 365 天"
    },
]

# Mock 纪念日数据
MOCK_MEMORIAL_DATA = [
    {
        "id": "event-1",
        "name": "阿尼亚生日",
        "date": "2024-10-25",
        "type": "birthday",
        "character": "阿尼亚·福杰",
        "sourceWork": "SPY\u00d7FAMILY"
    },
    {
        "id": "event-2",
        "name": "芙莉莲动画开播",
        "date": "2024-09-29",
        "type": "debut",
        "sourceWork": "葬送的芙莉莲"
    },
    {
        "id": "event-3",
        "name": "孤独摇滚完结",
        "date": "2024-03-18",
        "type": "anniversary",
        "sourceWork": "孤独摇滚"
    },
    {
        "id": "event-4",
        "name": "CP30 上海",
        "date": "2024-10-04",
        "type": "event",
        "location": "上海"
    },
    {
        "id": "event-5",
        "name": "自己的生日",
        "date": "2024-12-15",
        "type": "birthday",
        "isMe": True
    },
]

# Mock CP 卡片数据
MOCK_CP_DATA = [
    {
        "id": "cp-1",
        "character1": {
            "name": "黄昏",
            "imageUrl": "https://example.com/cp/twilight.jpg",
            "color": "#3B82F6"
        },
        "character2": {
            "name": "约尔",
            "imageUrl": "https://example.com/cp/yor.jpg",
            "color": "#EC4899"
        },
        "relationship": "夫妻",
        "sourceWork": "SPY\u00d7FAMILY",
        "tags": ["官方CP", "间谍过家家", "黄昏约尔"]
    },
    {
        "id": "cp-2",
        "character1": {
            "name": "芙莉莲",
            "imageUrl": "https://example.com/cp/frieren.jpg",
            "color": "#22C55E"
        },
        "character2": {
            "name": "辛美尔",
            "imageUrl": "https://example.com/cp/himmel.jpg",
            "color": "#F59E0B"
        },
        "relationship": "羁绊",
        "sourceWork": "葬送的芙莉莲",
        "tags": ["回忆", "辛美尔", "千年魔法师"]
    },
]

# Mock 书影音高级卡片数据
MOCK_MEDIA_CARD_DATA = [
    {
        "id": "media-card-1",
        "title": "葬送的芙莉莲",
        "type": "anime",
        "coverUrl": "https://example.com/media/frieren.jpg",
        "rating": 9.5,
        "review": "后劲太大了，看完后怅然若失",
        "tags": ["奇幻", "冒险", "治愈"]
    },
    {
        "id": "media-card-2",
        "title": "孤独摇滚",
        "type": "anime",
        "coverUrl": "https://example.com/media/bocchi.jpg",
        "rating": 9.0,
        "review": "社恐共鸣神作！波奇酱太可爱了",
        "tags": ["音乐", "日常", "搞笑"]
    },
    {
        "id": "media-card-3",
        "title": "塞尔达传说：王国之泪",
        "type": "game",
        "coverUrl": "https://example.com/media/zelda.jpg",
        "rating": 10,
        "review": "神作！玩了200+小时",
        "tags": ["开放世界", "冒险", "任天堂"]
    },
]

# Mock 应援记录数据
MOCK_SUPPORT_RECORD_DATA = [
    {
        "id": "support-1",
        "event": "CP29 上海",
        "date": "2024-05-02",
        "location": "上海世博展览馆",
        "notes": "第一次参加大型漫展，超开心！",
        "photoUrl": "https://example.com/support/cp29.jpg"
    },
    {
        "id": "support-2",
        "event": "芙莉莲线下观影会",
        "date": "2024-09-29",
        "location": "上海某影院",
        "notes": "和朋友一起看大结局，感动哭了",
        "photoUrl": "https://example.com/support/frieren-event.jpg"
    },
    {
        "id": "support-3",
        "event": "阿尼亚声优见面会",
        "date": "2024-10-25",
        "location": "东京",
        "notes": "种崎敦美桑太可爱了！",
        "photoUrl": "https://example.com/support/anya-event.jpg"
    },
]



def _load_components_data() -> List[dict]:
    """从 data/components.json 加载组件数据，失败时 fallback 到 MOCK_COMPONENTS。"""
    data_path = os.path.join(os.path.dirname(__file__), "data", "components.json")
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list) and len(data) > 0:
            return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    # Fallback to mock data
    return MOCK_COMPONENTS


# 加载真实数据（启动时加载一次）
_COMPONENTS_DATA: Optional[List[dict]] = None


def _get_components() -> List[dict]:
    """获取组件数据（懒加载 + 缓存）。"""
    global _COMPONENTS_DATA
    if _COMPONENTS_DATA is None:
        _COMPONENTS_DATA = _load_components_data()
    return _COMPONENTS_DATA


class SearchComponentsTool(BaseTool[SearchComponentsInput, SearchComponentsOutput]):
    """Tool for searching components.

    Tier 2: 使用 data/components.json 作为真实数据源，MOCK_COMPONENTS 作为 fallback。
    支持多关键词模糊搜索。
    """
    
    name = "search_components"
    description = "搜索可用组件"
    tool_type = ToolType.READ
    permission = ToolPermission.PUBLIC
    
    async def execute(self, input_data: SearchComponentsInput) -> SearchComponentsOutput:
        """Search components from real data source."""
        query = input_data.query.lower()
        category = input_data.category
        tags = input_data.tags or []
        components_data = _get_components()
        
        # 支持多关键词搜索（空格分隔）
        keywords = [kw.strip() for kw in query.split() if kw.strip()]
        if not keywords:
            keywords = [query]
        
        results = []
        for component in components_data:
            # Match by keywords (any keyword matches)
            matches_query = False
            for kw in keywords:
                if (kw in component.get("name", "").lower() or
                    kw in component.get("description", "").lower() or
                    kw in component.get("type", "").lower() or
                    any(kw in tag.lower() for tag in component.get("tags", []))):
                    matches_query = True
                    break
            
            if not matches_query:
                continue
            
            # Filter by category
            if category and component.get("category") != category:
                continue
            
            # Filter by tags
            if tags:
                if not all(tag in component.get("tags", []) for tag in tags):
                    continue
            
            results.append(Component(**component))
        
        # Limit results
        results = results[:input_data.limit]
        
        return SearchComponentsOutput(
            components=results,
            total=len(results)
        )
    
    def get_input_schema(self) -> type[SearchComponentsInput]:
        return SearchComponentsInput
    
    def get_output_schema(self) -> type[SearchComponentsOutput]:
        return SearchComponentsOutput