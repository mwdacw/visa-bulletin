# EB Priority Date Tracker

Historical U.S. employment-based visa bulletin cutoffs (Dates for Filing and Final Action) by region and EB category, with wait-time and yearly-movement charts.

Live site: https://mwdacw.github.io/visa-bulletin/

- `scrape.py` pulls chart data from [visa-bulletin.us](https://visa-bulletin.us/employment-based/) (compiled from the State Department Visa Bulletin).
- `build.py` writes `docs/index.html` and `docs/data.json`, served by GitHub Pages.
- A GitHub Actions workflow runs both daily and commits only when the data changed. Run it by hand from the Actions tab ("Update visa bulletin data" → Run workflow).

For reference only, not legal advice.
