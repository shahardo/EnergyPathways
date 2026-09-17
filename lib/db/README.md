# `lib/db/`

Drizzle ORM schema and queries over `better-sqlite3` (SPEC §6.1–6.2), built in
DEV-PLAN T4. Will hold the schema for the value tables (`channels`,
`sub_scores`, `dimension_averages`, `trajectories`, `channel_text`,
`roadmap_items`, `callouts`, `ramp`, `dataset_meta`) and layout metadata
tables (`axis_groups`, `row_labels`, `color_scale_rules`, `sparkline_specs`,
`phase_bands`), plus `getWorkbookPayload()` and `getChannel(id)`.

Not yet implemented.
