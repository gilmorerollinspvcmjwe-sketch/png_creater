"""Feedback memory storage.

Tier 3 改进项 #3b: 实现 Feedback 存储
- FeedbackMemory 类，支持内存和 Redis 两种存储
- add_feedback: 添加反馈
- get_feedback: 获取 session 的所有反馈
- get_relevant_feedback: 按关键词检索相关反馈
- clear_feedback: 清除 session 反馈
"""

import os
import json
import uuid
from typing import List, Optional, Dict
from datetime import datetime

from ..models.feedback import Feedback


class FeedbackMemory:
    """Feedback memory store (in-memory or Redis).
    
    默认使用内存 Dict 存储。
    设置环境变量 FEEDBACK_MEMORY_REDIS_URL 可切换到 Redis。
    """
    
    def __init__(self, use_redis: bool = False, redis_url: Optional[str] = None):
        self.use_redis = use_redis
        self.redis_url = redis_url
        self._feedbacks: Dict[str, List[Feedback]] = {}  # session_id -> [Feedback]
        self._all_feedbacks: List[Feedback] = []  # 全局反馈列表，用于跨 session 检索
        self._redis = None
        
        if use_redis and redis_url:
            self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection."""
        try:
            import redis
            self._redis = redis.from_url(self.redis_url)
        except (ImportError, Exception):
            self.use_redis = False
            self._redis = None
    
    def add_feedback(
        self,
        session_id: str,
        feedback_text: str,
        feedback_type: str = "correction",
        component_type: Optional[str] = None,
        user_input: str = ""
    ) -> Feedback:
        """添加反馈记录。
        
        Args:
            session_id: 会话 ID
            feedback_text: 反馈内容
            feedback_type: 反馈类型 (correction/preference/dislike)
            component_type: 针对的组件类型
            user_input: 用户原始输入
            
        Returns:
            创建的 Feedback 对象
        """
        feedback = Feedback(
            id=str(uuid.uuid4()),
            session_id=session_id,
            user_input=user_input,
            feedback_text=feedback_text,
            feedback_type=feedback_type,
            component_type=component_type,
        )
        
        if self.use_redis and self._redis:
            key = f"feedback:{session_id}"
            self._redis.rpush(key, json.dumps(feedback.model_dump(), default=str))
            self._redis.expire(key, 86400 * 7)  # 7 days TTL
            # 全局索引
            self._redis.rpush("feedback:all", json.dumps(feedback.model_dump(), default=str))
        else:
            if session_id not in self._feedbacks:
                self._feedbacks[session_id] = []
            self._feedbacks[session_id].append(feedback)
            self._all_feedbacks.append(feedback)
        
        return feedback
    
    def get_feedback(self, session_id: str) -> List[Feedback]:
        """获取指定 session 的所有反馈。"""
        if self.use_redis and self._redis:
            key = f"feedback:{session_id}"
            items = self._redis.lrange(key, 0, -1)
            return [Feedback(**json.loads(item)) for item in items]
        else:
            return self._feedbacks.get(session_id, [])
    
    def get_relevant_feedback(
        self,
        user_input: str,
        max_results: int = 5,
        session_id: Optional[str] = None
    ) -> List[Feedback]:
        """按关键词检索相关反馈。
        
        简单的关键词匹配策略：
        - 将 user_input 分词
        - 检查每条反馈是否包含任一关键词
        - 按匹配度排序返回
        
        Args:
            user_input: 用户输入，用于匹配
            max_results: 最大返回数量
            session_id: 可选，限制在特定 session
            
        Returns:
            相关反馈列表
        """
        # 获取候选反馈
        if session_id:
            candidates = self.get_feedback(session_id)
        elif self.use_redis and self._redis:
            items = self._redis.lrange("feedback:all", 0, -1)
            candidates = [Feedback(**json.loads(item)) for item in items]
        else:
            candidates = self._all_feedbacks
        
        if not candidates or not user_input:
            return []
        
        # 简单关键词匹配
        keywords = set(user_input.lower().replace(",", " ").replace("，", " ").split())
        # 移除太短的词
        keywords = {kw for kw in keywords if len(kw) >= 2}
        
        scored = []
        for fb in candidates:
            score = 0
            fb_text = (fb.feedback_text + " " + fb.user_input).lower()
            for kw in keywords:
                if kw in fb_text:
                    score += 1
            if score > 0:
                scored.append((score, fb))
        
        # 按匹配度排序
        scored.sort(key=lambda x: x[0], reverse=True)
        return [fb for _, fb in scored[:max_results]]
    
    def clear_feedback(self, session_id: str):
        """清除指定 session 的所有反馈。"""
        if self.use_redis and self._redis:
            self._redis.delete(f"feedback:{session_id}")
        else:
            removed = self._feedbacks.pop(session_id, [])
            # 从全局列表中移除
            self._all_feedbacks = [
                fb for fb in self._all_feedbacks if fb.session_id != session_id
            ]


# Global feedback memory instance
_feedback_memory: Optional[FeedbackMemory] = None


def get_feedback_memory() -> FeedbackMemory:
    """Get or create the global FeedbackMemory instance."""
    global _feedback_memory
    if _feedback_memory is None:
        redis_url = os.environ.get("FEEDBACK_MEMORY_REDIS_URL")
        _feedback_memory = FeedbackMemory(
            use_redis=bool(redis_url),
            redis_url=redis_url
        )
    return _feedback_memory
