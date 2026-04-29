"""Builder Agent - Tool orchestration for page generation.

Phase 1 MVP: LLM makes choices (components, templates, styles),
code assembles JSON. No LLM-generated JSON.

Workflow:
1. suggest_components(profile) → LLM chooses component list
2. query_templates(style_hint) → select base template
3. search_components() → get component definitions
4. apply_skill(style_id) → get style rules
5. generate_personalized_text() → LLM writes copy (not JSON)
6. assemble_config() → code assembles JSON
7. auto_layout() → code calculates positions
8. validate_config() → validate result
"""

from typing import Dict, Any, Optional, List, Callable
from ..tools.base import get_tool_registry
from ..tools.assemble_config import build_config
from ..tools.auto_layout import compute_layout
from ..tools.personalized_text import generate_text
from ..tools.suggest_components import suggest_components_by_profile
from ..tools.layout_strategy import LayoutStrategyTool, LayoutStrategyInput
from ..models.layout import LayoutStrategy


class BuilderAgent:
    """Builder Agent - orchestrates tools to build page config.

    Unlike DesignAgent which generates JSON via LLM,
    BuilderAgent uses LLM only for decision-making (which components,
    which template, which style), and uses code for JSON assembly.

    Two usage modes:
    1. Standalone: BuilderAgent(llm_call=fn)
    2. Via DesignAgent: DesignAgent(use_v2=True) → delegates to BuilderAgent
    """

    name = "Builder Agent"
    description = "工具编排 Agent,负责页面配置组装"

    def __init__(self, llm_call: Optional[Callable] = None):
        """Initialize BuilderAgent.

        Args:
            llm_call: Async function for LLM calls.
                      Signature: async (messages, schema=None) -> result
        """
        self._llm_call = llm_call
        self._tools = get_tool_registry()
        self._layout_strategy_tool: Optional[LayoutStrategyTool] = None
        self._workflow_steps: List[Dict[str, Any]] = []

    async def build(
        self,
        user_profile: Dict[str, Any],
        style_hint: str = "",
        theme_id: str = "sakura",
        skill_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run builder pipeline.

        Args:
            user_profile: User profile dict
            style_hint: Style hint from user input
            theme_id: Theme ID (sakura, night, lavender, etc.)
            skill_id: Skill ID to apply (e.g., sakura-style)

        Returns:
            {"config": dict, "reasoning": str, "component_count": int}
        """
        # Step 1: Suggest components (LLM decision or rule-based)
        component_types = await self._suggest_components(user_profile, theme_id)

        # Step 2: Get base template
        template = self._get_template(theme_id)

        # Step 3: Get component definitions
        component_defs = await self._get_component_definitions(component_types)

        # Step 4: Apply skill/style rules
        skill_rules = await self._apply_skill(skill_id or theme_id)

        # Step 5: Generate personalized texts (LLM writes copy, not JSON)
        personalized_texts = await self._generate_texts(
            component_types, user_profile, skill_rules
        )

        # Step 6: Assemble config (code, not LLM)
        config = build_config(
            template=template,
            components=component_defs,
            skill=skill_rules,
            personalized_texts=personalized_texts,
            profile=user_profile,
        )

        # Step 7: Auto layout (code calculates positions)
        config = self._apply_layout(config)

        # Step 8: Validate
        validation = await self._validate(config)

        reasoning = (
            f"包含 {len(component_types)} 个组件 "
            f"({', '.join(component_types[:4])}{'...' if len(component_types) > 4 else ''})，"
            f"校验{'通过' if validation.get('passed') else '未通过'}"
        )

        return {
            "config": config,
            "reasoning": reasoning,
            "component_count": len(component_types),
            "validation": validation,
        }

    # =========================================================================
    # Pipeline steps
    # =========================================================================

    async def _suggest_components(
        self, profile: Dict[str, Any], theme_id: str
    ) -> List[str]:
        """Step 1: Suggest component types."""
        if self._llm_call:
            try:
                from ..tools.suggest_components import SuggestComponentsTool

                tool = SuggestComponentsTool(llm_call=self._llm_call)
                from ..tools.suggest_components import SuggestComponentsInput

                result = await tool.execute(
                    SuggestComponentsInput(
                        profile=profile,
                        max_components=8,
                        style_hint=theme_id,
                    )
                )
                if result.component_types:
                    return result.component_types
            except Exception:
                pass

        # Fallback: rule-based
        return suggest_components_by_profile(
            profile, max_components=8, style_hint=theme_id
        )

    def _get_template(self, theme_id: str) -> Dict[str, Any]:
        """Step 2: Get base template for theme."""
        from ..tools.config import THEME_CONFIGS

        theme_data = THEME_CONFIGS.get(theme_id, THEME_CONFIGS["sakura"])

        return {
            "version": "1.0",
            "metadata": {
                "title": "我的个人主页",
                "description": "Heya Studio 生成的个人主页",
            },
            "theme": {
                "id": theme_id,
                "colors": theme_data.get("colors", {}),
                "fonts": theme_data.get("fonts", {}),
            },
            "layout": {
                "type": "single-column",
                "width": 680,
            },
            "components": [],
        }

    async def _get_component_definitions(
        self, component_types: List[str]
    ) -> List[Dict[str, Any]]:
        """Step 3: Get component definitions from registry or defaults."""
        definitions = []

        for comp_type in component_types:
            # Try search_components tool
            try:
                search_tool = self._tools.get("search_components")
                if search_tool:
                    from ..tools.components import SearchComponentsInput

                    result = await search_tool.execute(
                        SearchComponentsInput(query=comp_type, limit=1)
                    )
                    items = (
                        getattr(result, "results", [])
                        if hasattr(result, "results")
                        else []
                    )
                    if items:
                        item = items[0]
                        definitions.append(
                            {
                                "type": comp_type,
                                "props": item.get("default_props", {}),
                            }
                        )
                        continue
            except Exception:
                pass

            # Fallback: default props
            definitions.append(
                {
                    "type": comp_type,
                    "props": _get_default_props(comp_type),
                }
            )

        return definitions

    async def _apply_skill(self, skill_or_theme_id: str) -> Optional[Dict[str, Any]]:
        """Step 4: Apply skill/style rules."""
        try:
            from ..skills.loader import get_skill_loader

            loader = get_skill_loader()

            # Try skill_id directly
            skill = loader.get_skill(skill_or_theme_id)
            if not skill:
                # Try with -style suffix
                skill = loader.get_skill(f"{skill_or_theme_id}-style")

            if skill:
                return {
                    "colors": skill.colors.model_dump() if skill.colors else {},
                    "fonts": skill.fonts.model_dump() if skill.fonts else {},
                    "component_rules": skill.component_rules or {},
                    "required_components": skill.required_components or [],
                    "recommended_components": skill.recommended_components or [],
                    "prompt_suffix": skill.prompt_suffix or "",
                }
        except Exception:
            pass

        return None

    async def _generate_texts(
        self,
        component_types: List[str],
        profile: Dict[str, Any],
        skill_rules: Optional[Dict[str, Any]],
    ) -> Dict[str, str]:
        """Step 5: Generate personalized texts for components."""
        texts = {}

        # Components that need text generation
        text_components = {
            "hero-section",
            "quote",
            "oshi-card",
            "tag-group",
            "music-player",
        }

        context = ""
        if skill_rules and skill_rules.get("prompt_suffix"):
            context = skill_rules["prompt_suffix"]

        for comp_type in component_types:
            if comp_type not in text_components:
                continue

            if self._llm_call:
                try:
                    from ..tools.personalized_text import (
                        GeneratePersonalizedTextTool,
                        PersonalizedTextInput,
                    )

                    tool = GeneratePersonalizedTextTool(llm_call=self._llm_call)
                    result = await tool.execute(
                        PersonalizedTextInput(
                            component_type=comp_type,
                            profile=profile,
                            context=context,
                            max_length=100,
                        )
                    )
                    texts[comp_type] = result.text
                    continue
                except Exception:
                    pass

            # Fallback
            texts[comp_type] = generate_text(comp_type, profile)

        return texts

    def _apply_layout(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Step 7: Apply auto layout."""
        components = config.get("components", [])
        if not components:
            return config

        try:
            updated_components, canvas_height = compute_layout(
                components=components,
                canvas_width=config.get("layout", {}).get("width", 680),
                layout_type=config.get("layout", {}).get("type", "single-column"),
            )
            config["components"] = updated_components
        except Exception:
            pass

        return config

    async def _validate(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Step 8: Validate config."""
        try:
            validate_tool = self._tools.get("validate_config")
            if validate_tool:
                from ..tools.config import ValidateConfigInput

                result = await validate_tool.execute(
                    ValidateConfigInput(config=config)
                )
                return {
                    "passed": result.passed,
                    "score": result.score,
                    "issues": [i.message for i in result.issues],
                }
        except Exception:
            pass

        return {"passed": True, "score": 100, "issues": []}


# ============================================================================
# Default component props
# ============================================================================

def _get_default_props(comp_type: str) -> Dict[str, Any]:
    """Get default props for a component type."""
    defaults = {
        "hero-section": {
            "name": "{{user.name}}",
            "signature": "{{user.signature}}",
            "avatarUrl": "",
        },
        "oshi-card": {
            "name": "{{oshi.name}}",
            "fromWork": "{{oshi.from_work}}",
            "description": "{{oshi.description}}",
        },
        "attribute-wall": {
            "attributes": {
                "MBTI": "{{user.mbti}}",
            },
        },
        "tag-group": {
            "tags": [],
            "title": "我的标签",
        },
        "quote": {
            "text": "做自己，不被定义 ✨",
            "author": "",
        },
        "social-links": {
            "links": [],
        },
        "music-player": {
            "title": "正在播放...",
            "artist": "",
        },
        "friends-list": {
            "friends": [],
        },
        "media-list": {
            "items": [],
        },
        "guestbook": {
            "messages": [],
        },
        "watchlist": {
            "items": [],
        },
        "gallery": {
            "title": "我的创作",
            "images": [],
        },
        "achievement-badges": {
            "title": "我的成就",
            "badges": [],
        },
        "memorial-calendar": {
            "title": "重要纪念日",
            "events": [],
        },
        "cp-card": {
            "character1": {"name": "角色1"},
            "character2": {"name": "角色2"},
        },
        "support-record": {
            "title": "我的应援",
            "records": [],
        },
        "divider": {},
        "spacer": {},
    }
    return defaults.get(comp_type, {})
