"""Page configuration models - must match frontend BackendPageConfig."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# Component types - must match frontend ComponentType
class ComponentType(str, Enum):
    """Component types supported by frontend."""
    CONTAINER = "container"
    TEXT = "text"
    IMAGE = "image"
    AVATAR = "avatar"
    TAG_GROUP = "tag-group"
    SOCIAL_LINKS = "social-links"
    OSHI_CARD = "oshi-card"
    ATTRIBUTE_WALL = "attribute-wall"
    FRIENDS_LIST = "friends-list"
    MUSIC_PLAYER = "music-player"
    QUOTE = "quote"
    DIVIDER = "divider"
    SPACER = "spacer"
    HERO_SECTION = "hero-section"
    MEDIA_LIST = "media-list"
    # Phase 1 新增组件类型
    MERCHANDISE_CARD = "merchandise-card"
    GUESTBOOK = "guestbook"
    WATCHLIST = "watchlist"
    # Phase 2 新增组件类型
    GALLERY = "gallery"
    ACHIEVEMENT_BADGES = "achievement-badges"
    MEMORIAL_CALENDAR = "memorial-calendar"
    CP_CARD = "cp-card"
    MEDIA_CARD = "media-card"
    SUPPORT_RECORD = "support-record"


# Theme IDs - must match frontend ThemeId
class ThemeId(str, Enum):
    """Theme IDs supported by frontend."""
    SAKURA = "sakura"
    LAVENDER = "lavender"
    MINT = "mint"
    CREAM = "cream"
    NIGHT = "night"
    PIXEL = "pixel"
    MONO = "mono"
    MILLENNIAL = "millennial"


class ComponentPosition(BaseModel):
    """Component position and size."""
    x: int = 0
    y: int = 0
    width: int = 100
    height: int = 100
    zIndex: Optional[int] = None


class BackendComponentConfig(BaseModel):
    """Component configuration - must match frontend BackendComponentConfig."""
    id: str
    type: str = Field(..., description="Must be one of ComponentType values")
    props: Optional[Dict[str, Any]] = None
    style: Optional[Dict[str, Any]] = None
    position: Optional[ComponentPosition] = None


class ThemeColors(BaseModel):
    """Theme color palette."""
    primary: Optional[str] = None
    secondary: Optional[str] = None
    accent: Optional[str] = None
    text: Optional[str] = None
    background: Optional[str] = None


class ThemeFonts(BaseModel):
    """Theme fonts."""
    heading: Optional[str] = None
    body: Optional[str] = None
    accent: Optional[str] = None


class ThemeConfig(BaseModel):
    """Theme configuration."""
    id: Optional[str] = Field(None, description="Must be one of ThemeId values")
    colors: Optional[ThemeColors] = None
    fonts: Optional[ThemeFonts] = None


class LayoutConfig(BaseModel):
    """Layout configuration."""
    type: Optional[str] = "single-column"
    width: Optional[int] = 680
    maxWidth: Optional[int] = None


class PageMetadata(BaseModel):
    """Page metadata."""
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None


class BackendPageConfig(BaseModel):
    """Page configuration - must match frontend BackendPageConfig exactly."""
    version: str = "1.0"
    metadata: Optional[PageMetadata] = None
    theme: Optional[ThemeConfig] = None
    layout: Optional[LayoutConfig] = None
    components: Optional[List[BackendComponentConfig]] = None


# Helper functions for creating common components
def create_hero_section(
    name: str,
    avatar_url: Optional[str] = None,
    signature: Optional[str] = None,
    attributes: Optional[Dict[str, str]] = None
) -> BackendComponentConfig:
    """Create a hero section component."""
    props = {
        "name": name,
        "signature": signature or "探索无限可能 ✨",
        "avatarUrl": avatar_url,
    }
    if attributes:
        props["attributes"] = attributes
    
    return BackendComponentConfig(
        id=f"hero-{name.lower().replace(' ', '-')}",
        type=ComponentType.HERO_SECTION.value,
        props=props,
        position=ComponentPosition(x=0, y=0, width=680, height=200)
    )


def create_oshi_card(
    name: str,
    from_work: Optional[str] = None,
    description: Optional[str] = None,
    image_url: Optional[str] = None
) -> BackendComponentConfig:
    """Create an oshi (推し) card component."""
    return BackendComponentConfig(
        id=f"oshi-{name.lower().replace(' ', '-')}",
        type=ComponentType.OSHI_CARD.value,
        props={
            "name": name,
            "fromWork": from_work,
            "description": description,
            "imageUrl": image_url,
        },
        position=ComponentPosition(x=0, y=200, width=340, height=200)
    )


def create_attribute_wall(
    mbti: Optional[str] = None,
    zodiac: Optional[str] = None,
    blood_type: Optional[str] = None,
    custom: Optional[Dict[str, str]] = None
) -> BackendComponentConfig:
    """Create an attribute wall component."""
    attributes = {}
    if mbti:
        attributes["MBTI"] = mbti
    if zodiac:
        attributes["星座"] = zodiac
    if blood_type:
        attributes["血型"] = blood_type
    if custom:
        attributes.update(custom)
    
    return BackendComponentConfig(
        id="attribute-wall",
        type=ComponentType.ATTRIBUTE_WALL.value,
        props={"attributes": attributes},
        position=ComponentPosition(x=340, y=200, width=340, height=200)
    )


def create_tag_group(
    tags: List[str],
    title: Optional[str] = None
) -> BackendComponentConfig:
    """Create a tag group component."""
    return BackendComponentConfig(
        id=f"tags-{title.lower().replace(' ', '-') if title else 'default'}",
        type=ComponentType.TAG_GROUP.value,
        props={
            "tags": tags,
            "title": title,
        },
        position=ComponentPosition(x=0, y=400, width=680, height=100)
    )


def create_music_player(
    title: Optional[str] = None,
    artist: Optional[str] = None,
    cover_url: Optional[str] = None
) -> BackendComponentConfig:
    """Create a music player component."""
    return BackendComponentConfig(
        id="music-player",
        type=ComponentType.MUSIC_PLAYER.value,
        props={
            "title": title or "正在播放...",
            "artist": artist,
            "coverUrl": cover_url,
        },
        position=ComponentPosition(x=0, y=500, width=680, height=120)
    )


def create_social_links(
    links: List[Dict[str, str]]
) -> BackendComponentConfig:
    """Create a social links component."""
    return BackendComponentConfig(
        id="social-links",
        type=ComponentType.SOCIAL_LINKS.value,
        props={"links": links},
        position=ComponentPosition(x=0, y=620, width=680, height=80)
    )


def create_quote(
    text: str,
    author: Optional[str] = None
) -> BackendComponentConfig:
    """Create a quote component."""
    return BackendComponentConfig(
        id=f"quote-{text[:20].lower().replace(' ', '-')}",
        type=ComponentType.QUOTE.value,
        props={
            "text": text,
            "author": author,
        },
        position=ComponentPosition(x=0, y=700, width=680, height=100)
    )


# ============ 新增组件辅助函数 ============

def create_merchandise_card(
    name: str,
    image_url: Optional[str] = None,
    source_work: Optional[str] = None,
    purchase_date: Optional[str] = None,
    price: Optional[float] = None,
    series: Optional[str] = None,
    rarity: Optional[str] = None,
    condition: Optional[str] = None,
    notes: Optional[str] = None
) -> BackendComponentConfig:
    """Create a merchandise card component (谷子/周边展示)."""
    return BackendComponentConfig(
        id=f"merch-{name.lower().replace(' ', '-')}",
        type=ComponentType.MERCHANDISE_CARD.value,
        props={
            "name": name,
            "imageUrl": image_url,
            "sourceWork": source_work,
            "purchaseDate": purchase_date,
            "price": price,
            "series": series,
            "rarity": rarity,
            "condition": condition,
            "notes": notes,
        },
        position=ComponentPosition(x=0, y=0, width=320, height=180)
    )


def create_guestbook(
    messages: Optional[List[Dict[str, Any]]] = None
) -> BackendComponentConfig:
    """Create a guestbook component (访客留言板)."""
    return BackendComponentConfig(
        id="guestbook",
        type=ComponentType.GUESTBOOK.value,
        props={
            "messages": messages or [],
        },
        position=ComponentPosition(x=0, y=0, width=680, height=400)
    )


def create_watchlist(
    items: Optional[List[Dict[str, Any]]] = None
) -> BackendComponentConfig:
    """Create a watchlist component (追番列表)."""
    return BackendComponentConfig(
        id="watchlist",
        type=ComponentType.WATCHLIST.value,
        props={
            "items": items or [],
        },
        position=ComponentPosition(x=0, y=0, width=680, height=300)
    )


# ============ Phase 2 组件辅助函数 ============

def create_gallery(
    title: Optional[str] = None,
    images: Optional[List[Dict[str, Any]]] = None,
    layout: Optional[str] = None
) -> BackendComponentConfig:
    """Create a gallery component (创作画廊)."""
    return BackendComponentConfig(
        id=f"gallery-{title.lower().replace(' ', '-') if title else 'default'}",
        type=ComponentType.GALLERY.value,
        props={
            "title": title or "我的创作",
            "images": images or [],
            "layout": layout or "grid",  # grid | masonry | carousel
        },
        position=ComponentPosition(x=0, y=0, width=680, height=400)
    )


def create_achievement_badges(
    title: Optional[str] = None,
    badges: Optional[List[Dict[str, Any]]] = None
) -> BackendComponentConfig:
    """Create an achievement badges component (成就徽章墙)."""
    return BackendComponentConfig(
        id=f"badges-{title.lower().replace(' ', '-') if title else 'default'}",
        type=ComponentType.ACHIEVEMENT_BADGES.value,
        props={
            "title": title or "我的成就",
            "badges": badges or [],
        },
        position=ComponentPosition(x=0, y=0, width=680, height=200)
    )


def create_memorial_calendar(
    title: Optional[str] = None,
    events: Optional[List[Dict[str, Any]]] = None
) -> BackendComponentConfig:
    """Create a memorial calendar component (日历/纪念日)."""
    return BackendComponentConfig(
        id=f"calendar-{title.lower().replace(' ', '-') if title else 'default'}",
        type=ComponentType.MEMORIAL_CALENDAR.value,
        props={
            "title": title or "重要纪念日",
            "events": events or [],
        },
        position=ComponentPosition(x=0, y=0, width=680, height=300)
    )


def create_cp_card(
    character1: Optional[Dict[str, str]] = None,
    character2: Optional[Dict[str, str]] = None,
    relationship: Optional[str] = None,
    source_work: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> BackendComponentConfig:
    """Create a CP card component (CP 展示卡)."""
    return BackendComponentConfig(
        id="cp-card",
        type=ComponentType.CP_CARD.value,
        props={
            "character1": character1 or {"name": "角色1", "imageUrl": ""},
            "character2": character2 or {"name": "角色2", "imageUrl": ""},
            "relationship": relationship or "CP",
            "sourceWork": source_work,
            "tags": tags or [],
        },
        position=ComponentPosition(x=0, y=0, width=680, height=200)
    )


def create_media_card(
    title: Optional[str] = None,
    media_type: Optional[str] = None,
    cover_url: Optional[str] = None,
    rating: Optional[float] = None,
    review: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> BackendComponentConfig:
    """Create a media card component (书影音高级卡片)."""
    return BackendComponentConfig(
        id=f"media-card-{title.lower().replace(' ', '-') if title else 'default'}",
        type=ComponentType.MEDIA_CARD.value,
        props={
            "title": title or "作品标题",
            "type": media_type or "anime",  # anime | movie | game | book | music
            "coverUrl": cover_url,
            "rating": rating or 0,  # 0-10
            "review": review,
            "tags": tags or [],
        },
        position=ComponentPosition(x=0, y=0, width=340, height=200)
    )


def create_support_record(
    title: Optional[str] = None,
    records: Optional[List[Dict[str, Any]]] = None
) -> BackendComponentConfig:
    """Create a support record component (应援记录)."""
    return BackendComponentConfig(
        id=f"support-{title.lower().replace(' ', '-') if title else 'default'}",
        type=ComponentType.SUPPORT_RECORD.value,
        props={
            "title": title or "我的应援",
            "records": records or [],
        },
        position=ComponentPosition(x=0, y=0, width=680, height=400)
    )


# Helper for creating a default page config
def create_default_page_config(
    theme_id: str = ThemeId.SAKURA.value,
    title: Optional[str] = None
) -> BackendPageConfig:
    """Create a default page configuration."""
    return BackendPageConfig(
        version="1.0",
        metadata=PageMetadata(
            title=title or "我的个人主页",
            description="Heya Studio 生成的个人主页"
        ),
        theme=ThemeConfig(
            id=theme_id,
            colors=ThemeColors(
                primary="#F2A7B3",
                secondary="#FFEEF2",
                accent="#E8D4E8",
                text="#2A2A2A",
                background="#FFF5F8"
            ),
            fonts=ThemeFonts(
                heading="Noto Sans SC",
                body="Noto Sans SC"
            )
        ),
        layout=LayoutConfig(
            type="single-column",
            width=680
        ),
        components=[
            create_hero_section(
                name="用户",
                signature="探索无限可能 ✨",
                attributes={"MBTI": "INFP", "星座": "双鱼座"}
            )
        ]
    )