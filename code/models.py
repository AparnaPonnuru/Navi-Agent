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


# Main DB storage model for Career Paths
class CareerPathModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")  # MongoDB ObjectId string representation
    query: str
    current_position: str
    target_goal: str
    profile: Optional[Dict[str, Any]] = None
    readiness_score: int
    readiness_label: str
    total_duration: str
    macro_path: List[Milestone]
    status: str = "under_admin_review"  # "pending_review" | "under_admin_review" | "published"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
