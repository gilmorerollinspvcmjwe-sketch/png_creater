"""Skill loader - loads skill definitions from YAML files.

Tier 3 改进项 #2: 扩展 Skills 能力
- 新增 required_components / recommended_components / component_rules 字段
- component_rules 支持嵌套 dict 结构（如 quote: {style: cursive, animation: fade-in}）
- 支持 prompt_suffix 注入风格特定指导
- 保持向后兼容：旧 YAML 没有这些字段也能正常加载

Tier 3 改进项 #4: 增强 Skill 匹配算法
- 从纯关键词计数升级为关键词(0.4) + MBTI(0.3) + 风格偏好(0.3) 的加权匹配
- 返回 MatchResult 包含详细匹配信息
- match_skill() 返回 Tuple[Skill, MatchResult] 以提供完整匹配上下文
"""

import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field


class MatchResult(BaseModel):
    """Skill 匹配结果，包含详细匹配信息。

    Attributes:
        skill_id: 匹配到的 skill ID
        score: 加权匹配分数 (0.0 ~ 1.0)
        matched_keywords: 命中的关键词列表
        matched_mbti: 是否命中 MBTI 匹配
    """
    skill_id: str
    score: float
    matched_keywords: List[str] = Field(default_factory=list)
    matched_mbti: bool = False


class Skill(BaseModel):
    """Skill definition (SkillDefinition).

    Tier 3: 新增 required_components, recommended_components, component_rules, prompt_suffix 字段。
    这些字段均为可选，保持向后兼容：旧 YAML 没有这些字段时使用默认值。

    Attributes:
        id: 唯一标识符，如 "sakura-style"
        name: 显示名称
        version: 版本号
        description: 描述
        triggers: 触发条件（keywords, mbti 列表）
        colors: 主题色配置
        fonts: 字体配置
        effects: 特效配置列表
        constraints: 约束条件
        prompt_suffix: 追加到 LLM prompt 末尾的风格指导文本
        required_components: 该风格下必须包含的组件类型列表
        recommended_components: 推荐但不强制的组件类型列表
        component_rules: 组件级规则，嵌套 dict 结构
    """
    id: str
    name: str
    version: str = "1.0.0"
    description: str = ""

    # Trigger conditions
    triggers: Dict[str, List[str]] = Field(default_factory=dict)

    # Configuration
    colors: Optional[Dict[str, str]] = None
    fonts: Optional[Dict[str, str]] = None
    effects: Optional[List[Dict[str, Any]]] = None

    # Constraints
    constraints: Dict[str, Any] = Field(default_factory=dict)

    # Prompt suffix - 风格特定的 LLM 提示词后缀
    prompt_suffix: str = ""

    # Tier 3: 新增字段 - 组件组合和规则
    required_components: List[str] = Field(
        default_factory=list,
        description="该风格下必须包含的组件类型"
    )
    recommended_components: List[str] = Field(
        default_factory=list,
        description="推荐但不强制的组件类型"
    )
    component_rules: Dict[str, Any] = Field(
        default_factory=dict,
        description="组件级规则，嵌套 dict 结构，如 {quote: {style: cursive, animation: fade-in}}"
    )


# 风格偏好关键词列表，用于加权匹配中的风格偏好维度
STYLE_KEYWORDS = [
    "赛博", "朋克", "cyber", "樱花", "sakura", "薰衣草",
    "薄荷", "极简", "像素", "奶油"
]


