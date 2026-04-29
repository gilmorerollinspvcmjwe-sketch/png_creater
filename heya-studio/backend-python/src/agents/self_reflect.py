"""Self-Reflection - LLM evaluates its own output quality.

After generating a page config, the LLM assesses whether the result is reasonable
and suggests improvements if needed. Inspired by Anthropic's self-correction pattern.
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class SelfReflection(BaseModel):
    """Result of self-reflection on generated config."""
    score: float = Field(..., ge=0, le=10, description="Quality score 0-10")
    issues: List[str] = Field(default_factory=list, description="Identified issues")
    needs_rewrite: bool = Field(default=False, description="Whether the config should be rewritten")
    rewrite_guidance: List[str] = Field(default_factory=list, description="Specific suggestions for improvement")


SELF_REFLECT_SYSTEM_PROMPT = """你是 Heya Studio 的配置质量评估专家。

你的任务是评估 AI 生成的个人主页配置是否合理、高质量。

评估维度：
1. **组件选择是否匹配用户画像** - 比如有推し信息应该有 oshi-card 组件
2. **布局是否合理** - 组件位置不应重叠，大小应适当
3. **文案是否个性化** - 不应使用通用占位文本，应基于用户画像生成
4. **风格是否一致** - 所有组件应与选定主题风格一致
5. **组件数量是否适当** - 建议 4-8 个，太多或太少都不好

评分标准：
- 9-10: 优秀，无需修改
- 7-8: 良好，微调即可
- 5-6: 一般，建议修改 1-2 处
- 3-4: 较差，需要较多修改
- 0-2: 不合格，需要重新生成

只输出 JSON，不要任何其他文字。"""


async def self_reflect(
    llm_call,
    profile: Dict[str, Any],
    theme_id: str,
    config: Dict[str, Any],
) -> SelfReflection:
    """
    Run self-reflection on a generated config.
    
    Args:
        llm_call: async function to call LLM
        profile: user profile dict
        theme_id: selected theme ID
        config: generated BackendPageConfig as dict
    
    Returns:
        SelfReflection with score, issues, and rewrite guidance
    """
    # Build config summary (avoid sending full JSON if too large)
    components = config.get("components", [])
    comp_summary = []
    for comp in components[:10]:  # Max 10 components in reflection
        comp_summary.append({
            "type": comp.get("type"),
            "id": comp.get("id"),
            "position": comp.get("position", {}),
            "key_props": {k: v for k, v in comp.get("props", {}).items() if k in ["name", "text", "title"]},
        })
    
    profile_summary = {
        "mbti": profile.get("mbti"),
        "oshi": profile.get("oshi"),
        "hobbies": profile.get("hobbies"),
        "styles": profile.get("styles"),
    }
    
    messages = [
        {"role": "system", "content": SELF_REFLECT_SYSTEM_PROMPT},
        {"role": "user", "content": f"""请评估以下配置：

**用户画像**:
{profile_summary}

**选定风格**: {theme_id}

**生成的配置**:
组件数量: {len(components)}
组件列表:
{comp_summary}

请给出评分和问题分析。"""},
    ]
    
    try:
        result = await llm_call(messages, SelfReflection)
        if isinstance(result, SelfReflection):
            return result
        # Fallback: parse from content
        if hasattr(result, 'content'):
            import json
            data = json.loads(result.content)
            return SelfReflection(**data)
    except Exception:
        pass
    
    # Fallback: return a default reflection
    return SelfReflection(
        score=7.0,
        issues=["未能为配置生成质量评估"],
        needs_rewrite=False,
        rewrite_guidance=[],
    )


async def generate_with_reflection(
    llm_call,
    generate_config_fn,
    profile: Dict[str, Any],
    theme_id: str,
    max_retries: int = 2,
    workflow_callback=None,
) -> Dict[str, Any]:
    """
    Generate config with self-reflection and automatic retry.
    
    If the LLM-generated config is rated poorly, it regenerates with guidance.
    
    Args:
        llm_call: async function to call LLM
        generate_config_fn: async function that generates config (profile, theme_id) -> config_dict
        profile: user profile
        theme_id: selected theme
        max_retries: max number of retries after reflection
        workflow_callback: optional callback for SSE workflow events
    
    Returns:
        (config, reflection_history) tuple
    """
    reflection_history = []
    
    for attempt in range(max_retries + 1):
        # Generate config
        if workflow_callback:
            workflow_callback("generating", f"🤖 正在生成页面配置... (第 {attempt + 1} 次尝试)", {"theme": theme_id, "attempt": attempt + 1})
        
        config = await generate_config_fn(profile, theme_id)
        
        # Self-reflect
        if workflow_callback:
            workflow_callback("validation", "🔍 正在自我评估配置质量...")
        
        reflection = await self_reflect(llm_call, profile, theme_id, config)
        reflection_history.append(reflection)
        
        if workflow_callback:
            if reflection.score >= 7:
                workflow_callback("validation", f"✅ 自我评估: {reflection.score}/10 - 质量良好")
            elif reflection.needs_rewrite:
                workflow_callback("validation", f"⚠️ 自我评估: {reflection.score}/10 - 需要改进: {', '.join(reflection.rewrite_guidance[:2])}")
            else:
                workflow_callback("validation", f"📊 自我评估: {reflection.score}/10 - 可接受")
        
        # Check if rewrite needed
        if not reflection.needs_rewrite or reflection.score >= 7:
            return config, reflection_history
        
        # If max retries reached, return current config
        if attempt >= max_retries:
            return config, reflection_history
    
    return config, reflection_history
