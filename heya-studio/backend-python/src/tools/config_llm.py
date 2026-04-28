"""LLM-driven config generation tool.

Uses the LLM to generate a full page config based on user profile and theme.
Falls back to hardcoded generation if LLM fails quality checks.

Tier 2 改进项 #1: LLM 输出校验增强
- JSON schema 合法性验证（pydantic 校验）
- 组件数量检查（5-7 个）
- 组件 y 坐标递增检查（间隔 120-150px）
- 组件 ID 唯一性检查
- props 中无 XSS payload（HTML 转义）
- 失败时返回详细错误信息，用于 Self-Reflection 评估
"""

from typing import Dict, Any, Optional, List
import html
import re as _re
from pydantic import BaseModel, Field, ValidationError
from .base import BaseTool, ToolType, ToolPermission
from ..models.page import (
    BackendPageConfig,
    BackendComponentConfig,
    ComponentPosition,
    ThemeConfig,
    ThemeColors,
    ThemeFonts,
    LayoutConfig,
    PageMetadata,
    create_hero_section,
    create_oshi_card,
    create_attribute_wall,
    create_tag_group,
    create_music_player,
    create_social_links,
    create_quote,
)
from ..prompts import CONFIG_GENERATE_SYSTEM_PROMPT
from ..memory.feedback import feedback_memory

# Theme configurations
THEME_CONFIGS = {
    "sakura": {
        "colors": {"primary": "#F2A7B3", "secondary": "#FFEEF2", "accent": "#E8D4E8", "text": "#2A2A2A", "background": "#FFF5F8"},
        "fonts": {"heading": "Noto Sans SC", "body": "Noto Sans SC"}
    },
    "lavender": {
        "colors": {"primary": "#B8A9C9", "secondary": "#E6E0F0", "accent": "#D4C5E0", "text": "#2A2A2A", "background": "#F5F0FA"},
        "fonts": {"heading": "Noto Sans SC", "body": "Noto Sans SC"}
    },
    "mint": {
        "colors": {"primary": "#98D4BB", "secondary": "#E0F5E8", "accent": "#C4E4D0", "text": "#2A2A2A", "background": "#F5FAF8"},
        "fonts": {"heading": "Noto Sans SC", "body": "Noto Sans SC"}
    },
    "cream": {
        "colors": {"primary": "#E8D4B8", "secondary": "#F5F0E8", "accent": "#D4C4A8", "text": "#2A2A2A", "background": "#FAF8F5"},
        "fonts": {"heading": "Noto Sans SC", "body": "Noto Sans SC"}
    },
    "night": {
        "colors": {"primary": "#4A90D9", "secondary": "#1A1A2A", "accent": "#00D4FF", "text": "#FFFFFF", "background": "#0D0D1A"},
        "fonts": {"heading": "Orbitron", "body": "Noto Sans SC"}
    },
    "cyberpunk": {
        "colors": {"primary": "#4A90D9", "secondary": "#1A1A2A", "accent": "#00D4FF", "text": "#FFFFFF", "background": "#0D0D1A"},
        "fonts": {"heading": "Orbitron", "body": "Noto Sans SC"}
    },
    "pixel": {
        "colors": {"primary": "#4CAF50", "secondary": "#2E7D32", "accent": "#8BC34A", "text": "#1B5E20", "background": "#C8E6C9"},
        "fonts": {"heading": "Press Start 2P", "body": "Noto Sans SC"}
    },
    "mono": {
        "colors": {"primary": "#333333", "secondary": "#FFFFFF", "accent": "#666666", "text": "#1A1A1A", "background": "#FFFFFF"},
        "fonts": {"heading": "Noto Sans SC", "body": "Noto Sans SC"}
    },
    "millennial": {
        "colors": {"primary": "#FF6B6B", "secondary": "#4ECDC4", "accent": "#FFE66D", "text": "#2A2A2A", "background": "#F7F7F7"},
        "fonts": {"heading": "Montserrat", "body": "Noto Sans SC"}
    }
}


class GenerateConfigInput(BaseModel):
    """Input for config generation."""
    user_profile: Dict[str, Any] = Field(..., description="User profile data")
    theme_id: str = Field(default="sakura", description="Theme ID")
    rewrite_guidance: Optional[List[str]] = Field(None, description="Self-reflection improvement suggestions")


