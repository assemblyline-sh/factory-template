# Intake

<% if (seeded.length === 0) { -%>
No new files in `<%= source_dir %>`.
<% } else { -%>
Seeded <%= seeded.length %> workpiece(s) from `<%= source_dir %>`:

<% for (const id of seeded) { -%>
- `<%= id %>`
<% } -%>
<% } -%>

Already seen: <%= skipped_count %>
