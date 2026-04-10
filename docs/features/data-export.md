# Data Export

## Response data (CSV)

- **Study workspace → Responses:** client-side **Download CSV** from the loaded response list (same fields as `GET /admin/studies/:studyId/responses` after filtering).

## Analytics print / PDF

**Where:** `/admin/analytics` — button **Print / PDF** opens the browser print dialog (“Save as PDF” where supported).

**What is printed**

- A compact **print header**: title “Analytics”, **study scope** (all studies or the selected study name), **custom date range** when that mode is applied, and the **active tab** name (Overview, Performance, Modalities, Demographics).
- The **current tab’s content only** (charts, tables, KPIs, legends for that tab). Hidden in print: sidebar, filters card, tab bar, page chrome, and the on-screen analytics title/lead.

**Print styling (implementation)**

- **Layout:** Print CSS removes the sidebar offset and uses full content width so PDFs are not shifted or clipped horizontally.
- **Colors:** Background fills (heatmap cells, confusion-matrix tints, legend swatches, gradients) use forced **background graphics** via `print-color-adjust: exact` on the analytics print subtree so they appear in PDFs in Chromium-based browsers.
- **Page breaks:** Section titles and subtitles are kept with the following block where possible; chart cards, KPI tiles, heatmap blocks, Recharts containers, and per-modality confusion cards use **avoid page breaks inside** when the block fits on one page. Very tall sections may still split across pages.
- **Footer:** A print-only **credit** line at the end: project title **Detecting the Artificial** and the GitHub repository link (`https://github.com/chsc1053/detecting-the-artificial`).

If colors are still missing in a given browser, check the print dialog for an option such as **Background graphics** / **Print backgrounds** and enable it.

## Related

- [Admin panel analytics](analytics.md)
- [Response collection](response-collection.md)
- [Experiment config](experiment-config.md)
- [API endpoints](../api/endpoints.md)

