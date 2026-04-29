"""Lightweight StateGraph - inspired by LangGraph, zero external dependencies."""

from typing import Callable, Dict, Any, Optional, Union, Awaitable
from dataclasses import field


class StateGraph:
    """
    A lightweight state machine where nodes read/write a shared state dict.
    
    Usage:
        graph = StateGraph()
        graph.add_node("collect", collect_node)
        graph.add_node("generate", generate_node)
        graph.add_conditional_edge("collect", decide_next)
        graph.add_edge("generate", "__end__")
        result = await graph.run(initial_state)
    
    Nodes are async functions: async def node(state: dict) -> dict
    Conditional edges are functions: def condition(state: dict) -> str  (next node name)
    """
    
    def __init__(self):
        self._nodes: Dict[str, Callable] = {}
        self._edges: Dict[str, str] = {}
        self._conditional_edges: Dict[str, Callable] = {}
    
    def add_node(self, name: str, func: Callable):
        """Add a node. func is async (state: dict) -> dict."""
        self._nodes[name] = func
    
    def add_edge(self, from_node: str, to_node: str):
        """Add a static edge: after from_node finishes, go to to_node."""
        self._edges[from_node] = to_node
    
    def add_conditional_edge(self, from_node: str, condition: Callable[[Dict[str, Any]], str]):
        """
        Add a conditional edge.
        condition(state) returns the name of the next node, or "__end__" to stop.
        """
        self._conditional_edges[from_node] = condition
    
    def _get_next(self, node_name: str, state: Dict[str, Any]) -> Optional[str]:
        """Determine the next node after the current one."""
        # Conditional edge takes priority
        if node_name in self._conditional_edges:
            return self._conditional_edges[node_name](state)
        if node_name in self._edges:
            return self._edges[node_name]
        return None
    
    async def run(
        self,
        initial_state: Dict[str, Any],
        max_steps: int = 20
    ) -> Dict[str, Any]:
        """
        Execute the graph starting from initial_state.
        
        Nodes are executed in order determined by edges.
        Stops when a node returns "__end__" as next, or max_steps reached.
        """
        state = initial_state.copy()
        state.setdefault("__step", 0)
        state.setdefault("__current_node", "__start__")
        
        # Start from the first node that's not an edge target
        current = initial_state.get("__start_node")
        if current is None:
            # Find nodes that aren't targets of any edge (entry points)
            edge_targets = set(self._edges.values()) | set(
                "__end__"  # conditional edges may return __end__
            )
            for name in self._nodes:
                if name not in edge_targets:
                    current = name
                    break
            if current is None and self._nodes:
                current = next(iter(self._nodes))
        
        step = 0
        while current and current != "__end__" and step < max_steps:
            if current in self._nodes:
                node_func = self._nodes[current]
                import asyncio
                if asyncio.iscoroutinefunction(node_func):
                    state = await node_func(state)
                else:
                    state = node_func(state)
                
                state["__step"] = step + 1
                state["__current_node"] = current
            
            current = self._get_next(current, state)
            step += 1
        
        if step >= max_steps:
            state["__error"] = f"Max steps ({max_steps}) reached"
        
        return state
