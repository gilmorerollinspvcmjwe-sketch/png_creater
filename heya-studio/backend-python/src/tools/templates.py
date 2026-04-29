"""Template query tool with real data from JSON file.

Tier 2 改进项 #2: 替换 Mock 数据为真实数据源
- 从 data/templates.json 加载模板定义
- 按风格分类（sakura/lavender/mint/night/cyber 等）
- 保留 MOCK_TEMPLATES 作为 fallback
"""

import json
import os
from typing import List, Optional
from pydantic import BaseModel, Field
from .base import BaseTool, ToolType, ToolPermission


# ============================================================================
# Demo Templates - 5 个内置 Demo 页面配置
# ============================================================================

DEMO_TEMPLATES = [
    # ========================================================================
    # Demo 1: 樱花推し页 (sakura 主题)
    # ========================================================================
    {
        "id": "demo-sakura-oshi",
        "name": "樱花推し页",
        "description": "温柔浪漫的樱花粉色系推し主页，适合喜欢莉香的INFP女生",
        "theme": "sakura",
        "preview_colors": ["#F2A7B3", "#FFEEF2", "#E8909C"],
        "config": {
            "id": "page-demo-sakura",
            "title": "樱花推し页",
            "theme": "sakura",
            "canvasWidth": 680,
            "canvasHeight": 1100,
            "background": {"type": "gradient", "value": "linear-gradient(180deg, #FFEEF2 0%, #FFF8F9 100%)"},
            "components": [
                {
                    "id": "hero-1", "type": "hero-section",
                    "x": 0, "y": 0, "width": 680, "height": 220, "zIndex": 1,
                    "avatar": "https://placehold.co/200/F2A7B3/FFFFFF?text=Lilina",
                    "name": "樱井莉香的推し主页",
                    "signature": "「世界上最温柔的存在就是推し的笑容呀」",
                    "signatureTypewriter": True,
                    "mbti": "INFP",
                    "bloodType": "A",
                    "zodiac": "双鱼座",
                    "backgroundGradient": "linear-gradient(135deg, #FFEEF2 0%, #FFF0F5 100%)",
                    "showGlow": True,
                    "glowColor": "#F2A7B3"
                },
                {
                    "id": "quote-1", "type": "quote",
                    "x": 20, "y": 235, "width": 640, "height": 80, "zIndex": 2,
                    "text": "「只要有推し在，世界就不会崩塌」",
                    "translation": "— 推しがいるだけで世界は壊れない",
                    "typewriterEffect": True,
                    "fontSize": 16
                },
                {
                    "id": "oshi-1", "type": "oshi-card",
                    "x": 0, "y": 330, "width": 680, "height": 280, "zIndex": 3,
                    "characters": [
                        {"name": "桜井莉香", "from": "Tokyo Godfathers", "image": "https://placehold.co/300x350/F2A7B3/FFFFFF?text=Lilika", "color": "#F2A7B3"},
                        {"name": "立華鈴", "from": "NO GAME NO LIFE", "image": "https://placehold.co/300x350/E8909C/FFFFFF?text=Suzaku", "color": "#E8909C"},
                        {"name": "小豆", "from": "天使的双麻花辫", "image": "https://placehold.co/300x350/FFB7C5/FFFFFF?text=Azuki", "color": "#FFB7C5"}
                    ],
                    "variant": "carousel",
                    "columns": 1
                },
                {
                    "id": "attr-1", "type": "attribute-wall",
                    "x": 20, "y": 625, "width": 640, "height": 120, "zIndex": 4,
                    "attributes": [
                        {"type": "mbti", "label": "MBTI", "value": "INFP-T 调停者"},
                        {"type": "blood", "label": "血型", "value": "A型"},
                        {"type": "zodiac", "label": "星座", "value": "双鱼座♓"},
                        {"type": "custom", "label": "推龄", "value": "7年"},
                        {"type": "custom", "label": "入坑作", "value": "Tokyo Godfathers"},
                        {"type": "custom", "label": "本命", "value": "莉香♡"}
                    ],
                    "variant": "grid"
                },
                {
                    "id": "tags-1", "type": "tag-group",
                    "x": 20, "y": 760, "width": 640, "height": 50, "zIndex": 5,
                    "tags": ["#莉香推し", "#TokyoGodfathers", "#本命本命", "#立華鈴", "#小豆", "#萌系", "#治愈番", "#治愈日常"],
                    "variant": "outlined",
                    "hoverColor": "#F2A7B3"
                },
                {
                    "id": "music-1", "type": "music-player",
                    "x": 0, "y": 825, "width": 680, "height": 90, "zIndex": 6,
                    "song": {
                        "name": "Christmas Song",
                        "artist": "藤原萌意識 (Fujihara Keishiki)",
                        "cover": "https://placehold.co/80x80/F2A7B3/FFFFFF?text=♪",
                        "url": "https://www.youtube.com/watch?v=B7j98FfHwFI"
                    },
                    "variant": "full"
                },
                {
                    "id": "social-1", "type": "social-links",
                    "x": 0, "y": 930, "width": 680, "height": 80, "zIndex": 7,
                    "links": [
                        {"platform": "bilibili", "url": "https://bilibili.com", "label": "B站追番"},
                        {"platform": "twitter", "url": "https://twitter.com", "label": "推特"},
                        {"platform": "pixiv", "url": "https://pixiv.net", "label": "Pixiv"}
                    ],
                    "layout": "horizontal"
                }
            ]
        }
    },

    # ========================================================================
    # Demo 2: 二次元收藏家 (night 主题 - 赛博朋克)
    # ========================================================================
    {
        "id": "demo-night-collector",
        "name": "二次元收藏家",
        "description": "重度谷子收藏爱好者专属赛博朋克风页面，霓虹暗色调",
        "theme": "night",
        "preview_colors": ["#1E3A5F", "#0F172A", "#F2A7B3"],
        "config": {
            "id": "page-demo-night",
            "title": "二次元收藏家",
            "theme": "night",
            "canvasWidth": 680,
            "canvasHeight": 1400,
            "background": {"type": "gradient", "value": "linear-gradient(180deg, #0F172A 0%, #1A1A2E 50%, #16213E 100%)"},
            "components": [
                {
                    "id": "hero-2", "type": "hero-section",
                    "x": 0, "y": 0, "width": 680, "height": 220, "zIndex": 1,
                    "avatar": "https://placehold.co/200x200/1E3A5F/F2A7B3?text=Collector",
                    "name": "GACHA MASTER",
                    "signature": "「把喜欢的角色全部带回家」",
                    "signatureTypewriter": True,
                    "mbti": "INTJ",
                    "bloodType": "O",
                    "zodiac": "天蝎座",
                    "backgroundGradient": "linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)",
                    "showGlow": True,
                    "glowColor": "#F2A7B3"
                },
                {
                    "id": "gallery-2", "type": "gallery",
                    "x": 0, "y": 235, "width": 680, "height": 280, "zIndex": 2,
                    "title": "近期战绩 / Recent Hauls",
                    "images": [
                        {"id": "g1", "url": "https://placehold.co/200x200/1E3A5F/F2A7B3?text=五条悟手办", "caption": "五条悟 - Specification", "date": "2024-03"},
                        {"id": "g2", "url": "https://placehold.co/200x200/1E3A5F/E8909C?text=芙莉莲手办", "caption": "芙莉莲 - 葬送的芙莉莲", "date": "2024-02"},
                        {"id": "g3", "url": "https://placehold.co/200x200/1E3A5F/FFB7C5?text=樱岛麻衣", "caption": "樱岛麻衣 - 青猪", "date": "2024-01"},
                        {"id": "g4", "url": "https://placehold.co/200x200/1E3A5F/B4A7D6?text=远坂凛", "caption": "远坂凛 - FGO", "date": "2023-12"}
                    ],
                    "layout": "grid",
                    "columns": 2
                },
                {
                    "id": "merch-2a", "type": "merchandise-card",
                    "x": 20, "y": 530, "width": 200, "height": 180, "zIndex": 3,
                    "name": "五条悟 Specification 手办",
                    "imageUrl": "https://placehold.co/200x150/1E3A5F/F2A7B3?text=五条悟",
                    "sourceWork": "咒术回战",
                    "purchaseDate": "2024-03-15",
                    "price": 2200,
                    "series": "咒术回战 Figure",
                    "rarity": "限定版",
                    "condition": "全新未拆",
                    "notes": "等了半年终于到手！"
                },
                {
                    "id": "merch-2b", "type": "merchandise-card",
                    "x": 240, "y": 530, "width": 200, "height": 180, "zIndex": 4,
                    "name": "芙莉莲 1/7 手办",
                    "imageUrl": "https://placehold.co/200x150/1E3A5F/E8909C?text=芙莉莲",
                    "sourceWork": "葬送的芙莉莲",
                    "purchaseDate": "2024-02-20",
                    "price": 1800,
                    "series": "GIFT",
                    "rarity": "普通版",
                    "condition": "品相完美",
                    "notes": "搭配精灵小屋"
                },
                {
                    "id": "merch-2c", "type": "merchandise-card",
                    "x": 460, "y": 530, "width": 200, "height": 180, "zIndex": 5,
                    "name": "樱岛麻衣 吧唧 set",
                    "imageUrl": "https://placehold.co/200x150/1E3A5F/FFB7C5?text=麻衣",
                    "sourceWork": "青春猪头少年",
                    "purchaseDate": "2024-01-10",
                    "price": 350,
                    "series": "青猪 BD",
                    "rarity": "展会限定",
                    "condition": "全新",
                    "notes": "名古屋JACK购入"
                },
                {
                    "id": "merch-2d", "type": "merchandise-card",
                    "x": 20, "y": 725, "width": 200, "height": 180, "zIndex": 6,
                    "name": "远坂凛 色纸",
                    "imageUrl": "https://placehold.co/200x150/1E3A5F/B4A7D6?text=远坂凛",
                    "sourceWork": "Fate/Stay Night",
                    "purchaseDate": "2023-12-25",
                    "price": 800,
                    "series": "TYPE-MOON",
                    "rarity": "普通版",
                    "condition": "全新",
                    "notes": "生日礼物"
                },
                {
                    "id": "merch-2e", "type": "merchandise-card",
                    "x": 240, "y": 725, "width": 200, "height": 180, "zIndex": 7,
                    "name": "鹿目lotus 立牌",
                    "imageUrl": "https://placehold.co/200x150/1E3A5F/86EFAC?text=小圆",
                    "sourceWork": "魔法少女小圆",
                    "purchaseDate": "2023-11-11",
                    "price": 120,
                    "series": "WONderful",
                    "rarity": "普通版",
                    "condition": "品相完美"
                },
                {
                    "id": "merch-2f", "type": "merchandise-card",
                    "x": 460, "y": 725, "width": 200, "height": 180, "zIndex": 8,
                    "name": "利威尔 粘土人",
                    "imageUrl": "https://placehold.co/200x150/1E3A5F/FDE68A?text=利威尔",
                    "sourceWork": "进击的巨人",
                    "purchaseDate": "2023-10-01",
                    "price": 650,
                    "series": "Nendoroid",
                    "rarity": "限定版",
                    "condition": "全新未拆"
                },
                {
                    "id": "badge-2", "type": "achievement-badges",
                    "x": 0, "y": 920, "width": 680, "height": 160, "zIndex": 9,
                    "title": "收集成就 / Collection Achievements",
                    "badges": [
                        {"id": "b1", "name": "谷子破百", "icon": "🏆", "source": "个人成就", "rarity": "epic", "description": "收藏超过100件周边"},
                        {"id": "b2", "name": "手办50+", "icon": "🎯", "source": "个人成就", "rarity": "rare", "description": "手办收藏达50尊"},
                        {"id": "b3", "name": "咒术厨", "icon": "💜", "source": "漫展", "date": "2024-03", "rarity": "common"},
                        {"id": "b4", "name": "通贩王", "icon": "👑", "source": "个人成就", "rarity": "legendary", "description": "通贩入手超50单"},
                        {"id": "b5", "name": "初入坑", "icon": "🌱", "source": "个人成就", "date": "2018", "rarity": "common"}
                    ]
                },
                {
                    "id": "support-2", "type": "support-record",
                    "x": 0, "y": 1095, "width": 680, "height": 280, "zIndex": 10,
                    "title": "应援记录 / Support Record",
                    "records": [
                        {"id": "s1", "event": "WF2024上海", "date": "2024-06-09", "location": "上海新国际博览中心", "notes": "通贩下单3单"},
                        {"id": "s2", "event": "CP30", "date": "2024-05-02", "location": "广州中国进出口商品交易会展馆", "notes": "入手限定吧唧5枚"},
                        {"id": "s3", "event": "Bilibili World 2024", "date": "2024-04-15", "location": "上海国家会展中心", "notes": "入手五条悟手办"},
                        {"id": "s4", "event": "WF2023上海", "date": "2023-11-25", "location": "上海新国际博览中心", "notes": "首次参加WF"}
                    ]
                }
            ]
        }
    },

    # ========================================================================
    # Demo 3: 追番达人 (mint 主题)
    # ========================================================================
    {
        "id": "demo-mint-watcher",
        "name": "追番达人",
        "description": "一年200部番的硬核观众，清新薄荷绿风格",
        "theme": "mint",
        "preview_colors": ["#86EFAC", "#F0FFF4", "#6EE7B7"],
        "config": {
            "id": "page-demo-mint",
            "title": "追番达人",
            "theme": "mint",
            "canvasWidth": 680,
            "canvasHeight": 1350,
            "background": {"type": "gradient", "value": "linear-gradient(180deg, #F0FFF4 0%, #ECFAF3 100%)"},
            "components": [
                {
                    "id": "hero-3", "type": "hero-section",
                    "x": 0, "y": 0, "width": 680, "height": 220, "zIndex": 1,
                    "avatar": "https://placehold.co/200/86EFAC/FFFFFF?text=Bangumi",
                    "name": "Bangumi 重度用户",
                    "signature": "「看番才是第一生产力」（自称）",
                    "signatureTypewriter": True,
                    "mbti": "INTP",
                    "bloodType": "B",
                    "zodiac": "射手座",
                    "backgroundGradient": "linear-gradient(135deg, #86EFAC 0%, #F0FFF4 100%)",
                    "showGlow": True,
                    "glowColor": "#86EFAC"
                },
                {
                    "id": "watch-3", "type": "watchlist",
                    "x": 0, "y": 235, "width": 680, "height": 420, "zIndex": 2,
                    "title": "📺 我的追番列表",
                    "items": [
                        {"id": "w1", "title": "葬送的芙莉莲", "titleCn": "葬送的芙莉莲", "status": "watching", "score": 9, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=芙莉莲", "watchedEpisodes": 21, "episodes": 28, "comment": "教科书级别的治愈番"},
                        {"id": "w2", "title": "呪術廻戦", "titleCn": "咒术回战", "status": "watching", "score": 8, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=五条", "watchedEpisodes": 23, "episodes": 23, "comment": "宿傩大爷演技满分"},
                        {"id": "w3", "title": "药屋少女的吧喃", "titleCn": "药屋少女的呢喃", "status": "watching", "score": 9, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=药屋", "watchedEpisodes": 11, "episodes": 12, "comment": "猫猫豹和我都爱看"},
                        {"id": "w4", "title": "進撃の巨人", "titleCn": "进击的巨人", "status": "completed", "score": 10, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=巨人", "watchedEpisodes": 87, "episodes": 87, "comment": "神作！献出心脏！"},
                        {"id": "w5", "title": "SPY×FAMILY", "titleCn": "间谍过家家", "status": "completed", "score": 9, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=阿尼亚", "watchedEpisodes": 37, "episodes": 37, "comment": "阿尼亚萌我一脸"},
                        {"id": "w6", "title": "ぼっち・ざ・ろっく！", "titleCn": "孤独摇滚", "status": "completed", "score": 9, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=波奇", "watchedEpisodes": 12, "episodes": 12, "comment": "后藤独绝对是社恐嘴替"},
                        {"id": "w7", "title": "迷宫饭", "titleCn": "迷宫饭", "status": "plan_to_watch", "score": 8, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=迷宫", "comment": "听说很下饭"},
                        {"id": "w8", "title": "【推しの子】", "titleCn": "我推的孩子", "status": "plan_to_watch", "score": 8, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=推子", "comment": "赤坂明出品"},
                        {"id": "w9", "title": "Lycoris Recoil", "titleCn": "莉可丽丝", "status": "dropped", "score": 5, "imageUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=千束", "comment": "结尾有点失望"}
                    ],
                    "showScore": True,
                    "groupByStatus": True
                },
                {
                    "id": "media-3a", "type": "media-card",
                    "x": 20, "y": 670, "width": 320, "height": 160, "zIndex": 3,
                    "title": "进击的巨人 Final Season",
                    "mediaType": "anime",
                    "coverUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=巨人",
                    "rating": 10,
                    "review": "史诗级的故事，关于自由的终章。献出心脏！",
                    "tags": ["热血", "战斗", "神作"]
                },
                {
                    "id": "media-3b", "type": "media-card",
                    "x": 360, "y": 670, "width": 320, "height": 160, "zIndex": 4,
                    "title": "孤独摇滚！",
                    "mediaType": "anime",
                    "coverUrl": "https://placehold.co/120x160/86EFAC/FFFFFF?text=波奇",
                    "rating": 9,
                    "review": "社恐打工人的真实写照，配乐超棒。",
                    "tags": ["音乐", "日常", "治愈"]
                },
                {
                    "id": "memorial-3", "type": "memorial-calendar",
                    "x": 0, "y": 845, "width": 680, "height": 200, "zIndex": 5,
                    "title": "🎂 追番纪念日",
                    "events": [
                        {"id": "m1", "name": "芙莉莲动画开播", "date": "2023-10-04", "type": "anniversary", "sourceWork": "葬送的芙莉莲"},
                        {"id": "m2", "name": "五条悟 领域展开", "date": "2024-02-18", "type": "debut", "character": "五条悟", "sourceWork": "咒术回战"},
                        {"id": "m3", "name": "巨人最终季开播", "date": "2023-03-04", "type": "anniversary", "sourceWork": "进击的巨人"},
                        {"id": "m4", "name": "波奇属性觉醒日", "date": "2022-10-10", "type": "anniversary", "character": "后藤独", "sourceWork": "孤独摇滚"}
                    ],
                    "showCountdown": True
                },
                {
                    "id": "attr-3", "type": "attribute-wall",
                    "x": 20, "y": 1060, "width": 640, "height": 120, "zIndex": 6,
                    "attributes": [
                        {"type": "mbti", "label": "MBTI", "value": "INTP 逻辑学家"},
                        {"type": "blood", "label": "血型", "value": "B型"},
                        {"type": "zodiac", "label": "星座", "value": "射手座♐"},
                        {"type": "custom", "label": "番剧", "value": "看过 487 部"},
                        {"type": "custom", "label": "Bangumi排名", "value": "Top 3%"},
                        {"type": "custom", "label": "口味", "value": "杂食向"}
                    ],
                    "variant": "grid"
                },
                {
                    "id": "tags-3", "type": "tag-group",
                    "x": 20, "y": 1195, "width": 640, "height": 60, "zIndex": 7,
                    "tags": ["#追番狂魔", "#Bangumi用户", "#年度200部", "#杂食向", "#巨人厨", "#咒术回战", "#治愈番爱好者"],
                    "variant": "filled"
                }
            ]
        }
    },

    # ========================================================================
    # Demo 4: CP 同人创作者 (lavender 主题)
    # ========================================================================
    {
        "id": "demo-lavender-creator",
        "name": "CP 同人创作者",
        "description": "紫色浪漫薰衣草风，适合画同人创作的创作者",
        "theme": "lavender",
        "preview_colors": ["#B4A7D6", "#EDE8FF", "#9B8EC4"],
        "config": {
            "id": "page-demo-lavender",
            "title": "CP 同人创作者",
            "theme": "lavender",
            "canvasWidth": 680,
            "canvasHeight": 1250,
            "background": {"type": "gradient", "value": "linear-gradient(180deg, #EDE8FF 0%, #F8F5FF 100%)"},
            "components": [
                {
                    "id": "hero-4", "type": "hero-section",
                    "x": 0, "y": 0, "width": 680, "height": 220, "zIndex": 1,
                    "avatar": "https://placehold.co/200/B4A7D6/FFFFFF?text=Artist",
                    "name": "紫苑画师 / Shion Artist",
                    "signature": "「用画笔记录每一对CP的心动瞬间」",
                    "signatureTypewriter": True,
                    "mbti": "INFP",
                    "bloodType": "A",
                    "zodiac": "天秤座",
                    "backgroundGradient": "linear-gradient(135deg, #B4A7D6 0%, #EDE8FF 100%)",
                    "showGlow": True,
                    "glowColor": "#B4A7D6"
                },
                {
                    "id": "cp-4", "type": "cp-card",
                    "x": 0, "y": 235, "width": 680, "height": 200, "zIndex": 2,
                    "character1": {"name": "五条悟", "imageUrl": "https://placehold.co/160/B4A7D6/FFFFFF?text=五条悟", "color": "#6366F1"},
                    "character2": {"name": "夏油傑", "imageUrl": "https://placehold.co/160/B4A7D6/FFFFFF?text=夏油傑", "color": "#8B5CF6"},
                    "relationship": "最强挚友 / 宿命羁绊",
                    "sourceWork": "呪術廻戦",
                    "tags": ["五悠", "咒术回战", "挚友", "宿命"]
                },
                {
                    "id": "quote-4", "type": "quote",
                    "x": 20, "y": 450, "width": 640, "height": 80, "zIndex": 3,
                    "text": "「不论哪个世界，傑都会是我的挚友」",
                    "translation": "— 五条悟",
                    "typewriterEffect": True,
                    "fontSize": 15
                },
                {
                    "id": "gallery-4", "type": "gallery",
                    "x": 0, "y": 545, "width": 680, "height": 320, "zIndex": 4,
                    "title": "🎨 同人创作 / Fan Art",
                    "images": [
                        {"id": "art1", "url": "https://placehold.co/300x400/B4A7D6/FFFFFF?text=五悠-01", "caption": "新宿的约定", "date": "2024-03", "tags": ["五悠", "同人"]},
                        {"id": "art2", "url": "https://placehold.co/300x400/9B8EC4/FFFFFF?text=五悠-02", "caption": "高专时代", "date": "2024-02", "tags": ["高专", "回忆"]},
                        {"id": "art3", "url": "https://placehold.co/300x400/B4A7D6/FFFFFF?text=五悠-03", "caption": "二人背影", "date": "2024-01", "tags": ["风景", "氛围"]},
                        {"id": "art4", "url": "https://placehold.co/300x400/9B8EC4/FFFFFF?text=五悠-04", "caption": "术式反转", "date": "2023-12", "tags": ["术式", "特效"]}
                    ],
                    "layout": "grid",
                    "columns": 2
                },
                {
                    "id": "media-4a", "type": "media-card",
                    "x": 20, "y": 880, "width": 300, "height": 140, "zIndex": 5,
                    "title": "咒术回战 0",
                    "mediaType": "anime",
                    "coverUrl": "https://placehold.co/100x140/B4A7D6/FFFFFF?text=咒术0",
                    "rating": 9,
                    "review": "五悠羁绊的起点，百看不厌。",
                    "tags": ["剧场版", "五悠", "必看"]
                },
                {
                    "id": "media-4b", "type": "media-card",
                    "x": 340, "y": 880, "width": 300, "height": 140, "zIndex": 6,
                    "title": "利威尔 × 埃尔文",
                    "mediaType": "anime",
                    "coverUrl": "https://placehold.co/100x140/B4A7D6/FFFFFF?text=团兵",
                    "rating": 10,
                    "review": "献出心脏，调查兵团永垂不朽。",
                    "tags": ["团兵", "进击的巨人", "虐"]
                },
                {
                    "id": "tags-4", "type": "tag-group",
                    "x": 20, "y": 1035, "width": 640, "height": 60, "zIndex": 7,
                    "tags": ["#五悠CP", "#同人创作", "#Pixiv", "#画师", "#咒术回战", "#进击的巨人", "#团兵"],
                    "variant": "outlined"
                },
                {
                    "id": "social-4", "type": "social-links",
                    "x": 0, "y": 1110, "width": 680, "height": 80, "zIndex": 8,
                    "links": [
                        {"platform": "pixiv", "url": "https://pixiv.net", "label": "Pixiv"},
                        {"platform": "twitter", "url": "https://twitter.com", "label": "Twitter/X"},
                        {"platform": "bilibili", "url": "https://bilibili.com", "label": "B站"},
                        {"platform": "lofter", "url": "https://lofter.com", "label": "Lofter"}
                    ],
                    "layout": "horizontal"
                }
            ]
        }
    },

    # ========================================================================
    # Demo 5: 全能二次元 (cream 主题)
    # ========================================================================
    {
        "id": "demo-cream-omni",
        "name": "全能二次元",
        "description": "温暖奶油色系，什么都涉猎的全能型二次元爱好者",
        "theme": "cream",
        "preview_colors": ["#FDE68A", "#FFFBEB", "#FCD34D"],
        "config": {
            "id": "page-demo-cream",
            "title": "全能二次元",
            "theme": "cream",
            "canvasWidth": 680,
            "canvasHeight": 1650,
            "background": {"type": "gradient", "value": "linear-gradient(180deg, #FFFBEB 0%, #FFF8E7 100%)"},
            "components": [
                {
                    "id": "hero-5", "type": "hero-section",
                    "x": 0, "y": 0, "width": 680, "height": 220, "zIndex": 1,
                    "avatar": "https://placehold.co/200/FDE68A/FFFFFF?text=Omni",
                    "name": "全能二次元生活",
                    "signature": "「番剧游戏小说演唱会，我全都要！」",
                    "signatureTypewriter": True,
                    "mbti": "ENFP",
                    "bloodType": "O",
                    "zodiac": "双子座",
                    "backgroundGradient": "linear-gradient(135deg, #FDE68A 0%, #FFFBEB 100%)",
                    "showGlow": True,
                    "glowColor": "#FDE68A"
                },
                {
                    "id": "oshi-5", "type": "oshi-card",
                    "x": 0, "y": 235, "width": 680, "height": 160, "zIndex": 2,
                    "characters": [
                        {"name": "五条悟", "from": "咒术回战", "image": "https://placehold.co/160/FDE68A/FFFFFF?text=五条悟", "color": "#FDE68A"},
                        {"name": "利威尔", "from": "进击的巨人", "image": "https://placehold.co/160/FDE68A/FFFFFF?text=利威尔", "color": "#FCD34D"},
                        {"name": "樱岛麻衣", "from": "青猪", "image": "https://placehold.co/160/FDE68A/FFFFFF?text=麻衣", "color": "#FDE68A"}
                    ],
                    "variant": "carousel",
                    "columns": 3
                },
                {
                    "id": "attr-5", "type": "attribute-wall",
                    "x": 20, "y": 410, "width": 640, "height": 120, "zIndex": 3,
                    "attributes": [
                        {"type": "mbti", "label": "MBTI", "value": "ENFP 竞选者"},
                        {"type": "blood", "label": "血型", "value": "O型"},
                        {"type": "zodiac", "label": "星座", "value": "双子座♊"},
                        {"type": "custom", "label": "类型", "value": "杂食全能"},
                        {"type": "custom", "label": "入宅", "value": "2012年"},
                        {"type": "custom", "label": "战绩", "value": "番/游/轻/谷 全制霸"}
                    ],
                    "variant": "grid"
                },
                {
                    "id": "merch-5a", "type": "merchandise-card",
                    "x": 20, "y": 545, "width": 200, "height": 180, "zIndex": 4,
                    "name": "五条悟 粘土人",
                    "imageUrl": "https://placehold.co/200x150/FDE68A/FFFFFF?text=五悟",
                    "sourceWork": "咒术回战",
                    "purchaseDate": "2024-01",
                    "price": 600,
                    "rarity": "普通版",
                    "condition": "全新未拆"
                },
                {
                    "id": "merch-5b", "type": "merchandise-card",
                    "x": 240, "y": 545, "width": 200, "height": 180, "zIndex": 5,
                    "name": "利威尔 抱胁全套",
                    "imageUrl": "https://placehold.co/200x150/FDE68A/FFFFFF?text=利威尔",
                    "sourceWork": "进击的巨人",
                    "purchaseDate": "2023-12",
                    "price": 450,
                    "rarity": "限定版",
                    "condition": "品相完美"
                },
                {
                    "id": "merch-5c", "type": "merchandise-card",
                    "x": 460, "y": 545, "width": 200, "height": 180, "zIndex": 6,
                    "name": "麻衣set 吧唧",
                    "imageUrl": "https://placehold.co/200x150/FDE68A/FFFFFF?text=麻衣",
                    "sourceWork": "青猪",
                    "purchaseDate": "2023-11",
                    "price": 280,
                    "rarity": "普通版",
                    "condition": "全新"
                },
                {
                    "id": "watch-5", "type": "watchlist",
                    "x": 0, "y": 740, "width": 680, "height": 280, "zIndex": 7,
                    "title": "📺 最近在看",
                    "items": [
                        {"id": "w1", "title": "葬送的芙莉莲", "titleCn": "葬送的芙莉莲", "status": "watching", "score": 10, "watchedEpisodes": 21, "episodes": 28},
                        {"id": "w2", "title": "迷宫饭", "titleCn": "迷宫饭", "status": "watching", "score": 9, "watchedEpisodes": 8, "episodes": 24},
                        {"id": "w3", "title": "夏日大作战", "titleCn": "Summer Wars", "status": "completed", "score": 10}
                    ],
                    "showScore": True,
                    "groupByStatus": False
                },
                {
                    "id": "gallery-5", "type": "gallery",
                    "x": 0, "y": 1035, "width": 680, "height": 200, "zIndex": 8,
                    "title": "📸 漫展留念",
                    "images": [
                        {"id": "p1", "url": "https://placehold.co/200x200/FDE68A/FFFFFF?text=WF2024", "caption": "WF2024上海", "date": "2024-06"},
                        {"id": "p2", "url": "https://placehold.co/200x200/FCD34D/FFFFFF?text=CP30", "caption": "CP30", "date": "2024-05"},
                        {"id": "p3", "url": "https://placehold.co/200x200/FDE68A/FFFFFF?text=BW2024", "caption": "BW2024", "date": "2024-04"}
                    ],
                    "layout": "grid",
                    "columns": 3
                },
                {
                    "id": "media-5a", "type": "media-card",
                    "x": 20, "y": 1250, "width": 200, "height": 140, "zIndex": 9,
                    "title": "最终幻想7 重生",
                    "mediaType": "game",
                    "coverUrl": "https://placehold.co/100x140/FDE68A/FFFFFF?text=FF7R",
                    "rating": 10,
                    "tags": ["游戏", "FF7", "神作"]
                },
                {
                    "id": "media-5b", "type": "media-card",
                    "x": 240, "y": 1250, "width": 200, "height": 140, "zIndex": 10,
                    "title": "蝉夏 by 八代寵物",
                    "mediaType": "music",
                    "coverUrl": "https://placehold.co/100x140/FDE68A/FFFFFF?text=音乐",
                    "rating": 9,
                    "tags": ["音乐", "ACG", "单曲循环"]
                },
                {
                    "id": "media-5c", "type": "media-card",
                    "x": 460, "y": 1250, "width": 200, "height": 140, "zIndex": 11,
                    "title": "四月是你的谎言",
                    "mediaType": "book",
                    "coverUrl": "https://placehold.co/100x140/FDE68A/FFFFFF?text=四月",
                    "rating": 9,
                    "review": "有马公生，我的音乐启蒙。",
                    "tags": ["轻小说", "音乐", "虐"]
                },
                {
                    "id": "guestbook-5", "type": "guestbook",
                    "x": 0, "y": 1405, "width": 680, "height": 220, "zIndex": 12,
                    "title": "💬 来留言吧",
                    "messages": [
                        {"id": "gm1", "author": "五条悟推し", "avatar": "https://placehold.co/60/FDE68A/FFFFFF?text=五", "content": "主页好可爱！同是咒术厨握手！", "timestamp": "2024-03-15T14:30:00"},
                        {"id": "gm2", "author": "利威尔老婆", "avatar": "https://placehold.co/60/FDE68A/FFFFFF?text=团", "content": "巨人厨在哪里！举起手来！", "timestamp": "2024-03-14T20:15:00"},
                        {"id": "gm3", "author": "万能星人", "content": "同好！全平台发展才是正道！", "timestamp": "2024-03-13T09:00:00"}
                    ]
                }
            ]
        }
    }
]


class QueryTemplatesInput(BaseModel):
    """Input for template query."""
    query: str = Field(..., description="Search query")
    style: Optional[str] = Field(None, description="Style filter")
    limit: int = Field(default=5, description="Max results")


class Template(BaseModel):
    """Template data."""
    id: str
    name: str
    description: str
    style: str
    preview_url: Optional[str] = None
    config: dict = {}


class QueryTemplatesOutput(BaseModel):
    """Output for template query."""
    templates: List[Template]
    total: int


# Mock template data (existing)
MOCK_TEMPLATES = [
    {
        "id": "sakura-basic",
        "name": "樱花萌系基础模板",
        "description": "温柔浪漫的樱花粉色系模板，适合二次元萌系爱好者",
        "style": "sakura",
        "preview_url": "/previews/sakura-basic.png",
        "config": {
            "theme": {"id": "sakura"},
            "layout": {"type": "single-column", "width": 680}
        }
    },
    {
        "id": "cyberpunk-tech",
        "name": "赛博朋克科技模板",
        "description": "酷炫的赛博朋克风格，霓虹配色和科技元素",
        "style": "night",
        "preview_url": "/previews/cyberpunk-tech.png",
        "config": {
            "theme": {"id": "night"},
            "layout": {"type": "single-column", "width": 680}
        }
    },
    {
        "id": "lavender-soft",
        "name": "薰衣草温柔模板",
        "description": "淡紫色的温柔风格，适合文艺气质",
        "style": "lavender",
        "preview_url": "/previews/lavender-soft.png",
        "config": {
            "theme": {"id": "lavender"},
            "layout": {"type": "single-column", "width": 680}
        }
    },
    {
        "id": "mint-fresh",
        "name": "薄荷清新模板",
        "description": "清爽的薄荷绿色系，自然简约风格",
        "style": "mint",
        "preview_url": "/previews/mint-fresh.png",
        "config": {
            "theme": {"id": "mint"},
            "layout": {"type": "single-column", "width": 680}
        }
    },
    {
        "id": "minimalist",
        "name": "极简黑白模板",
        "description": "黑白极简风格，突出内容本身",
        "style": "mono",
        "preview_url": "/previews/minimalist.png",
        "config": {
            "theme": {"id": "mono"},
            "layout": {"type": "single-column", "width": 680}
        }
    },
]


def _load_templates_data() -> List[dict]:
    """从 data/templates.json 加载模板数据，失败时 fallback 到 MOCK_TEMPLATES。"""
    data_path = os.path.join(os.path.dirname(__file__), "data", "templates.json")
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list) and len(data) > 0:
            return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    return MOCK_TEMPLATES


_TEMPLATES_DATA: Optional[List[dict]] = None


def _get_templates() -> List[dict]:
    """获取模板数据（懒加载 + 缓存）。"""
    global _TEMPLATES_DATA
    if _TEMPLATES_DATA is None:
        _TEMPLATES_DATA = _load_templates_data()
    return _TEMPLATES_DATA


class QueryTemplatesTool(BaseTool[QueryTemplatesInput, QueryTemplatesOutput]):
    """Tool for querying templates.

    Tier 2: 使用 data/templates.json 作为真实数据源，按风格分类搜索。
    """
    
    name = "query_templates"
    description = "搜索页面模板"
    tool_type = ToolType.READ
    permission = ToolPermission.PUBLIC
    
    async def execute(self, input_data: QueryTemplatesInput) -> QueryTemplatesOutput:
        """Search templates from real data source."""
        query = input_data.query.lower()
        style = input_data.style
        templates_data = _get_templates()
        
        results = []
        for template in templates_data:
            # Match by query (empty query matches all)
            if query:
                if not (query in template.get("name", "").lower() or
                        query in template.get("description", "").lower() or
                        query in template.get("style", "").lower()):
                    continue
            
            # Filter by style if specified
            if style and template.get("style") != style:
                continue
            
            results.append(Template(**template))
        
        # Limit results
        results = results[:input_data.limit]
        
        return QueryTemplatesOutput(
            templates=results,
            total=len(results)
        )
    
    def get_input_schema(self) -> type[QueryTemplatesInput]:
        return QueryTemplatesInput
    
    def get_output_schema(self) -> type[QueryTemplatesOutput]:
        return QueryTemplatesOutput
