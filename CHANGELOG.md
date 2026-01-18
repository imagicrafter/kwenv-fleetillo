# Changelog

All notable changes to OptiRoute are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2026-01-18] - Issue #4: Fix dispatch-scheduler startup failure

### Fixed
- Made `GOOGLE_MAPS_API_KEY` optional in config so scheduled jobs (dispatch-scheduler, end-of-day) that don't use Google Maps API can run without the key configured.

---

## [Unreleased]

### Added
- Initial changelog setup.

---

<!-- 
Template for new entries (added automatically on merge):

## [YYYY-MM-DD] - Issue #N: Short Description

### Added
- New features or capabilities.

### Changed
- Changes to existing functionality.

### Fixed
- Bug fixes.

### Removed
- Removed features or deprecated items.
-->
