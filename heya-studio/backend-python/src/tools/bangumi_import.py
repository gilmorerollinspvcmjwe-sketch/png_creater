"""Bangumi/AniList data import tool with real data from JSON.

Tier 2 改进项 #2: 替换 Mock 数据为真实数据源
- 从 data/bangumi.json 加载番剧数据
- 实现按名称搜索功能
- 保留 MOCK_BANGUMI_DATA 作为 fallback
"""

import json
import os
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum
from .base import BaseTool, ToolType, ToolPermission


class WatchStatus(str, Enum):
    """Anime watch status."""
    WATCHING = "watching"
    COMPLETED = "completed"
    DROPPED = "dropped"
    ON_HOLD = "on_hold"
    PLAN_TO_WATCH = "plan_to_watch"


class AnimeItem(BaseModel):
    """Anime item in watchlist."""
    title: str = Field(..., description="番剧标题")
    title_cn: Optional[str] = Field(None, description="中文标题")
    status: WatchStatus = Field(default=WatchStatus.WATCHING, description="观看状态")
    score: Optional[int] = Field(None, ge=1, le=10, description="评分 1-10")
    tags: List[str] = Field(default_factory=list, description="标签")
    image_url: Optional[str] = Field(None, description="封面图URL")
    episodes: Optional[int] = Field(None, description="总集数")
    watched_episodes: Optional[int] = Field(None, description="已看集数")
    start_date: Optional[str] = Field(None, description="开始看日期")
    finish_date: Optional[str] = Field(None, description="看完日期")
    comment: Optional[str] = Field(None, description="吐槽/评论")


class ImportBangumiWatchlistInput(BaseModel):
    """Input for importing Bangumi watchlist."""
    username: str = Field(..., description="Bangumi 用户名")
    limit: int = Field(default=20, description="最大导入数量")


class ImportBangumiWatchlistOutput(BaseModel):
    """Output for importing Bangumi watchlist."""
    username: str
    items: List[AnimeItem]
    total: int
    source: str = "bangumi"


