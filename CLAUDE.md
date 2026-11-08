# BroPS

Private mobile app for a group of motorcycle friends. Riders share their position with their group during a ride, get notified when friends start or end a ride, and see a live speedometer. A personal garage comes later.

Backlog: GitHub issues on `Itoukee/Bro-ps`, ordered by phase. Pick the lowest open issue whose dependencies are closed. The repository is public, so nothing private goes in code, issues or commits.

## Stack

- App: Expo (React Native, TypeScript strict) with a dev build. Expo Go cannot do background location.
- Backend: Supabase (Postgres, Auth, Realtime Broadcast, Edge Functions, Storage).
- Map: MapLibre with MapTiler tiles.
- Push: Expo Push through FCM.

Android only for now, distributed as a free APK. Issues #21, #22 and #23 (iOS) are deferred. Keep platform specifics inside infrastructure adapters so iOS can be added later without touching the domain.

Commands (Node 24):

- `npm ci`: install the locked dependencies.
- `npm run lint`: ESLint, with warnings treated as errors.
- `npm run typecheck`: TypeScript strict.
- `npm test`: Jest on the Android preset.
- `npm start`: start Metro for an installed dev build.
- `npx eas-cli@latest build --platform android --profile development`: dev client APK, run against Metro.
- `npx eas-cli@latest build --platform android --profile preview`: release-variant APK with the JS embedded, for testing without Metro.
- `npx supabase@3.0.0 db start`: local database with the migrations applied. Needs Docker.
- `npx supabase@3.0.0 db reset`: rebuild the local database from the migrations.
- `npx supabase@3.0.0 test db`: run the pgTAP tests in `supabase/tests`.
- `npx supabase@3.0.0 stop`: stop the local stack.

Builds run on Expo EAS Build, which needs the owner's Expo login. No local Android SDK is used. Signing credentials stay on EAS, never in the repository.

## Product rules that must not regress

- Location is collected and shared only during a ride. Never outside one.
- A ride ends by itself after 20 minutes parked.
- No turn-by-turn navigation.
- The speed threshold is 130 km/h, checked on the phone.
- At most one speed alert per rider, per ride, for both the rider voice alert and the friend notification.
- Friend speed alerts are opt-in per user, off by default.
- No log of who went over the limit. The "alert sent" marker is cleared when the ride ends.
- Friends see a track only while the ride is in progress. Afterwards it is private to the rider.
- Raw tracks are deleted after 30 days.
- The design never rewards or celebrates speed.
- Riding controls are usable with gloves: touch targets of at least 64 px. Other screens: at least 44 px.
- Dot characters stay original. Never imitate the characters of another navigation app.

## How to work

### Baby steps

- One issue at a time, one behavior at a time.
- Each step is small enough to leave the tests green and be committed on its own.
- If a step feels big, split it before writing code.
- Do not add features, options or abstractions the current issue does not need.

### TDD

Red, green, refactor, in that order.

1. Write one failing test that describes one behavior. Run it and see it fail for the expected reason.
2. Write the minimum code that makes it pass.
3. Refactor with the tests green.

- Every bug fix starts with a failing test that reproduces the bug.
- Test behavior through public interfaces, not implementation details.
- Domain and application layers: unit tests with no framework and no network.
- Components: React Native Testing Library, querying by role or label.
- Database: every Row Level Security policy has a test proving both allowed and denied access.
- GPS, audio and push cannot be proven by unit tests. Put them behind ports, test the logic with fakes, and check the real adapters on a real phone. State what was and was not checked on the device.
- Exception: spikes such as #1 are throwaway code. They live on a `spike/` branch, record their findings in the issue, and are never merged.

### SOLID

- Single responsibility: a module has one reason to change.
- Open/closed: add a behavior through a new implementation of a port, not through a growing conditional.
- Liskov: every adapter and fake honors the full contract of its port.
- Interface segregation: small ports shaped by what the use case needs.
- Dependency inversion: use cases depend on ports, and adapters are injected at the composition root.

Apply these to real seams. Do not create an interface for something with a single implementation and no test need.

## Architecture: Domain-Driven Design

Bounded contexts, with the ubiquitous language used in code, tests and issues:

- `identity`: Rider, Profile, Dot.
- `groups`: Group, Membership, Invite, default group.
- `riding`: Ride, Position, Track, Speed, SpeedLimit.
- `alerts`: SpeedAlert, RideNotification, NotificationSettings.
- `garage`: Motorcycle, MaintenanceItem.

