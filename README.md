# EB Priority Date Tracker

Historical U.S. employment-based visa bulletin cutoffs (Dates for Filing and Final Action) by region and EB category, with wait-time and yearly-movement charts.

Live site: https://mwdacw.github.io/visa-bulletin/

- `scrape.py` pulls chart data from [visa-bulletin.us](https://visa-bulletin.us/employment-based/) (compiled from the State Department Visa Bulletin).
- `build.py` writes `docs/index.html` and `docs/data.json`, served by GitHub Pages.
- `stats.py` collects USCIS I-140 / I-485 / awaiting-visa statistics into `docs/stats.json` (the "Filings & approvals" tab). USCIS only lists the newest quarter, so each new file is parsed once and merged into the history.
- PERM figures come from DOL's PERM Selected Statistics PDFs in `data/perm_pdfs/`. dol.gov blocks scripted downloads, so add each new quarter's PDF there by hand.
- A GitHub Actions workflow runs these daily and commits only when the data changed. Run it by hand from the Actions tab ("Update visa bulletin data" → Run workflow).

For reference only, not legal advice.
