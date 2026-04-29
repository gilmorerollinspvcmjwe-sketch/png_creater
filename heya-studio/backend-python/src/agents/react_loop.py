"""ReAct Loop - Reason, Act, Observe cycle for LLM-driven agents.

Inspired by LangGraph's ReAct agent pattern and Anthropic's tool use best practices.
Zero external dependencies.
"""

from typing import Dict, Any, Optional, List, Callable, Awaitable
import json
import asyncio


class ReActAgent:
    """
    A ReAct-style agent that loops: Think → Act → Observe → Think...
    
    The Think step uses LLM to decide what action to take.
    The Act step executes the chosen tool.
    The Observe step feeds the tool result back to the LLM.
    
    Usage:
        agent = ReActAgent(
            system_prompt="You are a helpful assistant...",
            llm_call=async_function_for_llm,
            tools=[tool1, tool2, ...],
            max_steps=10
        )
        result = await agent.run(user_input="...")
    """
    
    def __init__(
        self,
        system_prompt: str,
        llm_call: Callable,  # async(messages, schema=None) -> response
        tools: Optional[List] = None,
        max_steps: int = 10,
        temperature: float = 0.7,
    ):
        self.system_prompt = system_prompt
        self.llm_call = llm_call
        self.tools = tools or []
        self.max_steps = max_steps
        self.temperature = temperature
        self._tool_map: Dict[str, Any] = {t.name: t for t in self.tools}
    
    def _build_tool_descriptions(self) -> str:
        """Build a text description of all available tools."""
        lines = []
        for i, tool in enumerate(self.tools, 1):
            lines.append(f"{i}. **{tool.name}**: {tool.description}")
        if not lines:
            return "(no tools available)"
        return "\n".join(lines)
    
    def _build_think_prompt(self, conversation: List[Dict[str, str]], step: int) -> List[Dict[str, str]]:
        """Build the prompt for the Think step."""
        messages = [
            {"role": "system", "content": self.system_prompt},
        ]
        messages.extend(conversation)
        return messages
    
    async def run(
        self,
        user_input: str,
        initial_state: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run the ReAct loop.
        
        Returns a dict with:
            - response: final text response
            - tool_calls: list of tool calls made
            - state: final state
        """
        state = initial_state or {}
        conversation: List[Dict[str, str]] = [
            {"role": "user", "content": user_input}
        ]
        tool_calls_log: List[Dict[str, Any]] = []
        
        for step in range(self.max_steps):
            # === THINK ===
            messages = self._build_think_prompt(conversation, step)
            
            try:
                response = await self.llm_call(messages)
                content = response.content if hasattr(response, 'content') else response.get("content", "")
            except Exception as e:
                return {
                    "response": f"LLM 调用失败: {str(e)}",
                    "tool_calls": tool_calls_log,
                    "state": state,
                    "error": str(e),
                }
            
            # === CHECK FOR TOOL CALLS ===
            # Try to extract tool call from LLM response
            tool_call = self._extract_tool_call(content)
            
            if tool_call:
                # === ACT ===
                tool_name = tool_call["name"]
                tool_args = tool_call.get("args", {})
                
                if tool_name in self._tool_map:
                    try:
                        tool = self._tool_map[tool_name]
                        # Tools may need Pydantic input wrapping
                        input_cls = tool.get_input_schema() if hasattr(tool, 'get_input_schema') else None
                        if input_cls:
                            result = await tool.execute(input_cls(**tool_args))
                        else:
                            result = await tool.execute(tool_args)
                        
                        # Convert result to dict
                        if hasattr(result, 'model_dump'):
                            result_dict = result.model_dump()
                        elif isinstance(result, dict):
                            result_dict = result
                        else:
                            result_dict = {"result": str(result)}
                        
                        tool_calls_log.append({
                            "step": step,
                            "tool": tool_name,
                            "args": tool_args,
                            "result": result_dict,
                        })
                        
                        # === OBSERVE ===
                        observation = json.dumps(result_dict, ensure_ascii=False)[:2000]
                        conversation.append({"role": "assistant", "content": content})
                        conversation.append({
                            "role": "user",
                            "content": f"Tool {tool_name} returned:\n{observation}\n\n基于以上结果，继续处理。"
                        })
                        
                    except Exception as e:
                        # Tool error - feed back to LLM
                        conversation.append({"role": "assistant", "content": content})
                        conversation.append({
                            "role": "user",
                            "content": f"Tool {tool_name} 执行出错: {str(e)}\n请尝试其他方式或告知用户。"
                        })
                else:
                    # Unknown tool
                    conversation.append({"role": "assistant", "content": content})
                    conversation.append({
                        "role": "user",
                        "content": f"未知工具: {tool_name}。请使用可用的工具。"
                    })
            else:
                # No tool call - LLM is giving a final response
                # Update state if LLM returned structured data
                state = self._extract_state_update(content, state)
                
                return {
                    "response": content,
                    "tool_calls": tool_calls_log,
                    "state": state,
                }
        
        # Max steps reached
        return {
            "response": "已达到最大处理步数，可能需要更简洁的指令。",
            "tool_calls": tool_calls_log,
            "state": state,
            "max_steps_reached": True,
        }
    
    def _extract_tool_call(self, content: str) -> Optional[Dict[str, Any]]:
        """
        Extract tool call from LLM response.
        
        Supports two formats:
        1. JSON block: ```json {"tool": "name", "args": {...}} ```
        2. Direct JSON: {"tool": "name", "args": {...}}
        """
        # Try to find JSON in content
        import re
        
        # Try code block first
        json_match = re.search(r'```(?:json)?\s*\n?({[^`]+})\s*\n?```', content, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._normalize_tool_call(data)
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object anywhere in text
        json_match = re.search(r'({\s*"tool"\s*:[^}]+})', content, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._normalize_tool_call(data)
            except json.JSONDecodeError:
                pass
        
        # Also try with "name" as tool identifier (OpenAI function calling style)
        json_match = re.search(r'({\s*"name"\s*:[^}]+})', content, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._normalize_tool_call(data)
            except json.JSONDecodeError:
                pass
        
        return None
    
    def _normalize_tool_call(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize tool call data to {name, args} format."""
        name = data.get("tool") or data.get("name") or data.get("tool_name")
        if not name:
            return None
        
        args = data.get("args") or data.get("arguments") or data.get("input") or {}
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except json.JSONDecodeError:
                args = {"text": args}
        
        return {"name": name, "args": args}
    
    def _extract_state_update(self, content: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
        """Extract any state updates from the final LLM response."""
        # Try to find a JSON state update block
        import re
        json_match = re.search(r'```(?:json)?\s*\n?({"state"\s*:[^`]+})\s*\n?```', content, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                if "state" in data:
                    return {**current_state, **data["state"]}
            except json.JSONDecodeError:
                pass
        return current_state
