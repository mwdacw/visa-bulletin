# EB Priority Date Tracker

Historical U.S. employment-based visa bulletin cutoffs (Dates for Filing and Final Action) by region and EB category, with wait-time and yearly-movement charts.

Live site: https://mwdacw.github.io/visa-bulletin/

- `scrape.py` pulls chart data from [visa-bulletin.us](https://visa-bulletin.us/employment-based/) (compiled from the State Department Visa Bulletin).
- `build.py` writes `docs/index.html` and `docs/data.json`, served by GitHub Pages.
- `stats.py` collects USCIS I-140 / I-485 / awaiting-visa statistics into `docs/stats.json` (the "Filings & approvals" tab). USCIS only lists the newest quarter, so each new file is parsed once and merged into the history.
- PERM figures come from DOL's PERM Selected Statistics PDFs in `data/perm_pdfs/`. dol.gov blocks scripted downloads, so add each new quarter's PDF there by hand.
- `aos_charts.py` records which chart (Dates for Filing = Chart B, or Final Action) USCIS designated for employment-based I-485 filing each month since Oct 2015, from USCIS's Adjustment of Status Filing Charts page and its monthly archive (`docs/aos_charts.json`).
- A GitHub Actions workflow refreshes the visa bulletin daily and commits only when the data changed. Run it by hand from the Actions tab ("Update visa bulletin data" → Run workflow).
- uscis.gov blocks GitHub's runners, so `local_update.sh` runs `aos_charts.py` and `stats.py` daily from a Mac (macOS LaunchAgent) in a dedicated clone and pushes any changes.

## Local USCIS sync (Mac)

Needs `git`, [`uv`](https://docs.astral.sh/uv/) and the GitHub CLI logged in (`gh auth login`, plus `gh auth setup-git`).

```sh
./install_local_sync.sh             # install the daily 10:30 job and run it once
tail -f ~/Library/Logs/visa-bulletin-sync.log
./install_local_sync.sh uninstall   # remove it
```

The job works in its own clone (`~/Library/Application Support/visa-bulletin-sync`) and resets it to `origin/main` on every run, so it never touches your working copy. A run missed while the Mac sleeps happens on wake; a day the Mac is off is skipped.

## Adding a PERM quarter

When DOL posts a new *PERM Selected Statistics* PDF on its [performance data page](https://www.dol.gov/agencies/eta/foreign-labor/performance), save it into `data/perm_pdfs/` (keep DOL's file name), run `uv run --with openpyxl --with pypdf stats.py && uv run build.py`, and commit.

For reference only, not legal advice.
