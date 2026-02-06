# app/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional

class CompanyUnderstanding(BaseModel):
    company_name: str = Field("Pending Analysis...", description="Name of the company extracted")
    company_summary: str = Field("We couldn't extract enough details. Please add more Manual Points.")
    industry: str = Field("Industry: Undefined")
    offerings: List[str] = Field(default_factory=list)
    target_users: List[str] = Field(default_factory=list)
    core_problems_solved: List[str] = Field(default_factory=list)
    manual_points: Optional[str] = None
    url: str = Field("", description="Company website URL")
    region: str = Field("Global", description="Target region for analysis")

class GeneratedPrompt(BaseModel):
    prompt_text: str
    intent_category: str  # e.g., Unbiased Discovery, Direct Comparison, Specific Solution

class CompetitorRank(BaseModel):
    name: str
    rank: Optional[int] = None
    url_cited: bool = False

class EvaluationMetric(BaseModel):
    brand_present: bool
    url_cited: bool = Field(False, description="Whether the company URL is cited/linked in the response")
    recommendation_rank: Optional[int] = None  # 1 if first, 2 if second, etc. None if not present
    accuracy_score: float  # 0 to 1
    sentiment: str  # Positive, Neutral, Negative
    competitors_mentioned: List[str]
    competitor_ranks: List[CompetitorRank] = Field(default_factory=list)

class SearchSource(BaseModel):
    title: str
    url: str
    favicon: Optional[str] = None  # URL to the website's favicon
    description: Optional[str] = None  # Meta description or snippet from the page
    domain: Optional[str] = None  # Extracted domain name (e.g., "example.com")
    is_grounded: bool = False  # True if this is a real grounded source (not a fallback search URL)
    source_type: str = "web"  # "web", "search_grounding", "extracted_url", etc.

class ModelResponse(BaseModel):
    model_name: str
    response_text: str
    evaluation: EvaluationMetric
    sources: List[SearchSource] = Field(default_factory=list)


class CompetitorInsight(BaseModel):
    name: str
    mentions: int
    avg_rank: Optional[float] = None
    prompts_appeared: List[str] = Field(default_factory=list)
    sources: List[SearchSource] = Field(default_factory=list, description="Sources/websites where this competitor was mentioned")
    visibility_reason: str = Field("", description="AI-generated reason for why this competitor is ranking/visible")

class VisibilityReport(BaseModel):
    company_name: str
    overall_score: float  # 0 to 100
    queries_tested: List[str]
    model_results: List[ModelResponse]
    key_findings: List[str]
    optimizer_tips: List[str]
    competitor_insights: List[CompetitorInsight] = Field(default_factory=list)
    competitor_summary: List[str] = Field(default_factory=list) # Keep for backward compatibility if needed

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None

class UserResponse(UserBase):
    id: int
    full_name: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

