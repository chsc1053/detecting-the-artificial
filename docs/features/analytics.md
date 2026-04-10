# Admin Panel Analytics

## Implemented

- **Route:** `/admin/analytics` (sidebar **Analytics**). There is **no separate per-study analytics URL**: the same page supports **cross-study** and **per-study** views via **Study scope** (all studies vs one study → `study_id`). From a study's **Overview** tab, **Open Analytics for this study** links to `/admin/analytics?study_id=…` to pre-select that study.
- **Scope & time:** One card combines **study scope** and **time range** (**All time** or custom `from` / `to` as ISO bounds). A status line at the bottom summarizes the active scope and range.
- **Tabs:**
  - **Overview** — Intro line, KPI grid (participants, responses, studies when multiple, trials, mean/median confidence, overall accuracy), pie (correct vs incorrect), bar charts for accuracy by modality and by task type; unscored responses are not included.
  - **Performance** — KPIs (overall / forced-choice / single-item accuracy, mean confidence, point-biserial *r*, *d'*); **confidence vs accuracy** scatter with regression line, **per-response** vs **per-participant** toggle; accuracy **heatmap** (modality x task type); **confidence calibration** line chart; correct/incorrect **confidence box plots**; *r* / *d'* card with metric values, short interpretations, and **info** popovers for full definitions. Data from `GET /admin/analytics/performance`. *d'* uses **jStat** on the backend (Φ⁻¹).
  - **Modalities** — Per-modality quick accuracy KPIs; grouped bars for accuracy and for mean confidence by task type x modality; **radar** (accuracy % vs confidence scaled 0-100); **confusion matrices** (AI vs human) by modality. Uses fields from `GET /admin/analytics` (e.g. `by_modality_task_type`, `confusion_matrix_by_modality`).
  - **Demographics** — Participant counts by education and AI exposure, omission note when participants lack demographics; bar charts for accuracy and confidence vs education / AI exposure x modality; line chart for accuracy and confidence by age. Uses demographic aggregates from `GET /admin/analytics`.

## API

- `GET /admin/analytics` — summary, by-study / task / modality breakdowns, modality x task accuracy and confidence, confusion matrices, confidence histogram, education/AI-literacy slices, demographic participant KPIs and richer breakdowns (see [API endpoints](../api/endpoints.md)).
- `GET /admin/analytics/performance` — scatter rows, box-plot stats, heatmap cells, KPIs, correlation, *d'*, SDT counts (see [API endpoints](../api/endpoints.md)).

## Notes

- **Scored only:** Analytics APIs filter with `is_correct IS NOT NULL`. Unscored rows appear on each study's **Responses** tab (highlighted) but do not affect aggregates.
- **Modality** uses the primary stimulus on the trial (`single_stimulus_id`, else `human_stimulus_id` for forced-choice context).
- **Accuracy** is **correct / (correct + incorrect)** among included (scored) responses.
- Per-study raw exports remain on each study's **Responses** tab (**Download CSV**).
- **Print / PDF:** **Print / PDF** exports the **active tab** through the browser (header, tab content, print-tuned layout/colors/page breaks, project credit footer). No extra backend endpoint. Details: [Data export](data-export.md).

## Related

- [Admin panel (IA & navigation)](admin-panel.md)
- [API endpoints](../api/endpoints.md)
- [Database schema](../architecture/database.md)