# GEO Analytics: Project Roadmap & Optimization Plan

## 1. Current System Status (What We Have)

### **Backend Architecture**
- **Framework**: FastAPI (Python).
- **AI Orchestration**: Unified `ai_client` supporting multiple providers.
    - **Gemini**: Primary engine for prompt generation & Google Search Grounding.
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
    - **Grounding**: Capability to toggle Google Search Grounding for live web results.
    - **Reference Extraction**: Automatically extracts visited URLs/citations from all models (Gemini, Claude, Google).
- **Frontend**:
    - Next.js Dashboard with glassmorphism UI.
    - Real-time status updates (toasts, loading states).
    - Interactive "Drill-down" modals to see full AI responses and reasoning.
    - **Comparative View**: Side-by-side results for Gemini, Claude, and Google.

---

## 2. Optimization Roadmap (To Be "Best in Market")

### Phase 1: Data Accuracy & "True" Vision (Backend)
- [ ] **Headless Browsing Integration**:
    - **Goal**: Replace `requests` with **Playwright** or **Selenium**.
    - **Why**: To accurately scrape Single Page Applications (React/Vue/Angular) where content is rendered via JavaScript. This ensures the AI "sees" the same content a human user sees.
- [ ] **Real SERP Scraping**:
    - **Goal**: Integrate a SERP API (e.g., Serper.dev or custom scraper) alongside LLM generation.
    - **Why**: To ground "Rank" data in absolute truth. LLMs can hallucinate their own search results; programmatic verification is the gold standard.

### Phase 2: Evaluation Intelligence (The "Brain")
- [ ] **Chain-of-Thought (CoT) Evaluation**:
    - **Goal**: Upgrade evaluation prompts to formatted reasoning steps (Step 1: Identify Entities -> Step 2: Analyze Sentiment -> Step 3: Score).
    - **Why**: Reduces AI "grading variance" and improves consistency of scores.
- [ ] **Citation Validation**:
    - **Goal**: Add a background task to `HEAD` request cited URLs.
    - **Why**: Detect and flag "hallucinated links" (404s) which destroys trust in the tool.

### Phase 3: Performance & Scalability
- [ ] **Streaming Responses (SSE)**:
    - **Goal**: Implement Server-Sent Events in FastAPI.
    - **Why**: Instead of waiting 30s for a batch to finish, the user sees results populating row-by-row in real-time.
- [ ] **Smart Caching Layer**:
    - **Goal**: Implement Redis or in-memory LRU cache.
    - **Why**: Prevent re-running cost-heavy AI queries for the same company/URL within 24 hours.

### Phase 4: Product Logic & Differentiation
- [ ] **Competitor Share of Voice**:
    - **Feature**: Aggregated pie charts showing dominance (e.g., "Salesforce appears in 40% of your keywords").
- [ ] **Content Gap Analysis**:
    - **Feature**: "Competitors ranking #1 consistently use terms X, Y, Z. Your site uses none."
- [ ] **Historical Tracking (Database)**:
    - **Feature**: Integrate a database (SQLite/PostgreSQL) to save audit history and show "Visibility improved by +15% this week."