```
src/
  contexts/<context>/
    domain/          entities, value objects, domain events, repository ports
    application/     use cases
    infrastructure/  Supabase, expo-location and push adapters
  ui/                atomic design, see below
  app/               Expo Router routes, thin, render a page only
supabase/
  migrations/
  functions/
```

Dependencies point inward only: `ui` and `infrastructure` depend on `application`, which depends on `domain`.

- `domain` imports no React, Expo or Supabase.
- Business rules live in the domain, such as "one alert per ride" or "a ride ends after 20 minutes parked". Never in components or adapters.
- Invalid states are unrepresentable: use value objects such as `Speed` and `InviteCode` instead of raw primitives.
- Contexts talk through application interfaces or domain events, never by importing another context's internals.

## Frontend: Atomic Design

```
src/ui/
  atoms/       Button, Text, Toggle, Dot
  molecules/   RiderRow, SettingRow, SpeedBar
  organisms/   RiderSheet, GroupCard, FriendsMapLayer
  templates/   layouts with no data
  pages/       screens, the only level that calls use cases
  theme/       tokens
```

- Each level imports only from levels below it.
- Atoms, molecules, organisms and templates are presentational: data comes in through props, events go out through callbacks. No use cases, no Supabase.
- Colors, fonts and spacing come from theme tokens, never hard-coded.
- Reachable by screen reader: every control has a role and a label.

## Git flow

- `main`: released versions only, tagged. `develop`: integration branch.
- `feature/<issue>-<slug>` from `develop`, merged back through a pull request.
- `release/<version>` from `develop`, merged into `main` and `develop`.
- `hotfix/<version>` from `main`, merged into `main` and `develop`.
- `spike/<issue>-<slug>` for throwaway experiments, never merged.
- Never commit directly to `main` or `develop`.
- Atomic commits: one logical change each, tests green at every commit.
- Conventional Commits: `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`.
- Pull requests reference their issue with `Closes #<n>`.
- Developers commit, push and open pull requests against `develop` on their own branches. They never merge.
- The CTO reviews every pull request before merging into `develop`, and owns every release to `main`.

## Team

Roles are defined in `.claude/agents/`: `cto`, `product-manager`, `senior-mobile-dev`, `senior-backend-dev`. The owner is the CTO's only stakeholder and decides on money, accounts and product scope.

### Developer workflow

1. Read the issue with `gh issue view <n> --repo Itoukee/Bro-ps`, and keep to its scope.
2. Create `feature/<issue>-<slug>` from `develop`, in your own worktree.
3. Work in baby steps with TDD, committing atomically.
4. Run lint, typecheck and tests on the final code, and read the real result.
5. Open a pull request against `develop`. Use `Closes #<n>` only when the done criteria are met, and `Refs #<n>` otherwise, saying what remains.
6. Report to the CTO: branch, pull request, commands run with their actual results, what could not be verified, and the decisions needed.

Limits:

- No system-wide installs, new accounts, paid services or commands needing the owner's login.
- Never claim anything worked on a phone unless it was observed on one.
- In a worktree, the guard refuses `rtk git`: use `/usr/bin/git`.
- Run the project's own binaries, such as `./node_modules/.bin/tsc`, because `rtk tsc` can pick up a global TypeScript and report false errors.
- The scratchpad is shared between agents: use file names that include your issue number.

## Security: OWASP

Follow the OWASP Mobile Top 10 and API Security Top 10. Live location is the most sensitive data in this app, so treat a leak as the worst possible bug.

Access control:

- Row Level Security on every table, denying by default. A new table without policies does not ship.
- Every group, ride and position access checks membership on the server. The client is never trusted.
- Realtime uses private channels authorized by group membership.
- Server-enforced rules stay on the server, such as the single friend notification per ride.

Secrets:

- Only the public anon key goes in the app. The `service_role` key lives in Edge Function secrets only.
- No secret in the repository, including the APK signing keystore. Run secret scanning in CI.
- Session tokens go in `expo-secure-store`, never in AsyncStorage.

Input:

- Validate every Edge Function input against a schema, and check the caller.
- Invite codes are generated with a secure random source, expire, can be revoked, and joining is rate limited.
- Deep links and intents are untrusted. Nothing external may start a ride or share location without a deliberate action by the rider. Keep Android components not exported unless required.

Privacy:

- Never log positions, tokens, emails or speeds.
- Raw tracks are deleted after the retention period.
- Deleting an account deletes the rider's data.
- Request only the Android permissions that are needed, and explain each before asking.

Transport and dependencies:

- HTTPS and WSS only, no cleartext traffic.
- Keep dependencies minimal and audited in CI. Review any new dependency before adding it.
