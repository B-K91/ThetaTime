# ThetaTime Dashboard

A simple single-page web app for tracking closed options trades. Add trades manually or import from a CSV file and view summary statistics and charts.

## Usage

Open `index.html` in a browser. No build step or dependencies are required.

## Features

- Manual form entry or CSV import of closed trades
- Automatic net profit calculation per trade
- Scrollable, sortable trade table with profit/loss colors
- Summary cards for total profit, average premium, trade count, average duration, win rate
- Line chart of cumulative profit
- Bar chart of monthly P&L

All styling and behavior are implemented with plain CSS and JavaScript (no external libraries required).

## Deployment

Follow these steps to host the site with GitHub Pages:

1. Push this repository to GitHub.
2. In the repository **Settings**, open the **Pages** section. Choose **main** as the branch and `/ (root)` as the folder, then save. GitHub's documentation includes a screenshot of this page for reference.
3. Once enabled, GitHub displays the URL in the form `https://<username>.github.io/<repo>/`. It may take a minute for the site to appear.

Tip: Refresh the **Pages** settings if the URL doesn't show up immediately.

