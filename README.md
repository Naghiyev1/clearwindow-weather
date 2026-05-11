# ClearWindow v1.0 — Rain, Wind & Air Weather

A practical weather app focused on rain, wind gusts and air quality.

Data source: Open-Meteo Forecast API, Air Quality API and Geocoding API. No API key required.

## Features

- Barcelona-first default
- Current weather
- Rain next 3 hours
- Wind annoyance score
- Gust watch
- European AQI
- PM2.5 / PM10
- UV index
- Best and worst outdoor windows
- Hourly forecast
- Location search
- Use my location
- Saved locations
- Mobile-first PWA-style app

## Upload

Upload all files to your repo root.


## v1.1 — Tomorrow + Weekly + Visual Polish

What changed:
- Added Tomorrow view
- Added Weekly 7-day outlook
- Improved visual hierarchy and premium styling
- Added weather icon orb for Tomorrow
- Added daily outdoor score
- Added rain / wind / AQI / UV summary per day
- Added best and worst windows for tomorrow
- Cache bumped to v1.1


## v1.1.1 — Tomorrow/Weekly Route + Style Fix

Fixes:
- Tomorrow nav now renders Tomorrow view
- Weekly nav now renders Weekly view
- Explicit render routing
- New versioned filenames: `app-v1-1-1.js`, `style-v1-1-1.css`
- Service worker cache bumped to `clearwindow-v1-1-1`
- Brand now shows version number so you can confirm the new build is live

If nothing changes after upload, clear site data for the GitHub Pages URL.


## v1.2 — Main Page Polish + Human Wording

What changed:
- Rebuilt Today as a clearer decision screen
- Replaced vague wording such as “Usable, but check timing”
- Added more human verdicts like:
  - Good to go
  - Go, but watch the wind
  - Go between the dry windows
  - Rain window ahead
  - Wind will be annoying
- Added larger premium hero
- Added best-window / watch-out strip
- Added polished Rain / Wind / Air cards
- Cache bumped to v1.2
