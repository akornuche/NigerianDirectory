# Daily news digest pipeline

Builds each day of the `/news/` digest as a **draft** for editorial review.

1. `collect_wp.py <YYYY-MM-DD ...>`: fetches the day's posts (title, link, date,
   opening paragraph) from outlets with an open WordPress posts API: Premium
   Times, Daily Trust, BusinessDay, ThisDay, Nairametrics, Leadership. Outlets
   behind bot protection (Punch, Vanguard, Channels, TheCable) are not scraped.
2. `cluster.py <day>`: groups reports of the same event across outlets.
3. `shortlist.py <day> [n]`: ranks stories by how many outlets carried them,
   then by news weight, and writes the candidates an editor writes from.
4. Summaries are written by hand in `digests/<day>.json`: our own headline,
   two or three sentences of facts from the reports, a category, states, and
   the shortlist indexes whose articles become the cited sources. Opinion
   pieces, tributes and advertorials are left out; claims are attributed.
5. `build_sql.py <day>`: turns the digest into SQL that loads the day as a
   draft (up to 50 stories), and warns when any summary shares more than 15%
   of its eight-word phrases with the source text.

A day goes public only when an editor publishes it at `/admin/news/`.

## Deepening a published day

Each day page should carry at least 1,000 words of our own text.

1. `fetch_full.py <day ...>`: reads fuller text of each story's sources by slug
   from the outlets' WordPress API into `full/<day>.json`.
2. `brief.py <day>`: prints each story with that text to write from.
3. Write `expand/<day>.json`: `{"lead": "standfirst\n\nThe day in brief: ...",
   "s": {"<rank>": "longer summary"}}`. Short attributed quotes are allowed;
   text in quotation marks is left out of the overlap check, up to 40 quoted
   words per summary.
4. `expand.py <day>`: applies it, re-runs the originality check, refuses under
   1,000 words, and writes `sql/<day>-update.sql`, which updates the day in
   place by day and headline (works for published days).
