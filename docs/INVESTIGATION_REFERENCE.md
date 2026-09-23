# Investigation reference implementation

This branch implements the approved graph-investigation reference with the existing API and Cytoscape graph. It is based on `ce7b6c03b3f2bb3ea394fabf111a2982d7e2034f`; later concurrent language/theme changes on main are not merged here. The team checkout and main branch are unchanged. Integrate the layout and graph improvements with that localization work before merging this branch into main.

## Behavior

- Narrow dark navigation rail, white header, compact counts, large graph, dark node dossier, collapsible evidence and priority queue.
- Stable organic graph layout, sparse collision-aware labels, directed paths on hover, edge details, zoom, fit, reset and reduced motion.
- Actual API figures and exact string identifiers. Brand colors are independent of analytical role/cluster colors.
- Existing graph search, depth, cluster selection, history, ranking pagination, AI factual fallback and CSV downloads remain available.
- Söhne is the preferred font family; no licensed webfont files are included, so systems without it use the fallback stack.

## Validation

18 frontend tests, TypeScript, ESLint and production build. Playwright verified the real 2,248-node dataset, 33-node focused view, nonblank canvas pixels, search errors and recovery, 0/1/2 hops, node clicks, browser history, cluster resets, ranking pagination, assistant fallback, CSV download, 320-1440px viewports and reduced motion. Graph-specific tests also exercise 250 nodes and isolated nodes.

## Run

Use the existing frontend and backend README instructions. Set `NEXT_PUBLIC_API_BASE_URL` to the backend origin and include the frontend origin in backend `CORS_ORIGINS`. Open `/workspace`, run analysis and select a node. The developer's local 5176/8001 port configuration is not committed.
