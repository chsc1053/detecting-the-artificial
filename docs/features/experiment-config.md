# Experiment Configuration

## Scope

- **Admin panel** (single, auth-protected interface): **create studies** (name, description, active flag, demographics mandatory) via UI → `POST /admin/studies`; list and open studies; **delete** via `DELETE /admin/studies/:studyId`.
- **Stimuli** are created on `/admin/stimuli` (global library): text content or media URL + metadata; trials reference these rows by id.
- Add trials to a study; choose each trial's type (forced-choice or single-item — a study can contain only one type or a mix); assign stimuli of **any** modality from the global list.
- Running a study (making it active so participants can take it).

## Related

- [Admin panel (IA &amp; navigation)](admin-panel.md)
- [Stimulus delivery](stimulus-delivery.md)
- [Response collection](response-collection.md)
- [Data export](data-export.md)
- [Admin panel analytics](analytics.md)
