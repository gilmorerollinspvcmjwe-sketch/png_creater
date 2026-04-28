"""Agent Tracing Module - 追踪 Agent 调用链路。

Tier 2 改进项 #3: 基础 Agent Tracing 实现。
纯 Python 实现，无外部依赖（不使用 LangSmith 等）。

提供 TraceSpan 类记录每个 Agent/Tool 的调用时间、输入输出摘要，
支持嵌套子 span，便于调试和性能分析。

Usage:
    from src.utils.tracing import TraceContext, get_trace_summary

    # 在 handle_chat 中创建根 span
    with TraceContext("handle_chat") as ctx:
        with ctx.child_span("router_agent", input_summary="用户消息...") as span:
            result = await router.run(...)
            span.set_output("intent=new_page")

        with ctx.child_span("design_agent") as span:
            result = await design_agent.run(...)
            span.set_output(f"生成 {n} 个组件")

    # 获取最近调用链摘要
    summary = get_trace_summary()
"""

import time
import threading
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field


def _truncate(text: str, max_len: int = 200) -> str:
    """截断摘要文本，避免过长。"""
    if not text:
        return ""
    text = str(text)
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


@dataclass
class TraceSpan:
    """记录单个 Agent 或 Tool 调用的追踪信息。

    Attributes:
        span_name: span 名称，如 "router_agent", "design_agent", "generate_config_llm"
        start_time: 开始时间戳（秒）
        end_time: 结束时间戳（秒），None 表示尚未结束
        duration_ms: 耗时（毫秒），end() 后自动计算
        input_summary: 输入摘要（截断至 200 字符）
        output_summary: 输出摘要（截断至 200 字符）
        children: 嵌套子 span 列表
        error: 错误信息（如果有）
        metadata: 额外元数据
    """
    span_name: str
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    duration_ms: Optional[float] = None
    input_summary: str = ""
    output_summary: str = ""
    children: List["TraceSpan"] = field(default_factory=list)
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def end(self):
        """结束 span，计算耗时。"""
        self.end_time = time.time()
        self.duration_ms = round((self.end_time - self.start_time) * 1000, 2)

    def set_input(self, summary: str):
        """设置输入摘要。"""
        self.input_summary = _truncate(summary)

    def set_output(self, summary: str):
        """设置输出摘要。"""
        self.output_summary = _truncate(summary)

    def set_error(self, error: str):
        """记录错误。"""
        self.error = _truncate(error, max_len=500)

    def add_child(self, span: "TraceSpan"):
        """添加子 span。"""
        self.children.append(span)

    def create_child(self, span_name: str, input_summary: str = "") -> "TraceSpan":
        """创建并添加子 span。"""
        child = TraceSpan(span_name=span_name, input_summary=_truncate(input_summary))
        self.children.append(child)
        return child

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典，便于序列化。"""
        result = {
            "span_name": self.span_name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_ms": self.duration_ms,
            "input_summary": self.input_summary,
            "output_summary": self.output_summary,
            "error": self.error,
        }
        if self.metadata:
            result["metadata"] = self.metadata
        if self.children:
            result["children"] = [c.to_dict() for c in self.children]
        return result

    def format_tree(self, indent: int = 0) -> str:
        """格式化为可读的树形结构。"""
        prefix = "  " * indent
        duration_str = f"{self.duration_ms}ms" if self.duration_ms is not None else "running..."
        status = "❌" if self.error else "✅"
        line = f"{prefix}{status} {self.span_name} [{duration_str}]"
        if self.input_summary:
            line += f"\n{prefix}   ← {self.input_summary}"
        if self.output_summary:
            line += f"\n{prefix}   → {self.output_summary}"
        if self.error:
            line += f"\n{prefix}   ⚠ {self.error}"

        lines = [line]
        for child in self.children:
            lines.append(child.format_tree(indent + 1))
        return "\n".join(lines)


class TraceContext:
    """追踪上下文管理器，支持 with 语法和嵌套子 span。

    Usage:
        with TraceContext("handle_chat", input_summary="用户消息") as ctx:
            with ctx.child_span("router_agent") as span:
                # ... do work ...
                span.set_output("result")
    """

    def __init__(self, span_name: str, input_summary: str = ""):
        self.root_span = TraceSpan(span_name=span_name, input_summary=_truncate(input_summary))
        self._current_span = self.root_span

    def __enter__(self) -> "TraceContext":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.root_span.set_error(str(exc_val))
        self.root_span.end()
        # 保存到全局历史
        _trace_store.add_trace(self.root_span)
        return False  # 不吞掉异常

    def child_span(self, span_name: str, input_summary: str = "") -> "_SpanContextManager":
        """创建子 span 上下文管理器。"""
        return _SpanContextManager(self.root_span, span_name, input_summary)

    def set_output(self, summary: str):
        """设置根 span 的输出摘要。"""
        self.root_span.set_output(summary)


class _SpanContextManager:
    """子 span 上下文管理器。"""

    def __init__(self, parent: TraceSpan, span_name: str, input_summary: str = ""):
        self.parent = parent
        self.span = TraceSpan(span_name=span_name, input_summary=_truncate(input_summary))

    def __enter__(self) -> TraceSpan:
        self.parent.add_child(self.span)
        return self.span

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.span.set_error(str(exc_val))
        self.span.end()
        return False


class _TraceStore:
    """全局 Trace 存储，保存最近 N 条调用链。线程安全。"""

    def __init__(self, max_traces: int = 50):
        self._traces: List[TraceSpan] = []
        self._max_traces = max_traces
        self._lock = threading.Lock()

    def add_trace(self, trace: TraceSpan):
        """添加一条 trace。"""
        with self._lock:
            self._traces.append(trace)
            # 保持最多 max_traces 条
            if len(self._traces) > self._max_traces:
                self._traces = self._traces[-self._max_traces:]

    def get_recent(self, n: int = 10) -> List[TraceSpan]:
        """获取最近 n 条 trace。"""
        with self._lock:
            return list(self._traces[-n:])

    def clear(self):
        """清空所有 trace。"""
        with self._lock:
            self._traces.clear()


# 全局 Trace 存储实例
_trace_store = _TraceStore()


def get_trace_summary(n: int = 5) -> str:
    """获取最近 n 条调用链摘要（用于调试）。

    Returns:
        格式化的树形调用链摘要字符串。
    """
    traces = _trace_store.get_recent(n)
    if not traces:
        return "No traces recorded."

    lines = [f"=== Recent {len(traces)} Trace(s) ==="]
    for i, trace in enumerate(traces, 1):
        lines.append(f"\n--- Trace #{i} ---")
        lines.append(trace.format_tree())
    return "\n".join(lines)


def get_trace_store() -> _TraceStore:
    """获取全局 Trace 存储实例。"""
    return _trace_store