class GenerateConfigOutput(BaseModel):
    """Output for config generation."""
    config: BackendPageConfig
    reasoning: str = ""
    quality_errors: List[str] = Field(default_factory=list, description="质量检查错误列表，用于 Self-Reflection")


class GenerateConfigLLMTool(BaseTool[GenerateConfigInput, GenerateConfigOutput]):
    """
    LLM-driven config generation tool.
    
    Generates config via LLM with quality checks.
    Falls back to hardcoded generation if LLM fails.
    """
    
    name = "generate_config_llm"
    description = "使用 LLM 生成页面配置"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED
    
    def __init__(self, llm_call=None):
        self._llm_call = llm_call
    
    async def execute(self, input_data: GenerateConfigInput) -> GenerateConfigOutput:
        """Generate page config using LLM, with hardcoded fallback."""
        profile = input_data.user_profile
        theme_id = input_data.theme_id
        rewrite_guidance = input_data.rewrite_guidance
        
        # Try LLM generation first
        if self._llm_call:
            try:
                config = await self._generate_with_llm(profile, theme_id, rewrite_guidance)
                if config and config.components and len(config.components) >= 3:
                    # Enhanced quality check (Tier 2)
                    passed, quality_errors = self._check_quality(config, profile)
                    if passed:
                        return GenerateConfigOutput(
                            config=config,
                            reasoning=f"LLM 基于用户画像生成{theme_id}风格主页",
                            quality_errors=[]
                        )
                    else:
                        from ..utils.logger import logger
                        logger.warning("LLM 输出质量检查未通过", errors=str(quality_errors[:3]))
                        # 返回带有质量错误信息的结果，供 Self-Reflection 使用
                        return GenerateConfigOutput(
                            config=config,
                            reasoning=f"LLM 生成但质量检查发现 {len(quality_errors)} 个问题",
                            quality_errors=quality_errors
                        )
            except Exception as e:
                from ..utils.logger import logger
                logger.error("LLM 生成异常", error=str(e))
        
        # Fallback to hardcoded
        return await self._generate_hardcoded(input_data)
    
    def _check_quality(self, config: BackendPageConfig, profile: Dict[str, Any]) -> tuple:
        """Check if LLM output properly uses profile data and meets quality standards.

        Tier 2 增强校验维度:
        1. Pydantic schema 合法性验证
        2. 组件数量检查（5-7 个）
        3. 组件 y 坐标递增检查（间隔 120-150px）
        4. 组件 ID 唯一性检查
        5. props 中无 XSS payload（HTML 转义检查）
        6. Profile 数据使用检查（MBTI、oshi）

        Returns:
            tuple: (passed: bool, errors: List[str])
        """
        errors: List[str] = []

        # === 1. Pydantic schema 合法性验证 ===
        try:
            BackendPageConfig.model_validate(config.model_dump())
        except ValidationError as e:
            errors.append(f"Schema 校验失败: {str(e)[:200]}")

        if not config.components:
            errors.append("配置中没有任何组件")
            return (False, errors)

        # === 2. 组件数量检查（5-7 个） ===
        comp_count = len(config.components)
        if comp_count < 5:
            errors.append(f"组件数量不足: 期望 5-7 个，实际 {comp_count} 个")
        elif comp_count > 7:
            errors.append(f"组件数量过多: 期望 5-7 个，实际 {comp_count} 个")

        # === 3. 组件 y 坐标递增检查 ===
        y_values = []
        for comp in config.components:
            if comp.position:
                y_values.append(comp.position.y)
        if len(y_values) >= 2:
            for i in range(1, len(y_values)):
                gap = y_values[i] - y_values[i - 1]
                if gap < 0:
                    errors.append(
                        f"组件 y 坐标未递增: 第{i}个 y={y_values[i-1]} → 第{i+1}个 y={y_values[i]}"
                    )
                elif 0 < gap < 120:
                    errors.append(
                        f"组件间距过小: 第{i}→{i+1}个组件间距 {gap}px，建议 120-150px"
                    )

        # === 4. 组件 ID 唯一性检查 ===
        seen_ids = set()
        for comp in config.components:
            if comp.id in seen_ids:
                errors.append(f"组件 ID 重复: '{comp.id}'")
            seen_ids.add(comp.id)

        # === 5. Props 中无 XSS payload ===
        xss_patterns = [
            _re.compile(r'<script[^>]*>', _re.IGNORECASE),
            _re.compile(r'javascript\s*:', _re.IGNORECASE),
            _re.compile(r'on\w+\s*=', _re.IGNORECASE),
            _re.compile(r'<iframe[^>]*>', _re.IGNORECASE),
            _re.compile(r'<embed[^>]*>', _re.IGNORECASE),
            _re.compile(r'<object[^>]*>', _re.IGNORECASE),
        ]
        for comp in config.components:
            if comp.props:
                props_str = str(comp.props)
                for pattern in xss_patterns:
                    if pattern.search(props_str):
                        errors.append(
                            f"组件 '{comp.id}' 的 props 中检测到潜在 XSS payload"
                        )
                        self._sanitize_props(comp.props)
                        break

        # === 6. Profile 数据使用检查 ===
        if profile:
            if profile.get("mbti"):
                mbti_found = False
                for comp in config.components:
                    if comp.props:
                        attrs = comp.props.get("attributes", {})
                        if attrs and attrs.get("MBTI") == profile["mbti"]:
                            mbti_found = True
                            break
                if not mbti_found:
                    errors.append(f"未正确使用 MBTI 数据: 期望 '{profile['mbti']}'")

            if profile.get("oshi") and len(profile["oshi"]) > 0:
                oshi_name = profile["oshi"][0].get("name", "")
                if oshi_name:
                    oshi_found = False
                    for comp in config.components:
                        if comp.type == "oshi-card" and comp.props:
                            name = comp.props.get("name", "")
                            if oshi_name in name and name not in ["推", "用户"]:
                                oshi_found = True
                                break
                    if not oshi_found:
                        errors.append(f"未正确使用推数据: 期望包含 '{oshi_name}'")

        passed = len(errors) == 0
        return (passed, errors)

    @staticmethod
    def _sanitize_props(props: Dict[str, Any]) -> None:
        """递归清理 props 中的 XSS payload，对字符串值进行 HTML 转义。"""
        for key, value in props.items():
            if isinstance(value, str):
                props[key] = html.escape(value)
            elif isinstance(value, dict):
                GenerateConfigLLMTool._sanitize_props(value)
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, str):
                        props[key][i] = html.escape(item)
                    elif isinstance(item, dict):
                        GenerateConfigLLMTool._sanitize_props(item)

    @staticmethod
    def _validate_raw_llm_json(data: Dict[str, Any]) -> List[str]:
        """对 LLM 返回的原始 JSON 进行预校验。

        在 _parse_config 之前调用，检查基本结构是否符合预期。

        Returns:
            List[str]: 校验错误列表，空则通过
        """
        errors = []
        components = data.get("components", [])
        if not isinstance(components, list):
            errors.append("原始 JSON 中 'components' 不是数组")
            return errors
        if len(components) == 0:
            errors.append("原始 JSON 中 'components' 为空")
        for i, comp in enumerate(components):
            if not isinstance(comp, dict):
                errors.append(f"第 {i+1} 个组件不是对象")
                continue
            if "type" not in comp:
                errors.append(f"第 {i+1} 个组件缺少 'type' 字段")
            if "id" not in comp:
                errors.append(f"第 {i+1} 个组件缺少 'id' 字段")
        return errors
    
    async def _generate_with_llm(self, profile: Dict[str, Any], theme_id: str, rewrite_guidance: Optional[List[str]] = None, skill_context: Optional[Dict[str, Any]] = None) -> Optional[BackendPageConfig]:
        """Generate config using LLM.
        
        Tier 3 改进项 #2d: 在配置生成中使用 Skill 增强
        - 如果当前风格有 prompt_suffix，追加到 user_prompt 末尾
        - 如果当前风格有 required_components，在 prompt 中明确列出
        - 如果当前风格有 component_rules，追加组件级规则到 prompt
        
        Tier 3 改进项 #3c: 在配置生成中检索 Feedback
        - 生成前检索相关 feedback，追加到 prompt
        
        Args:
            skill_context: 可选，包含 prompt_suffix, required_components, component_rules 等
        """
        theme_data = THEME_CONFIGS.get(theme_id, THEME_CONFIGS["sakura"])
        
        # Build prompt with explicit instructions to use profile data
        profile_summary = []
        if profile.get("mbti"):
            profile_summary.append(f"- MBTI: {profile['mbti']}")
        if profile.get("oshi"):
            for o in profile["oshi"]:
                profile_summary.append(f"- 推: {o.get('name', '未知')}")
        if profile.get("hobbies"):
            profile_summary.append(f"- 爱好: {', '.join(profile['hobbies'][:5])}")
        if profile.get("zodiac"):
            profile_summary.append(f"- 星座: {profile['zodiac']}")
        
        profile_text = "\n".join(profile_summary) if profile_summary else "无特定信息"
        
        # 如果有改进建议，添加到 prompt
        guidance_text = ""
        if rewrite_guidance:
            guidance_text = f"""
## 改进建议（来自上一轮自我评估）
请特别注意以下问题并改进：
{chr(10).join(f'- {g}' for g in rewrite_guidance)}
"""
        
        # Tier 3 改进项 #3c: 检索相关反馈并追加到 prompt
        feedback_text = ""
        try:
            from ..memory.feedback import get_feedback_memory
            fb_memory = get_feedback_memory()
            # 用 profile 摘要作为检索关键词
            search_text = profile_text
            relevant_feedback = fb_memory.get_relevant_feedback(search_text, max_results=5)
            if relevant_feedback:
                feedback_lines = "\n".join(f"- {fb.feedback_text}" for fb in relevant_feedback)
                feedback_text = f"""\n## 用户之前的反馈\n请在生成时注意以下偏好：\n{feedback_lines}\n"""
        except Exception:
            pass  # Feedback memory 未初始化时跳过
        
        # Tier 3 改进项 #2d: Skill 增强 prompt
        skill_text = ""
        if skill_context:
            # 必须包含的组件
            req_components = skill_context.get("required_components", [])
            if req_components:
                skill_text += f"\n## 风格要求\n本风格必须包含以下组件：{', '.join(req_components)}\n"
            # prompt_suffix
            prompt_suffix = skill_context.get("prompt_suffix", "")
            if prompt_suffix:
                skill_text += f"\n## 风格特定指导\n{prompt_suffix}\n"
            # component_rules - 组件级规则
            component_rules = skill_context.get("component_rules", {})
            if component_rules:
                rules_lines = []
                for comp_type, rules in component_rules.items():
                    if isinstance(rules, dict):
                        rule_details = ", ".join(f"{k}: {v}" for k, v in rules.items())
                        rules_lines.append(f"- {comp_type}: {rule_details}")
                    else:
                        rules_lines.append(f"- {comp_type}: {rules}")
                skill_text += f"\n## 组件级规则\n以下是各组件的样式和行为规则：\n" + "\n".join(rules_lines) + "\n"

        user_prompt = f"""请生成完整的页面配置。{guidance_text}

## 用户画像
{profile_text}

## 选定风格
{theme_id}{feedback_text}{skill_text}

## 强制要求
1. hero-section 的 name 必须用推的名字（如果有推），例如"绫波丽"
2. hero-section 的 attributes 必须包含 MBTI，例如 {{"MBTI": "{profile.get('mbti', '')}"}}
3. 有推必须生成 oshi-card，name 字段用推的真实名字
4. 有 MBTI 必须生成 attribute-wall，attributes 包含 MBTI
5. 不要用"用户"、"推"等占位符

## 可用组件
hero-section, oshi-card, attribute-wall, tag-group, social-links, quote, music-player

输出完整 JSON，包含 components 数组，每个组件有 id, type, props, position。"""

        messages = [
            {"role": "system", "content": CONFIG_GENERATE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        
        response = await self._llm_call(messages)
        content = response.content if hasattr(response, 'content') else response.get("content", "")
        
        # Parse JSON from LLM response
        import json
        import re
        
        json_match = re.search(r'```(?:json)?\s*\n?({[\s\S]+?})\s*\n?```', content)
        if not json_match:
            json_match = re.search(r'({[\s\S]*"components"[\s\S]*})', content)
        
        if json_match:
            raw_json_str = json_match.group(1)
            data = json.loads(raw_json_str)

            # Tier 2: 先用预校验检查原始 JSON 结构
            validation_errors = self._validate_raw_llm_json(data)
            if validation_errors:
                from ..utils.logger import logger
                logger.warning("LLM 原始 JSON 预校验发现问题", errors=str(validation_errors[:3]))

            result = self._parse_config(data, theme_id, theme_data, profile)
            from ..utils.logger import logger
            logger.debug("_parse_config result", result=str(result)[:200])
            return result
        
        from ..utils.logger import logger
        logger.debug("No JSON found in LLM response")
        return None
    
    def _parse_config(self, data: Dict[str, Any], theme_id: str, theme_data: Dict[str, Any], profile: Dict[str, Any]) -> Optional[BackendPageConfig]:
        """Parse LLM output into BackendPageConfig, then post-process to inject profile data."""
        try:
            components_data = data.get("components", [])
            components = []
            has_attribute_wall = False
            
            for i, comp in enumerate(components_data):
                comp_type = comp.get("type", "text")
                props = comp.get("props", {})
                position = comp.get("position", {"x": 0, "y": i * 210, "width": 680, "height": 200})
                
                # === Post-process: inject profile data into props BEFORE creating component ===
                if comp_type == "hero-section":
                    # Hero name: prefer oshi name
                    if profile.get("oshi") and profile["oshi"]:
                        props["name"] = profile["oshi"][0].get("name", props.get("name", "用户"))
                    # Ensure MBTI is in attributes
                    if profile.get("mbti"):
                        attrs = props.get("attributes", {})
                        attrs["MBTI"] = profile["mbti"]
                        props["attributes"] = attrs
                elif comp_type == "oshi-card":
                    # Oshi name: ALWAYS use profile, never placeholder
                    if profile.get("oshi") and profile["oshi"]:
                        props["name"] = profile["oshi"][0].get("name", props.get("name", "推"))
                    if profile.get("from_work"):
                        props["from_work"] = profile["from_work"]
                elif comp_type == "attribute-wall":
                    has_attribute_wall = True
                    if profile.get("mbti"):
                        attrs = props.get("attributes", {})
                        attrs["MBTI"] = profile["mbti"]
                        props["attributes"] = attrs
                
                component = self._create_component(comp_type, props, position, comp.get("id", f"{comp_type}-{i}"), profile)
                if component:
                    components.append(component)
            
            # Post-process: add attribute-wall if missing but MBTI exists
            if profile.get("mbti") and not has_attribute_wall:
                wall = create_attribute_wall(mbti=profile["mbti"])
                wall.id = "attribute-wall"
                y_pos = len(components) * 120
                wall.position = ComponentPosition(x=0, y=y_pos, width=680, height=100)
                components.append(wall)
            
            if not components:
                return None
            
            return BackendPageConfig(
                version=data.get("version", "1.0"),
                metadata=PageMetadata(
                    title=data.get("metadata", {}).get("title", "个人主页"),
                    description=data.get("metadata", {}).get("description", "Heya Studio 生成的主页")
                ),
                theme=ThemeConfig(
                    id=theme_id,
                    colors=ThemeColors(**theme_data["colors"]),
                    fonts=ThemeFonts(**theme_data["fonts"])
                ),
                layout=LayoutConfig(type="single-column", width=680),
                components=components
            )
        except Exception as e:
            import traceback
            from ..utils.logger import logger
            logger.error("_parse_config error", error=str(e))
            logger.debug(traceback.format_exc())
            return None
    
    def _create_component(self, comp_type: str, props: Dict[str, Any], position: Dict[str, Any], comp_id: str, profile: Dict[str, Any]):
        """Create a typed component from LLM output."""
        try:
            if comp_type == "hero-section":
                name = props.get("name", "用户")
                # Use oshi name if available and LLM didn't provide one
                if name in ["用户", "User"] and profile.get("oshi") and profile["oshi"]:
                    name = profile["oshi"][0].get("name", name)
                comp = create_hero_section(
                    name=name,
                    signature=props.get("signature", "个性签名"),
                    attributes=props.get("attributes", {})
                )
                # Ensure MBTI is set from profile
                if profile.get("mbti") and "MBTI" not in comp.props.get("attributes", {}):
                    comp.props["attributes"] = comp.props.get("attributes", {})
                    comp.props["attributes"]["MBTI"] = profile["mbti"]
            elif comp_type == "oshi-card":
                name = props.get("name", "推")
                # Use oshi name from profile if LLM used placeholder
                if name == "推" and profile.get("oshi") and profile["oshi"]:
                    name = profile["oshi"][0].get("name", name)
                comp = create_oshi_card(
                    name=name,
                    from_work=props.get("from_work"),
                    description=props.get("description")
                )
            elif comp_type == "attribute-wall":
                comp = create_attribute_wall(
                    mbti=props.get("attributes", {}).get("MBTI") or profile.get("mbti"),
                    zodiac=props.get("attributes", {}).get("星座"),
                    blood_type=props.get("attributes", {}).get("血型")
                )
            elif comp_type == "tag-group":
                comp = create_tag_group(
                    tags=props.get("tags", profile.get("hobbies", [])[:5]),
                    title=props.get("title", "爱好")
                )
            elif comp_type == "quote":
                comp = create_quote(text=props.get("text", "个性签名"))
            elif comp_type == "music-player":
                comp = create_music_player()
            elif comp_type == "social-links":
                comp = create_social_links(links=props.get("links", []))
            else:
                return None
            
            comp.id = comp_id
            comp.position = ComponentPosition(
                x=position.get("x", 0),
                y=position.get("y", 0),
                width=position.get("width", 680),
                height=position.get("height", 200)
            )
            return comp
        except Exception:
            return None
    
    async def _generate_hardcoded(self, input_data: GenerateConfigInput) -> GenerateConfigOutput:
        """Fallback: hardcoded config generation."""
        profile = input_data.user_profile
        theme_id = input_data.theme_id
        theme_data = THEME_CONFIGS.get(theme_id, THEME_CONFIGS["sakura"])
        
        components = []
        y_offset = 0
        
        name = "用户"
        if profile.get("oshi") and profile["oshi"]:
            name = profile["oshi"][0].get("name", "用户")
        mbti = profile.get("mbti", "INFP")
        
        hero = create_hero_section(name=name, signature="探索无限可能 ✨", attributes={"MBTI": mbti})
        hero.position = ComponentPosition(x=0, y=y_offset, width=680, height=200)
        components.append(hero)
        y_offset += 210
        
        if profile.get("oshi"):
            for oshi in profile.get("oshi", [])[:2]:
                oshi_card = create_oshi_card(name=oshi.get("name", "推"), from_work=oshi.get("from_work"))
                oshi_card.position = ComponentPosition(x=0, y=y_offset, width=340, height=200)
                components.append(oshi_card)
                y_offset += 210
        
        attr_wall = create_attribute_wall(mbti=mbti, zodiac=profile.get("zodiac"), blood_type=profile.get("blood_type"))
        attr_wall.position = ComponentPosition(x=340, y=200, width=340, height=200)
        components.append(attr_wall)
        
        hobbies = profile.get("hobbies", [])
        if hobbies:
            tags = create_tag_group(tags=hobbies[:6], title="爱好")
            tags.position = ComponentPosition(x=0, y=y_offset, width=680, height=100)
            components.append(tags)
            y_offset += 110
        
        quote = create_quote(text="做自己，不被定义 ✨")
        quote.position = ComponentPosition(x=0, y=y_offset, width=680, height=100)
        components.append(quote)
        
        config = BackendPageConfig(
            version="1.0",
            metadata=PageMetadata(title=f"{name}的个人主页", description="Heya Studio 生成的个人主页"),
            theme=ThemeConfig(id=theme_id, colors=ThemeColors(**theme_data["colors"]), fonts=ThemeFonts(**theme_data["fonts"])),
            layout=LayoutConfig(type="single-column", width=680),
            components=components
        )
        
        return GenerateConfigOutput(config=config, reasoning=f"硬编码生成{theme_id}风格主页")
    
    def get_input_schema(self) -> type[GenerateConfigInput]:
        return GenerateConfigInput
    
    def get_output_schema(self) -> type[GenerateConfigOutput]:
        return GenerateConfigOutput
