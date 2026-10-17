# Winery Lab PWA — Google Sheets + GitHub Pages

A starter progressive web app (PWA) for a **read-only** winery dashboard. It includes brand/alcohol lookup, search across batch/tank and lab records, analysis filters, summary counts, and offline display of the last successfully loaded data.

## 1. Prepare the Google Sheet

For easiest setup, create two tabs:

### `Brands`
Recommended headers:
`Brand`, `Alcohol %`

### `LabResults`
Recommended headers:
`Date`, `Brand`, `Batch`, `Tank`, `pH`, `TA`, `Free SO2`, `Total SO2`, `VA`, `RS`, `Alcohol %`, `Notes`

Headers can have slightly different names; the app recognizes common variants such as `Brands`, `ABV`, `FSO2`, `Free SO₂`, `Total Acidity`, `Residual Sugar`, `Batch ID`, and `Tank ID`.

## 2. Publish each tab as CSV

In Google Sheets:
1. Open the spreadsheet.
2. Select **File → Share → Publish to web**.
3. Choose the `Brands` tab and **Comma-separated values (.csv)**, then publish.
4. Copy the published CSV link.
5. Repeat for `LabResults`.
6. Paste both URLs into `CONFIG` near the top of `app.js`:

```js
const CONFIG = {
  brandCsvUrl: "PASTE_BRANDS_PUBLISHED_CSV_URL_HERE",
  labCsvUrl: "PASTE_LABRESULTS_PUBLISHED_CSV_URL_HERE",
  cacheKey: "winery-lab-pwa-cache-v1"
};
```

**Privacy warning:** Publishing a tab makes its published contents accessible to people who have the link and may make them discoverable. Do not publish confidential production data, customer information, passwords, or internal records that should remain private. A public read-only app is only appropriate for data approved for public access.

## 3. Upload to GitHub Pages

1. Sign in at https://github.com/ and create a new repository, e.g. `winery-lab-pwa`.
2. Upload all files and folders from this project to the repository root. Keep `index.html` at the root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. Your URL will look like `https://YOUR-USERNAME.github.io/winery-lab-pwa/`.

GitHub Pages serves over HTTPS, which is required for service workers/PWA installation (localhost is also acceptable for testing).

## 4. Install on a phone

- **Android / Chrome:** Open the published site, use the browser menu, and choose **Install app** or **Add to Home screen**.
- **iPhone / Safari:** Open the site, tap **Share**, then **Add to Home Screen**.
- **Desktop Chrome/Edge:** Use the install icon in the address bar if shown.

## 5. Offline behavior

The service worker caches the app shell. After a successful online load, the app also saves the most recently fetched records in local storage. When offline, it attempts to show those saved records. Open the app online once before relying on offline use. Offline data can be stale; use **Refresh data** when connected.

## 6. Test locally

A service worker will not work reliably if you open `index.html` directly as a `file://` URL. Use a local web server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## 7. Troubleshooting

- **Sample data appears:** Add the published CSV URLs to `app.js`, commit and push the change.
- **CSV fetch error / CORS:** Ensure the link is the Google Sheets **published CSV** URL, not the normal edit URL. Test the CSV link in a private browser window.
- **Columns are blank:** Make sure the sheet's first row contains headers. Check that brand columns use names such as `Brand` / `Brands` and alcohol uses `Alcohol %` / `ABV`.
- **PWA install option missing:** Visit the deployed HTTPS URL, check that manifest and icon files load, and reload after deployment.
- **Data not updating:** Tap **Refresh data**. Google Sheets publishing and browser caching may introduce a delay.

## Files

- `index.html` — page structure
- `styles.css` — responsive design
- `app.js` — Google CSV loading, search/filtering, offline data cache
- `manifest.webmanifest` — PWA installation metadata
- `sw.js` — offline app-shell caching
- `icons/` — install icons
