# GEO Analytics

**Generative Engine Optimization (GEO) Analytics Tool**

[**Live Backend**](https://geo-backend-0z6g.onrender.com) | [**GitHub**](https://github.com/Adiitya01/GEO-ANALYTICS)

This project helps companies analyze and improve their visibility in AI-powered search engines (like ChatGPT, Gemini, Perplexity). It analyzes your website content, understands your value proposition, and generates realistic user prompts to test how well your brand shows up in AI responses.

## Features

- **Website Analysis**: Scrapes and processes website content to understand company offerings.
- **AI-Powered Summarization**: Uses Google Gemini to create a structured profile of the company.
- **Prompt Generation**: Generates diverse, realistic user queries (Discovery, Comparison, Intent-based) to test AI visibility.
- **Visibility Evaluation**: (In Progress) Evaluates how often and how favorably the brand appears in AI responses.
- **Dual Interface**:
  - **CLI**: Simple command-line tool for quick analysis.
  - **API**: FastAPI backend for integration with frontends.

## Prerequisites

- Python 3.10+
- Google Gemini API Key

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Adiitya01/GEO-ANALYTICS.git
    cd GEO-ANALYTICS
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv .venv
    # Windows
    .venv\Scripts\activate
    # Mac/Linux
    source .venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configuration:**
    Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    GEMINI_MODEL_NAME=gemini-1.5-flash
    ```

## Usage

### Command Line Interface (CLI)

Run the simple pipeline to analyze a URL and generate test prompts:

```bash
python main.py https://example.com
```

You can also provide additional manual points:
```bash
python main.py https://example.com --points "We focus on enterprise AI solutions"
```

### API Server

Start the FastAPI server:

```bash
python server.py
# OR
uvicorn server:app --reload
```

The API will be available at `http://localhost:8000`.
- **Docs**: `http://localhost:8000/docs`

## Project Structure

- `main.py`: CLI entry point.
- `server.py`: FastAPI server entry point.
- `app/`: Core application logic.
  - `website_loader.py`: Web scraping logic.
  - `summarizer.py`: Gemini integration for company profiling.
  - `prompt_generator.py`: Generates GEO test prompts.
  - `evaluator.py`: Logic for scoring visibility.
  - `text_cleaner.py`: Utilities for text processing.

