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
