# Salon API – Jest API Automation

Jest + Axios automation for the salon backend: **Register → Login → Available slots → Book → Cancel**, with positive, negative, authentication and authorization tests.

## Prerequisites
- **Node.js 18+** (tested on 20)
- **MongoDB** running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI
- The salon API running (`npm run dev`, port 3000 by default)
- Dev dependencies added by this suite: `jest`, `axios`, `mongodb`. It also reuses the app's `bcryptjs`, `jsonwebtoken` and `dotenv`.

## Environment setup
```bash
npm install --ignore-scripts
npm i -D jest axios mongodb --ignore-scripts
cp .env.example .env
```

| Variable | Purpose | Default |
|---|---|---|
| `BASE_URL` | API base URL used by the tests | `http://localhost:3000/api` |
| `MONGO_URI` | Same DB the app uses (for seeding/cleanup) | `mongodb://localhost:27017/salon-db` |
| `JWT_SECRET` | Must match the app, used to forge expired/invalid tokens | `supersecretjwtkey_12345` |

Add to `package.json`:
```json
"scripts": {
  "test": "jest --runInBand",
  "test:core": "jest --runInBand --testNamePattern=\"^(?!.*BUG)\""
}
```

## Run tests
1. Start MongoDB.
2. Start the API in one terminal: `npm run dev`
3. Run the suite in another: `npm test`
   - Only tests for confirmed behaviour: `npm run test:core`
   - One file: `npx jest tests/e2e/flow.test.js`

## Project structure
```
tests/
  auth/      register, login, authorization (token + role checks)
  salon/     available-slots
  booking/   create, cancel
  e2e/       full flow
  helpers/   apiClient, dataFactory, auth, bookings, seedData, time
  setup/     globalSetup, globalTeardown, env
jest.config.js
.env.example
```

## Test configuration
- `jest.config.js`: Node environment, `tests/**/*.test.js`, 20s timeout, global setup/teardown.
- `--runInBand`: tests run serially because they share one database.
- Axios uses `validateStatus: () => true`, so 4xx/5xx responses can be asserted.

## Setup / teardown
- **Global setup** checks the API and MongoDB are reachable, then inserts directly into MongoDB: 2 salons (09:00–18:00), 3 services (60 min, 30 min, one at the other salon), 2 stylists and 1 admin. Stylists and admins can't be created through the API because `/register` always creates customers. IDs are written to `.seed.json`.
- **Global teardown** deletes all seeded salons/services, their bookings, and every user with an `@e2e.test` email, then removes `.seed.json`.
- Every test creates its own users with unique emails, so runs are repeatable and independent.

## Assumptions
- API routes are mounted under `/api` (from `index.ts`).
- Bookings use fixed future dates in 2030 (one date per test file) to avoid clashing with real data and each other.
- Slot rules from the controller: 30-minute grid, only `booked` bookings block a slot, conflicts are per stylist.
- Tests marked **`[BUG?]`** assert the *correct* behaviour that the API currently doesn't enforce. They fail on purpose to document defects.

## Known findings (`[BUG?]` tests)
- Missing or invalid input on register/login/booking returns 500 (or is accepted) instead of 400.
- No email format validation.
- Bookings are accepted in the past, outside opening hours, with a malformed `slotTime`, and with a service from another salon.
- Invalid ObjectIds in the URL return 500.
