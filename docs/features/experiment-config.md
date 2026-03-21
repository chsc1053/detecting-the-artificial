# Experiment Configuration

## Scope

- **Admin panel** (single, auth-protected interface): **create studies** (name, description, active flag) via UI → `POST /admin/studies`; list studies from `GET /studies`. Edit/delete studies and add trials next.
- Add trials to a study; choose each trial’s type (forced-choice or single-item — a study can contain only one type or a mix).
- Associating stimuli (text, image, video, audio) with trials and recording modality/model provenance.
- Running a study (making it active so participants can take it).

## Related

- [Admin panel (IA & navigation)](admin-panel.md)
- [Stimulus delivery](stimulus-delivery.md)
- [Response collection](response-collection.md)
- [Data export](data-export.md)
- [Admin panel analytics](analytics.md)
