---
description: Rules for handling test data and database seeding
---

# Test Data Policy

**CRITICAL:** Never add, insert, seed, or modify test/mock/sample data in the database without EXPLICIT user permission.

## Prohibited Actions (unless explicitly requested):
1. Running seed scripts (e.g., `seed-bookings.ts`, `seed-clients.ts`)
2. Inserting mock/sample records into Supabase tables
3. Executing any SQL INSERT statements with test data
4. Running any scripts in the `scripts/` directory that add data

## When working on UI/dashboards:
- Use hardcoded display values in HTML/templates (safe - doesn't affect database)
- Do NOT fetch real data and replace with mock data
- Do NOT run backend seed scripts to "populate" data for testing

## If data is needed for testing:
1. ASK the user first: "Should I add test data for this feature?"
2. Wait for explicit approval before any data insertion
3. Document what data will be added before executing

## Safe operations (no permission needed):
- Modifying UI/HTML/CSS with static placeholder text
- Reading existing data from the database
- Querying data for display purposes
