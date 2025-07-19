# Web Client

React 18 + Vite + TypeScript single-page application for exploring research trends through AI-powered analysis.

## Core Stack
- **React 18** with hooks and functional components.
- **Vite** for lightning-fast dev server and Rollup-based production builds.
- **Tailwind CSS** plus **shadcn/ui** (Radix primitives) for styling and accessible UI components.
- **Type-safe API client** (axios) auto-generated from the shared **OpenAPI** spec via bash script
- Built and linted with **ESLint** and shipped via **Docker + Nginx**.

## Project Structure
```text
src/
├── api/
│   └── client.ts                # Pre-configured OpenAPI client instances
├── generated/
│   └── api/                     # Auto-generated axios client (git-ignored)
├── components/
│   ├── ui/                      # Base shadcn components
│   ├── Header.tsx
│   ├── QueryForm.tsx
│   ├── SettingsForm.tsx
│   ├── StartExploringForm.tsx
│   ├── AnalysisHistory.tsx
│   ├── AnalysisItem.tsx
│   └── TopicResult.tsx
├── hooks/
│   ├── useStartAnalysis.ts      # Start analysis + polling logic
│   └── useAnalysisHistory.ts    # Fetch & manage analysis list
├── lib/
│   └── utils.ts                 # Helper utilities (Tailwind class merge, etc.)
├── index.css                    # Tailwind entry
└── main.tsx                     # React root
```

## Key Features
- Query submission with optional advanced settings.
- Live status updates (“classifying”, “fetching articles”, …) with animated progress.
- Topic & article visualisation including relevance scores.
- Analysis history with removal and dark-mode support.

## API Integration
For detailed backend endpoints see the [Swagger Docs](https://aet-devops25.github.io/team-dev_ops/swagger/).

The frontend uses the OpenAPI-generated axios client located in `src/generated/api`, wrapped by `src/api/client.ts`.  Run the generator anytime after the spec changes:

```bash
npm run generate-client
```

## User Flow

1. **QueryForm** collects the search terms and hands control to `useStartAnalysis`.
2. **useStartAnalysis** sends a `startAnalysis` request via the generated OpenAPI client.
3. The **Spring API Server** kicks off an asynchronous pipeline (LLM classification → article fetcher → embedding & topic discovery).
4. The hook polls `getAnalysis` for status updates. Progress messages drive the loading UI.
5. Once the server marks the job `COMPLETED`, React state updates and visual components (`AnalysisHistory`, `TopicResult`) re-render with final data.

## Running Locally
```bash
npm install            # install deps
npm run dev            # start Vite dev server on http://localhost:5173
```

## Production Build
```bash
npm run build          # builds to dist/
```

## Docker
The multi-stage `Dockerfile` builds the static assets and serves them via Nginx:

```bash
docker build -t niche-explorer-client ./web-client
```

Then run with:

```bash
docker run -p 80:80 niche-explorer-client
```
