# Changelog

## Unreleased
### Fixed
- Constellation lines now join only *consecutive* days, as the README describes (they previously joined every entry in the month)
- Clearing the date field no longer breaks the chart (month became "undefined 0")
- Removing a star now asks for confirmation
- Switching day, opening a star or starting a new entry no longer silently discards unsaved text
- Save and remove now report failures (storage full or blocked) instead of failing silently
- Corrupt data in `localStorage` is ignored instead of breaking the app
- Stars are keyboard accessible, have a larger tap target and screen-reader labels; mood swatches are proper radio buttons
### Added
- Rename a month's constellation (the generated name is the default)
- Current streak and a gentle nudge after a week with no stars
- Export / import JSON backup (imports are validated and merged)
- Save the month's sky as an SVG keepsake
- Installable, offline-capable PWA; GitHub Pages deploy workflow; MIT license

## 1.0.0
- Monthly star chart, mood-coloured stars, generated constellation names, local storage
