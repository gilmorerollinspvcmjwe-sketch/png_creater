"""User profile models."""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class Oshi(BaseModel):
    """推し (favorite character/idol)."""
    name: str = Field(..., description="推的名字")
    from_work: Optional[str] = Field(None, description="来源作品")
    description: Optional[str] = Field(None, description="描述")


class Personality(BaseModel):
    """Personality attributes."""
    mbti: Optional[str] = Field(None, description="MBTI 类型")
    blood_type: Optional[str] = Field(None, description="血型")
    zodiac: Optional[str] = Field(None, description="星座")


class Interests(BaseModel):
    """Interests and hobbies."""
    hobbies: List[str] = Field(default_factory=list, description="爱好列表")
    music: List[str] = Field(default_factory=list, description="喜欢的音乐")
    anime: List[str] = Field(default_factory=list, description="喜欢的动漫")


class StylePreference(BaseModel):
    """Style preferences."""
    styles: List[str] = Field(default_factory=list, description="风格偏好")
    colors: List[str] = Field(default_factory=list, description="颜色偏好")
    effects: List[str] = Field(default_factory=list, description="特效偏好")


class SocialLink(BaseModel):
    """Social media link."""
    platform: str = Field(..., description="平台名称")
    username: Optional[str] = Field(None, description="用户名")
    url: Optional[str] = Field(None, description="链接")


class UserProfile(BaseModel):
    """Complete user profile."""
    oshi: List[Oshi] = Field(default_factory=list)
    personality: Personality = Field(default_factory=Personality)
    interests: Interests = Field(default_factory=Interests)
    style_preference: StylePreference = Field(default_factory=StylePreference)
    social_links: List[SocialLink] = Field(default_factory=list)
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def is_incomplete(self) -> bool:
        """Check if profile has minimum required info."""
        # At minimum, we need at least one oshi or MBTI
        return len(self.oshi) == 0 and not self.personality.mbti
    
    def to_dict(self) -> dict:
        """Convert to dictionary for LLM prompts."""
        return {
            "oshi": [o.model_dump() for o in self.oshi],
            "mbti": self.personality.mbti,
            "zodiac": self.personality.zodiac,
            "blood_type": self.personality.blood_type,
            "hobbies": self.interests.hobbies,
            "music": self.interests.music,
            "anime": self.interests.anime,
            "styles": self.style_preference.styles,
            "colors": self.style_preference.colors,
            "social_links": [s.model_dump() for s in self.social_links],
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "UserProfile":
        """Create from dictionary."""
        oshi_list = []
        for o in data.get("oshi", []):
            oshi_list.append(Oshi(**o) if isinstance(o, dict) else Oshi(name=str(o)))
        
        return cls(
            oshi=oshi_list,
            personality=Personality(
                mbti=data.get("mbti"),
                zodiac=data.get("zodiac"),
                blood_type=data.get("blood_type"),
            ),
            interests=Interests(
                hobbies=data.get("hobbies", []),
                music=data.get("music", []),
                anime=data.get("anime", []),
            ),
            style_preference=StylePreference(
                styles=data.get("styles", []),
                colors=data.get("colors", []),
                effects=data.get("effects", []),
            ),
            social_links=[
                SocialLink(**s) if isinstance(s, dict) else SocialLink(platform=str(s))
                for s in data.get("social_links", [])
            ],
        )