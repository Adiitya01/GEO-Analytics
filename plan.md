# GEO Analytics: Project Roadmap & Optimization Plan

## 1. Current System Status (What We Have)

### **Backend Architecture**
- **Framework**: FastAPI (Python).
- **AI Orchestration**: Unified `ai_client` supporting multiple providers with modern SDKs.
    - **Gemini**: Primary engine for prompt generation & **Official Google Search Grounding** (using modern `google-genai` SDK).
    - **Cerebras**: Ultra-fast inference for heavy-lifting (summarization, standard evaluation).
    - **OpenRouter (Claude)**: Secondary model for comparative auditing.
- **Data Ingestion**:
    - **Website Loader**: Multi-threaded scraping using `requests`, `readability`, and `BeautifulSoup`.
        - *Limitation*: Currently static-only; cannot parse JavaScript-heavy (SPA) sites.
    - **Summarizer**: AI-driven extraction of offerings, industry, and target audience.

### **Core Capabilities**
- **Dynamic Prompt Generation**: Creates diverse search intents (Unbiased Discovery, Direct Comparison, Specific Solutions).
- **Parallel Evaluation Engine**:
    - Runs prompts concurrently with semaphore limits to respect API quotas.
    - Extracts: Brand Presence, Sentiment, Accuracy Score, Competitor Ranks.
- **Advanced Grounding & Reference Extraction**:
    - **Unified Logic**: Gemini and Claude both generate live reference links.
    - **Gemini Grounding**: Automatically retrieves official `grounding_chunks` (URLs & Titles) using the latest Google GenAI SDK.
    - **Regex Citation Extraction**: Automatically scans model responses (Claude/Cerebras) to capture and display URLs mentioned in text.
    - **Live Reference Links**: Every evaluation includes a direct "Live Google Search" grounding link for verification.
- **Frontend**:
    - Next.js Dashboard with glassmorphism UI and a **Dynamic Sidebar**.
    - Real-time status updates (toasts, loading states).
    - **References View**: Dedicated repository of all visited sites, categorized by AI provider.
    - **Comparative View**: Side-by-side results for Gemini, Claude, and Google Search.

---

## 2. Optimization Roadmap (To Be "Best in Market")

### Phase 1: Data Accuracy & "True" Vision (Backend)
- [ ] **Real SERP API Integration**:
    - **Goal**: Integrate a SERP API (e.g., Serper.dev or SerpApi).
    - **Why**: To ground "Rank" data in absolute truth by comparing AI responses with actual Google Search layout.

### Phase 2: Evaluation Intelligence (The "Brain")
- [ ] **Citation Validation**:
    - **Goal**: Add a background task to `HEAD` request cited URLs to detect "hallucinated links" (404s).
- [ ] **Advanced Scoring Algorithms**: 
    - **Goal**: Weight scores based on brand positioning (e.g., being in the first paragraph is worth more than a footer mention).

### Phase 3: Performance & UX Polish
- [ ] **Streaming Responses (SSE)**:
    - **Goal**: Implement Server-Sent Events in FastAPI.
    - **Why**: So the user sees results populating in the dashboard in real-time as they finish.

### Phase 4: Product Logic & Analytics
- [ ] **Historical Tracking (Database)**:
    - **Goal**: Integrate **SQLite** or **PostgreSQL**.
    - **Why**: To save audit history and show "Visibility Trends" (improvement over time).
- [ ] **Visual Analytics**:
    - **Feature**: Aggregated pie charts showing **Competitor Share of Voice**.
- [ ] **Content Gap Analysis**:
    - **Feature**: AI-driven feedback: "Competitors ranking #1 consistently use terms X, Y, Z. Your site is missing these specific keywords."
