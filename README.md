## Plagify – AI Code Quality & Plagiarism UI

Futuristic, fully client-side UI for exploring plagiarism, quality insights, and AST visuals across two code snippets. Built with Next.js 14 App Router, Tailwind v4, shadcn/ui, Framer Motion, Monaco Editor, and React Three Fiber/Drei.

### Features
- Neon-animated landing page with 3D hero scene and CTA into the checker.
- Dual Monaco editors with synchronized scrolling, highlight decorations, and upload/paste workflows.
- Result workspace containing similarity gauges, quality score cards, AST tree explorer, and a 3D embedding sphere.
- Placeholder async API functions (`lib/apiPlaceholders.ts`) ready to be swapped for real services (plagiarism, quality, AST).
- Shared dark-neon layout, animated navbar/footer, and reusable glassmorphic utilities.

### Tech Stack
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS v4, shadcn/ui, tw-animate-css
- Framer Motion, React Three Fiber, Drei
- @monaco-editor/react

### Local Development
```bash
npm install
npm run dev
# visit http://localhost:3000
```

### Production Build & Linting
```bash
npm run lint
npm run build
```

### Placeholder APIs
`lib/apiPlaceholders.ts` exposes `checkPlagiarism`, `checkCodeQuality`, and `generateAST`. Each currently waits 600 ms, returns deterministic mock data, and references the provided code so the UI animates realistically. Replace their internals with actual HTTP calls when backend endpoints are ready.

### Project Structure Highlights
- `app/page.tsx` – landing experience with hero callouts and embedding preview.
- `app/checker/page.tsx` + `components/screens/CheckerScreen.tsx` – primary comparison workspace.
- `components/` – UI atoms (editors, panels, neon background, nav/footer, upload tabs, etc.).
- `lib/apiPlaceholders.ts` – mocked async services.

### Next Steps
1. Wire placeholder functions to real APIs.
2. Add auth/tenant context if needed.
3. Extend result panels with analytics or export actions.