# Mock Bangumi 番剧数据
MOCK_BANGUMI_DATA: List[dict] = [
    {
        "title": "SPY×FAMILY",
        "title_cn": "间谍过家家",
        "status": "completed",
        "score": 9,
        "tags": ["喜剧", "动作", "家庭", "间谍"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/c4/30/327555_sS6HS.jpg",
        "episodes": 25,
        "watched_episodes": 25,
        "comment": "太可爱了！阿尼亚YYDS"
    },
    {
        "title": "推しの子",
        "title_cn": "我推的孩子",
        "status": "watching",
        "score": 8,
        "tags": ["偶像", "悬疑", "治愈"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/14/f1/454671_U6U2X.jpg",
        "episodes": 11,
        "watched_episodes": 8,
    },
    {
        "title": "葬送のフリーレン",
        "title_cn": "葬送的芙莉莲",
        "status": "completed",
        "score": 10,
        "tags": ["奇幻", "冒险", "治愈", "感人"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/33/b2/454534_3lLLl.jpg",
        "episodes": 28,
        "watched_episodes": 28,
        "comment": "2023最佳番剧，无争议神作"
    },
    {
        "title": "鬼滅の刃 刀鍛冶の里編",
        "title_cn": "鬼灭之刃 刀匠村篇",
        "status": "completed",
        "score": 9,
        "tags": ["动作", "热血", "ufotable"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/f3/4b/439804_S2sM2.jpg",
        "episodes": 11,
        "watched_episodes": 11,
    },
    {
        "title": "呪術廻戦 懐玉・玉折／渋谷事変",
        "title_cn": "咒术回战 涩谷事变",
        "status": "watching",
        "score": 8,
        "tags": ["动作", "超能力", "MAPPA"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/e7/f6/409105_7qQqQ.jpg",
        "episodes": 23,
        "watched_episodes": 18,
    },
    {
        "title": "ブルーロック",
        "title_cn": "蓝色监狱",
        "status": "completed",
        "score": 8,
        "tags": ["足球", "热血", "竞技"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/56/03/435888_O0Ppf.jpg",
        "episodes": 24,
        "watched_episodes": 24,
    },
    {
        "title": "お兄ちゃんはおしまい！",
        "title_cn": "别当欧尼酱了！",
        "status": "completed",
        "score": 9,
        "tags": ["变身", "日常", "治愈"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/1d/0a/454890_92w92.jpg",
        "episodes": 12,
        "watched_episodes": 12,
        "comment": "作画超棒，很治愈的日常番"
    },
    {
        "title": "ポケモン(2023)",
        "title_cn": "宝可梦 地平线",
        "status": "watching",
        "score": 7,
        "tags": ["宝可梦", "冒险", "游戏改"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/f8/a1/454717_F88F8.jpg",
        "episodes": None,
        "watched_episodes": 25,
    },
    {
        "title": "無職転生Ⅱ ～異世界転生したら本気だす～",
        "title_cn": "无职转生 第二季",
        "status": "completed",
        "score": 9,
        "tags": ["异世界", "冒险", "成长"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/0d/a0/367747_099l9.jpg",
        "episodes": 25,
        "watched_episodes": 25,
    },
    {
        "title": "進撃の巨人 The Final Season",
        "title_cn": "进击的巨人 最终季",
        "status": "completed",
        "score": 10,
        "tags": ["战斗", "剧情", "神作"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/6c/49/281483_2n83n.jpg",
        "episodes": 28,
        "watched_episodes": 28,
        "comment": "完美的结局，感谢谏山创"
    },
    {
        "title": "キメツ学園",
        "title_cn": "鬼灭学园",
        "status": "on_hold",
        "score": 7,
        "tags": ["搞笑", "校园", "番外"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/5a/8a/327556_5t5Tt.jpg",
        "episodes": 7,
        "watched_episodes": 3,
    },
    {
        "title": "ちいかわ",
        "title_cn": "吉伊卡哇",
        "status": "watching",
        "score": 9,
        "tags": ["治愈", "萌系", "日常"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/e0/1e/406654_e0e0e.jpg",
        "comment": "超级可爱！每天都有在看"
    },
    {
        "title": "スパイファミリー Season 2",
        "title_cn": "间谍过家家 第二季",
        "status": "completed",
        "score": 8,
        "tags": ["喜剧", "动作", "家庭"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/c4/30/327555_sS6HS.jpg",
        "episodes": 12,
        "watched_episodes": 12,
    },
    {
        "title": "かぐや様は告らせたい-ウルトラロマンチック-",
        "title_cn": "辉夜大小姐想让我告白 超级浪漫",
        "status": "completed",
        "score": 9,
        "tags": ["恋爱", "喜剧", "校园"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/b0/4e/356716_b0b0b.jpg",
        "episodes": 13,
        "watched_episodes": 13,
        "comment": "会长太帅了！"
    },
    {
        "title": "ぼっち・ざ・ろっく！",
        "title_cn": "孤独摇滚！",
        "status": "completed",
        "score": 10,
        "tags": ["音乐", "日常", "治愈", "神作"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/68/01/442067_6868.jpg",
        "episodes": 12,
        "watched_episodes": 12,
        "comment": "波奇酱就是我，我就是波奇酱"
    },
    {
        "title": "チェンソーマン",
        "title_cn": "电锯人",
        "status": "completed",
        "score": 9,
        "tags": ["动作", "黑暗", "MAPPA"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/dc/c3/383365_dcdc.jpg",
        "episodes": 12,
        "watched_episodes": 12,
    },
    {
        "title": "メイドインアビス 烈日の黄金郷",
        "title_cn": "来自深渊 烈日的黄金乡",
        "status": "completed",
        "score": 9,
        "tags": ["冒险", "奇幻", "黑暗"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/5b/9e/417555_5b5b.jpg",
        "episodes": 12,
        "watched_episodes": 12,
        "comment": "剧情深度拉满"
    },
    {
        "title": "リコリス・リコイル",
        "title_cn": "莉可丽丝",
        "status": "completed",
        "score": 8,
        "tags": ["动作", "日常", "原创"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/7e/32/418297_7e7e.jpg",
        "episodes": 13,
        "watched_episodes": 13,
    },
    {
        "title": "パリピ孔明",
        "title_cn": "派对浪客诸葛孔明",
        "status": "plan_to_watch",
        "score": None,
        "tags": ["音乐", "搞笑", "穿越"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/a4/5d/389880_a4a4.jpg",
    },
    {
        "title": "カラオケ行こ！",
        "title_cn": "去唱歌吧！",
        "status": "dropped",
        "score": 5,
        "tags": ["日常", "音乐"],
        "image_url": "https://lain.bgm.tv/pic/cover/l/1b/2c/432654_1b1b.jpg",
        "episodes": 12,
        "watched_episodes": 3,
        "comment": "不太合口味"
    },
]


def _load_bangumi_data() -> List[dict]:
    """从 data/bangumi.json 加载番剧数据，失败时 fallback 到 MOCK_BANGUMI_DATA。"""
    data_path = os.path.join(os.path.dirname(__file__), "data", "bangumi.json")
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list) and len(data) > 0:
            return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    return MOCK_BANGUMI_DATA


_BANGUMI_DATA: Optional[List[dict]] = None


def _get_bangumi_data() -> List[dict]:
    """获取番剧数据（懒加载 + 缓存）。"""
    global _BANGUMI_DATA
    if _BANGUMI_DATA is None:
        _BANGUMI_DATA = _load_bangumi_data()
    return _BANGUMI_DATA


def search_bangumi_by_name(query: str, limit: int = 10) -> List[dict]:
    """按名称搜索番剧数据。

    支持模糊匹配 name, title, title_cn, genre, tags。
    Tier 2: 新增 name/genre 字段搜索支持。
    """
    data = _get_bangumi_data()
    query_lower = query.lower()
    results = []
    for item in data:
        if (query_lower in item.get("name", "").lower() or
            query_lower in item.get("title", "").lower() or
            query_lower in (item.get("title_cn") or "").lower() or
            query_lower in (item.get("genre") or "").lower() or
            any(query_lower in tag.lower() for tag in item.get("tags", []))):
            results.append(item)
        if len(results) >= limit:
            break
    return results


class ImportBangumiWatchlistTool(BaseTool[ImportBangumiWatchlistInput, ImportBangumiWatchlistOutput]):
    """Tool for importing Bangumi watchlist.

    Tier 2: 使用 data/bangumi.json 作为真实数据源。
    """
    
    name = "import_bangumi_watchlist"
    description = "导入 Bangumi 追番列表"
    tool_type = ToolType.READ
    permission = ToolPermission.PUBLIC
    
    async def execute(self, input_data: ImportBangumiWatchlistInput) -> ImportBangumiWatchlistOutput:
        """Import watchlist from Bangumi data source."""
        bangumi_data = _get_bangumi_data()
        items = [AnimeItem(**item) for item in bangumi_data[:input_data.limit]]
        
        return ImportBangumiWatchlistOutput(
            username=input_data.username,
            items=items,
            total=len(items),
            source="bangumi"
        )
    
    def get_input_schema(self) -> type[ImportBangumiWatchlistInput]:
        return ImportBangumiWatchlistInput
    
    def get_output_schema(self) -> type[ImportBangumiWatchlistOutput]:
        return ImportBangumiWatchlistOutput


class GetAnimeRecommendationsInput(BaseModel):
    """Input for anime recommendations."""
    tags: Optional[List[str]] = Field(None, description="筛选标签")
    limit: int = Field(default=5, description="推荐数量")


class GetAnimeRecommendationsOutput(BaseModel):
    """Output for anime recommendations."""
    items: List[AnimeItem]
    reason: str


class GetAnimeRecommendationsTool(BaseTool[GetAnimeRecommendationsInput, GetAnimeRecommendationsOutput]):
    """Tool for getting anime recommendations based on tags."""
    
    name = "get_anime_recommendations"
    description = "根据标签获取番剧推荐"
    tool_type = ToolType.READ
    permission = ToolPermission.PUBLIC
    
    async def execute(self, input_data: GetAnimeRecommendationsInput) -> GetAnimeRecommendationsOutput:
        """Get anime recommendations from real data source."""
        items = []
        tags = input_data.tags or []
        bangumi_data = _get_bangumi_data()
        
        for item_data in bangumi_data:
            if tags:
                # 筛选包含指定标签的番剧
                if any(tag in item_data.get("tags", []) for tag in tags):
                    items.append(AnimeItem(**item_data))
            else:
                items.append(AnimeItem(**item_data))
            
            if len(items) >= input_data.limit:
                break
        
        reason = f"根据标签 {tags} 推荐" if tags else "热门推荐"
        
        return GetAnimeRecommendationsOutput(
            items=items,
            reason=reason
        )
    
    def get_input_schema(self) -> type[GetAnimeRecommendationsInput]:
        return GetAnimeRecommendationsInput
    
    def get_output_schema(self) -> type[GetAnimeRecommendationsOutput]:
        return GetAnimeRecommendationsOutput