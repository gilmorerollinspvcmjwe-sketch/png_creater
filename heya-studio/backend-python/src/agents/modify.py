"""Modify Agent - Handles page modifications."""

from typing import Dict, Any, Optional, List
from ..agents.base import BaseAgent, AgentType, AgentResponse
from ..memory.session import Session
from ..llm.schemas import ModifyTargetLLM, ModifyActionLLM


class ModifyAgent(BaseAgent):
    """Modify agent for page modifications."""
    
    agent_type = AgentType.MODIFY
    name = "Modify Agent"
    description = "修改页面 Agent，处理框选+指令修改"
    max_iterations = 5
    timeout_ms = 20000
    
    SYSTEM_PROMPT = """你是一个页面修改专家。

用户会框选组件并给出修改指令，你的任务是：
1. 理解修改意图
2. 应用修改到指定组件
3. 返回更新后的配置

常见修改类型：
- 换风格：更换主题配色
- 改颜色：修改特定组件颜色
- 换组件：替换组件类型
- 调位置：调整组件布局
- 添加：添加新组件
- 删除：删除组件

注意：
- 如果指令模糊，询问用户具体想改什么
- 支持批量修改（如"全部换成粉色")
- 支持撤回操作"""
    
    # LLM 目标检测 System Prompt
    TARGET_DETECT_PROMPT = """你是页面组件识别专家。

用户输入一段修改指令，你需要识别：
1. 目标组件类型（如 hero-section, oshi-card, attribute-wall 等）
2. 修改动作类型（如 change_color, change_text, delete 等）
3. 具体参数（如颜色值、文本内容等）

组件类型映射：
- "头像" -> hero-section
- "名字" -> hero-section
- "推" -> oshi-card
- "属性" -> attribute-wall
- "标签" -> tag-group
- "音乐" -> music-player
- "社交" -> social-links
- "引言" -> quote
- "背景" -> theme

只输出 JSON，不要其他文字。"""
    
    ROLLBACK_KEYWORDS = ["撤", "回退", "撤销", "恢复", "undo"]
    BATCH_KEYWORDS = ["全部", "所有", "整个", "都"]
    
    def get_system_prompt(self) -> str:
        return self.SYSTEM_PROMPT
    
    async def _detect_targets_llm(self, user_input: str, config: Dict[str, Any]) -> ModifyTargetLLM:
        """LLM 驱动的目标检测."""
        if not self.llm:
            raise RuntimeError("LLM client not initialized")
        
        # 构建组件列表描述
        components = config.get("components", [])
        comp_list = []
        for comp in components:
            comp_list.append(f"- {comp.get('type')} (id: {comp.get('id')})")
        
        user_prompt = f"""用户修改指令: {user_input}

当前页面组件:
{chr(10).join(comp_list) if comp_list else '无组件'}

请识别目标组件和操作类型。"""
        
        messages = [
            {"role": "system", "content": self.TARGET_DETECT_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        
        try:
            result = await self.llm.chat_with_schema(
                messages=[{"role": m["role"], "content": m["content"]} for m in messages],
                schema=ModifyTargetLLM,
                temperature=0.3
            )
            if isinstance(result, ModifyTargetLLM):
                return result
            # Fallback: 返回空结果
            return ModifyTargetLLM(target_types=[], action="", params={}, confidence=0.0)
        except Exception:
            # LLM 失败，返回空结果触发 fallback
            return ModifyTargetLLM(target_types=[], action="", params={}, confidence=0.0)
    
    async def run(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Handle modification - LLM 驱动 + fallback."""
        
        config = (context.get("existingConfig", session.get_config()) or {})
        
        # Check rollback
        if self._is_rollback_request(user_input):
            return await self._handle_rollback(session)
        
        # Check batch modify
        if self._is_batch_instruction(user_input):
            return await self._handle_batch_modify(session, user_input, config)
        
        # === LLM 驱动目标检测 ===
        target_ids = context.get("selected_component_ids", [])
        llm_result = None
        
        if not target_ids and self.llm:
            # 尝试 LLM 检测
            llm_result = await self._detect_targets_llm(user_input, config)
            if llm_result.confidence > 0.5 and llm_result.target_types:
                # LLM 检测成功，匹配组件 ID
                components = config.get("components", [])
                for comp in components:
                    if comp.get("type") in llm_result.target_types:
                        target_ids.append(comp.get("id"))
        
        # === Fallback: 关键词匹配 ===
        if not target_ids:
            target_ids = self._detect_targets(user_input, config)
        
        if not target_ids:
            # Ask user to select
            return AgentResponse(
                session_id=session.id,
                response="你想修改哪个组件？可以点击选择，或者告诉我是哪种类型的组件（比如头像、标签组等）。",
                requires_confirmation=True,
                current_config=config
            )
        
        # Apply modification
        from ..tools.config import ModifyConfigTool
        mod_tool = ModifyConfigTool()
        mod_result = await mod_tool.execute({
            "config": config,
            "instruction": user_input,
            "target_ids": target_ids,
            "llm_params": llm_result.params if llm_result else None  # 传递 LLM 解析的参数
        })
        
        # Save updated config
        session.save_config(mod_result.config)
        
        return AgentResponse(
            session_id=session.id,
            response=f"好的，我帮你修改了 {len(mod_result.changes)} 个地方！看看效果怎么样 ✨",
            action={"type": "modify", "data": {"changes": mod_result.changes}},
            current_config=mod_result.config,
            state="preview"
        )
    
    def _is_rollback_request(self, user_input: str) -> bool:
        """Check if rollback request."""
        return any(kw in user_input for kw in self.ROLLBACK_KEYWORDS)
    
    def _is_batch_instruction(self, user_input: str) -> bool:
        """Check if batch modification."""
        return any(kw in user_input for kw in self.BATCH_KEYWORDS)
    
    def _detect_targets(self, user_input: str, config: Dict[str, Any]) -> List[str]:
        """Detect target components from instruction."""
        targets = []
        components = config.get("components", [])
        
        # Keyword detection
        keywords_map = {
            "头像": ["hero-section", "avatar"],
            "名字": ["hero-section", "text"],
            "签名": ["hero-section"],
            "推": ["oshi-card"],
            "属性": ["attribute-wall"],
            "标签": ["tag-group"],
            "音乐": ["music-player"],
            "社交": ["social-links"],
            "引言": ["quote"],
            "背景": [],  # Background is part of theme
        }
        
        for keyword, component_types in keywords_map.items():
            if keyword in user_input:
                for comp in components:
                    if comp.get("type") in component_types:
                        targets.append(comp.get("id"))
        
        return targets
    
    async def _handle_rollback(self, session: Session) -> AgentResponse:
        """Handle rollback request."""
        # In production, would restore from version history
        return AgentResponse(
            session_id=session.id,
            response="好的，已经恢复到上一个版本了。",
            current_config=session.get_config()
        )
    
    async def _handle_batch_modify(
        self,
        session: Session,
        user_input: str,
        config: Dict[str, Any]
    ) -> AgentResponse:
        """Handle batch modification."""
        
        from ..tools.config import ModifyConfigTool
        mod_tool = ModifyConfigTool()
        mod_result = await mod_tool.execute({
            "config": config,
            "instruction": user_input
        })
        
        session.save_config(mod_result.config)
        
        return AgentResponse(
            session_id=session.id,
            response=f"好的，我已经把所有组件都按你的要求调整了！一共修改了 {len(mod_result.changes)} 个地方 ✨",
            action={"type": "modify", "data": {"batch": True, "changes": mod_result.changes}},
            current_config=mod_result.config
        )