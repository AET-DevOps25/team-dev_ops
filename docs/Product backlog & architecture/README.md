# 📝 System Overview —> Architecture

Since Researchers, Founders and Product Managers all share the core need to discover, evaluate and act on emerging trends, we decided to consolidate them into a single "Innovator" persona based on their shared goal of identifying trends, understanding why they matter and rapidly turning those insights into research directions or product opportunities.

![image](https://hackmd.io/_uploads/H1nPN87Wxg.png)
*Source: [weagree.com](https://weagree.com/weblog/adopting-innovations-product-lifecycle/)*

## First Product Backlog

Prepare a simple backlog in a Markdown table or GitHub Project. Each item should be a feature or task.

| # | Persona | I want to … | So that … | Status |
|---|---------|-------------|-----------|--------|
| 1 | Innovator | Enter my query (e.g. "fast-growing CV trends") | I quickly identify emerging trends relevant to my interests | ✅ Implemented – front-end `QueryForm` + Spring API `POST /analyses` |
| 2 | Innovator | Automatically see sources based on my query | I get accurate and relevant articles without manual searching | ✅ Implemented – GenAI `classifyQuery` picks arXiv vs Reddit |
| 3 | Innovator | Read concise explanations of each identified trend | I quickly grasp why each trend matters | ✅ Implemented – py-topics + LLM generate 5-word title & 2-sentence summary |
| 4 | Innovator | Access relevant text snippets from original sources | I easily verify and explore deeper into interesting trends | ✅ Implemented – `TopicResult` component shows article snippet & link |
| 5 | Innovator | Have my analysis automatically saved | I don't need to repeat my analysis every session | ✅ Implemented – results persisted in Postgres & listed in history |
| 6 | Innovator | Customize the number of articles analyzed per session | I control the depth and breadth of my analysis | ✅ Implemented – Settings form sends `maxArticles` to API |
| 7 | Innovator | Filter the latest articles from selected RSS feeds by time (1 week, 1 month …) | I stay updated with the most recent information | ⏳ Partially – backend supports timeframe filters; we added filter for amount of latest articles instead  |
| 8 | Innovator | Get updated analysis when reopening the chat | I effortlessly maintain continuous awareness of latest developments | 🔄 Planned – polling works during a session; scheduled re-analysis not yet |

## Initial System Structure
### Core Idea:
1.  **Prompt:** Input your niche query (e.g., "Show fast‑growing trends in CV for 3D registration").
2.  **App Targets Sources:**
    Detects if query is
    *   "research" (-> arXiv `cs.CV`) [https://rss.arxiv.org/rss/cs.CV]
    *   "community" (-> Reddit `r/computervision`) [https://www.reddit.com/r/computervision.rss].
    Targets relevant RSS feeds based on this.
3.  **App Skims Latest :** Fetches newest N articles from targeted feeds.
4.  **AI Finds Latest Trends:** Uses embeddings & clustering on this fresh batch to spot 2-3 key themes (e.g., "NeRF").
5.  **Final report:**
    *   **Retrieves:** Relevant text snippets from the fetched articles.
    *   **Generates:** A concise explanation of the theme's significancemarkdown
6. Save in chat log and everytime its openend again only update RSS feed with new entries and redo analysis. (= live digest)


### Describe how you plan to divide the system technically. You must cover:

- **Server:** Spring Boot REST API
- **Client:** React / Angular / Vue.js frontend
- **GenAI Service:** Python, LangChain microservice
- **Database:** (e.g., PostgreSQL, MongoDB)

Include three UML diagrams (Analysis object model, Use cases, and Top-level architecture):

- A simple analysis object model in the form of a UML class diagram
![image](https://github.com/AET-DevOps25/team-dev_ops/blob/main/docs/Product%20backlog%20%26%20architecture/assets/Class_Diagram.png)

- A use case diagram
![image](https://github.com/AET-DevOps25/team-dev_ops/blob/main/docs/Product%20backlog%20%26%20architecture/assets/use-case.png)

- A UML component diagram to visualize the architecture (this can be understood as the "top-level architecture diagram")
![image](https://github.com/AET-DevOps25/team-dev_ops/blob/main/docs/Product%20backlog%20%26%20architecture/assets/Architecture.png)
