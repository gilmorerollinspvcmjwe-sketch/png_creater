"""Feedback data model.

Tier 3 改进项 #3a: 创建 Feedback 数据模型
- 记录用户的纠正和偏好
- 支持 correction / preference / dislike 三种反馈类型
- 可选关联组件类型
"""

import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Feedback(BaseModel):
    """用户反馈记录。
    
    Attributes:
        id: 唯一标识符 (UUID)
        session_id: 关联的会话 ID
        user_input: 用户的原始指令
        feedback_text: 用户的纠正内容（如"不要粉色"、"换成赛博朋克"）
        feedback_type: 反馈类型 - correction(纠正) / preference(偏好) / dislike(不喜欢)
        component_type: 针对的组件类型（可选）
        created_at: 创建时间
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_input: str = ""
    feedback_text: str
    feedback_type: Literal["correction", "preference", "dislike"] = "correction"
    component_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class FeedbackRequest(BaseModel):
    """API 请求模型：提交反馈。"""
    session_id: str
    feedback_text: str
    feedback_type: Literal["correction", "preference", "dislike"] = "correction"
    component_type: Optional[str] = None
