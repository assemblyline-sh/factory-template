# Word count

<% if (results.length === 0) { -%>
No workpieces in `EX1/input`.
<% } else { -%>
| Workpiece | Words | Result |
|---|---|---|
<% for (const r of results) { -%>
| `<%= r.workpiece_id %>` | <%= r.words ?? '—' %> | <%= r.error ? 'failed: ' + r.error : 'done' %> |
<% } -%>
<% } -%>
