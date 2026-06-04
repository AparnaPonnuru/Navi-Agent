from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FreeResource(BaseModel):
    name: str
    type: str
    why: str
    next_step: str
    tags: List[str]


class PaidResource(BaseModel):
    name: str
    type: str
    cost: str
    duration: str
    value: str
    next_step: str
    tags: List[str]


class ExpertResource(BaseModel):
    name: str
    type: str
    price: str
    session_details: str
    expected_outcomes: str
    tags: List[str]


class Marketplace(BaseModel):
    macro_free: List[FreeResource]
    micro_structured: List[PaidResource]
    nano_expert: List[ExpertResource]


class MicroStep(BaseModel):
    task: str
    resource: str


class Milestone(BaseModel):
    id: int
    title: str
    duration: str
    description: str
    macro_view: str
    micro_view: str
    nano_view: str
    marketplace: Marketplace
    micro_steps: List[MicroStep]


class StudentProfileModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    email: str
    grade: str
    curriculum: str
    stream: str
    school: str
    performance: str
    financialSituation: str
    personality: str
    country: str
    state: str
    city: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + "Z" if not dt.tzinfo else dt.isoformat()
        }


class RoadmapData(BaseModel):
    readiness_score: int
    readiness_label: str
    total_duration: str
    macro_path: List[Milestone]
    blind_spots: List[str]


# Model for pending_paths collection
class PendingPathModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    query: str
    current_position: str
    target_goal: str
    profile: Optional[Dict[str, Any]] = None
    roadmap_data: RoadmapData
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + "Z" if not dt.tzinfo else dt.isoformat()
        }


# Model for published_paths collection
class PublishedPathModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    query: str
    current_position: str
    target_goal: str
    profile: Optional[Dict[str, Any]] = None
    roadmap_data: RoadmapData
    published_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + "Z" if not dt.tzinfo else dt.isoformat()
        }