class SkillLoader:
    """Loads and manages skills.

    负责从 YAML 文件加载 Skill 定义，并提供基于用户输入和画像的加权匹配算法。
    """

    def __init__(self, skills_dir: str = "src/skills"):
        self.skills_dir = Path(skills_dir)
        self.skills: Dict[str, Skill] = {}
        self.catalog: List[Dict[str, str]] = []

    def load_all(self):
        """Load all skills from directory.

        从 skills_dir 目录加载所有 .yaml 文件。
        如果目录不存在或没有加载到任何 skill，则回退到内置默认 skill。
        新增字段（required_components, recommended_components, prompt_suffix, component_rules）
        均为可选，旧 YAML 没有这些字段也能正常加载。
        """
        if not self.skills_dir.exists():
            self._load_default_skills()
            return

        for skill_file in self.skills_dir.glob("*.yaml"):
            try:
                skill = self._load_skill(skill_file)
                self.skills[skill.id] = skill
                self.catalog.append({
                    "id": skill.id,
                    "name": skill.name,
                    "description": skill.description
                })
            except Exception as e:
                from ..utils.logger import logger
                logger.error("Failed to load skill", skill_file=str(skill_file), error=str(e))

        # Add default skills if none loaded
        if not self.skills:
            self._load_default_skills()

    def _load_skill(self, file_path: Path) -> Skill:
        """Load single skill from YAML.

        Pydantic 模型的默认值保证了向后兼容：
        缺少 required_components 等字段时自动使用空列表/空字典/空字符串。
        """
        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        return Skill(**data)

    def _load_default_skills(self):
        """Load default built-in skills.

        当 YAML 文件目录不存在或为空时，使用内置的 sakura 和 cyberpunk 两个默认风格。
        """
        # Sakura skill
        sakura = Skill(
            id="sakura-style",
            name="樱花萌系风格包",
            version="1.0.0",
            description="温柔浪漫的樱花粉色系，适合二次元萌系爱好者",
            triggers={
                "keywords": ["樱花", "粉色", "萌系", "甜甜的", "可爱"],
                "mbti": ["INFP", "ENFP", "ISFJ", "ESFJ"]
            },
            colors={
                "primary": "#F2A7B3",
                "secondary": "#FFEEF2",
                "accent": "#E8D4E8",
                "text": "#2A2A2A",
                "background": "#FFF5F8"
            },
            fonts={
                "heading": "Noto Sans SC",
                "body": "Noto Sans SC"
            },
            effects=[
                {"type": "particles", "config": {"shape": "sakura", "count": 30}}
            ],
            constraints={
                "min_components": 3,
                "max_components": 8,
                "background_must_be_light": True
            },
            prompt_suffix="请使用温柔的粉色系配色，营造浪漫梦幻的氛围。",
            required_components=["hero-section", "quote"],
            recommended_components=["tag-group", "music-player", "social-links"],
            component_rules={
                "quote": {"style": "cursive", "animation": "fade-in"},
                "hero-section": {"decoration": "petals"}
            }
        )

        # Cyberpunk skill
        cyberpunk = Skill(
            id="cyberpunk-style",
            name="赛博朋克风格包",
            version="1.0.0",
            description="酷炫的赛博朋克科技风，霓虹配色和电子元素",
            triggers={
                "keywords": ["赛博", "朋克", "科技", "霓虹", "酷炫"],
                "mbti": ["INTJ", "ENTP", "INTP", "ENTJ"]
            },
            colors={
                "primary": "#4A90D9",
                "secondary": "#1A1A2A",
                "accent": "#00D4FF",
                "text": "#FFFFFF",
                "background": "#0D0D1A"
            },
            fonts={
                "heading": "Orbitron",
                "body": "Noto Sans SC"
            },
            effects=[
                {"type": "glow", "config": {"color": "#00D4FF"}},
                {"type": "scanlines", "config": {"opacity": 0.1}}
            ],
            constraints={
                "min_components": 4,
                "max_components": 10,
                "background_must_be_dark": True
            },
            prompt_suffix="请使用霓虹色彩，营造科技感十足的氛围。",
            required_components=["hero-section", "glitch-text", "attribute-wall"],
            recommended_components=["music-player", "social-links", "tag-group"],
            component_rules={
                "quote": {"style": "typewriter", "animation": "glitch"},
                "hero-section": {"decoration": "circuit-lines", "animation": "glitch"},
                "attribute-wall": {"style": "neon-border"}
            }
        )

        self.skills[sakura.id] = sakura
        self.skills[cyberpunk.id] = cyberpunk

        self.catalog = [
            {"id": sakura.id, "name": sakura.name, "description": sakura.description},
            {"id": cyberpunk.id, "name": cyberpunk.name, "description": cyberpunk.description}
        ]

    def get_skill(self, skill_id: str) -> Optional[Skill]:
        """Get skill by ID."""
        return self.skills.get(skill_id)

    def match_skill(
        self, user_input: str, user_profile: Dict[str, Any] = None
    ) -> Optional[Tuple[Skill, MatchResult]]:
        """Match skill based on user input and profile.

        Tier 3 改进项 #4: 加权匹配算法
        - 关键词匹配（0.4 权重）
        - MBTI 匹配（0.3 权重）
        - 风格偏好匹配（0.3 权重）

        Returns:
            Tuple[Skill, MatchResult] 包含匹配到的 Skill 和详细匹配信息，
            无匹配时返回 None。
            向后兼容提示：调用方如果之前用 `skill = match_skill(...)` 获取 Skill 对象，
            现在需要改为 `result = match_skill(...); skill = result[0] if result else None`。
        """
        user_input_lower = user_input.lower()

        best_match: Optional[Skill] = None
        best_result: Optional[MatchResult] = None

        for skill in self.skills.values():
            result = self._calculate_match_score(skill, user_input_lower, user_profile)
            if result.score > 0 and (best_result is None or result.score > best_result.score):
                best_result = result
                best_match = skill

        if best_match and best_result:
            return (best_match, best_result)
        return None

    def match_skill_detailed(
        self, user_input: str, user_profile: Dict[str, Any] = None
    ) -> Optional[MatchResult]:
        """Match skill and return detailed MatchResult only.

        便捷方法，仅返回 MatchResult 不返回 Skill 对象。
        """
        user_input_lower = user_input.lower()

        best_result: Optional[MatchResult] = None

        for skill in self.skills.values():
            result = self._calculate_match_score(skill, user_input_lower, user_profile)
            if result.score > 0 and (best_result is None or result.score > best_result.score):
                best_result = result

        return best_result

    def _calculate_match_score(
        self, skill: Skill, user_input_lower: str, user_profile: Optional[Dict[str, Any]]
    ) -> MatchResult:
        """Calculate weighted match score.

        Tier 3 改进项 #4: 加权匹配算法
        三个维度的加权得分：

        1. 关键词匹配 (权重 0.4)：
           匹配到的关键词数 / 总关键词数 * 0.4

        2. MBTI 匹配 (权重 0.3)：
           用户 MBTI 在 skill 的 mbti 触发列表中时加 0.3

        3. 风格偏好匹配 (权重 0.3)：
           用户输入中包含风格关键词时，每个匹配 +0.1，上限 0.3
           风格关键词：赛博/朋克/cyber/樱花/sakura/薰衣草/薄荷/极简/像素/奶油

        总分上限 1.0。

        Args:
            skill: 待评分的 Skill
            user_input_lower: 用户输入（已转小写）
            user_profile: 用户画像 dict，可选

        Returns:
            MatchResult 包含 skill_id, score, matched_keywords, matched_mbti
        """
        total_score = 0.0
        matched_keywords: List[str] = []
        matched_mbti = False

        # === 1. 关键词匹配 (权重 0.4) ===
        keywords = skill.triggers.get("keywords", [])
        if keywords:
            matched_count = sum(1 for kw in keywords if kw.lower() in user_input_lower)
            keyword_score = matched_count / len(keywords)
            total_score += keyword_score * 0.4
            matched_keywords = [kw for kw in keywords if kw.lower() in user_input_lower]

        # === 2. MBTI 匹配 (权重 0.3) ===
        if user_profile:
            user_mbti = user_profile.get("mbti", "").upper()
            if user_mbti and user_mbti in skill.triggers.get("mbti", []):
                total_score += 0.3
                matched_mbti = True

        # === 3. 风格偏好匹配 (权重 0.3) ===
        matched_style = sum(1 for kw in STYLE_KEYWORDS if kw in user_input_lower)
        if matched_style > 0:
            total_score += min(matched_style * 0.1, 0.3)

        return MatchResult(
            skill_id=skill.id,
            score=min(total_score, 1.0),  # 上限 1.0
            matched_keywords=matched_keywords,
            matched_mbti=matched_mbti
        )

    def get_catalog(self) -> List[Dict[str, str]]:
        """Get skill catalog."""
        return self.catalog


# Global skill loader
skill_loader: Optional[SkillLoader] = None


def get_skill_loader() -> SkillLoader:
    """Get global skill loader."""
    global skill_loader
    if skill_loader is None:
        from ..config import config
        skill_loader = SkillLoader(skills_dir=config.skills_dir)
        skill_loader.load_all()
    return skill_loader
