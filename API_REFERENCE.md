# API Reference

This document describes the API currently implemented by this repository. HTTP routes are mounted at `/api/v1`. Successful domain responses use a `data` envelope; game-week metadata is returned separately in `meta`. The health endpoint keeps its top-level operational response shape.

## Base URL and authentication

For local development, the base URL is `http://localhost:3000/api/v1`.

Authenticated HTTP endpoints require a JWT in the `Authorization` header:

```http
Authorization: Bearer <token>
```

Registration and login return a token that expires after seven days. The authenticated request middleware reads the token's `userId` claim. Endpoints marked **Public** do not require a token.

## HTTP endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public, rate-limited | Create a user and issue a token |
| `POST` | `/auth/login` | Public, rate-limited | Authenticate by username and issue a token |
| `GET` | `/users/me` | Bearer | Return the authenticated user's profile |
| `GET` | `/fantasy-leagues/{leagueId}/players` | Bearer | List active fantasy players; use `?undrafted=true` to filter |
| `GET` | `/fantasy-leagues/memberships` | Bearer | List the caller's league memberships |
| `POST` | `/fantasy-leagues/memberships` | Bearer | Join a league using an invite code |
| `GET` | `/fantasy-leagues/{leagueId}/members` | Bearer, league member | List members of a league |
| `POST` | `/fantasy-leagues` | Bearer | Create a league |
| `GET` | `/fantasy-leagues` | Bearer | List leagues commissioned by the caller |
| `GET` | `/fantasy-leagues/{leagueId}` | Bearer | Get league details and settings |
| `GET` | `/fantasy-leagues/{leagueId}` | Bearer, league member | Get league details and settings |
| `PATCH` | `/fantasy-leagues/{leagueId}` | Bearer, commissioner | Update league fields and optionally schedule a draft |
| `POST` | `/fantasy-teams` | Bearer, league member | Create a fantasy team |
| `GET` | `/fantasy-teams` | Bearer | List the caller's fantasy teams |
| `GET` | `/fantasy-teams/{teamId}/roster` | Bearer, league member | Get a team's roster |
| `POST` | `/fantasy-teams/{teamId}/roster` | Bearer, team owner | Add a player to a roster |
| `PUT` | `/fantasy-teams/{teamId}/roster` | Bearer, team owner | Replace starter flags for submitted roster entries |
| `GET` | `/fantasy-leagues/{leagueId}/standings` | Bearer | Get league standings |
| `GET` | `/real-games` | Public | List all real games; use `?week={number}` to filter |
| `GET` | `/fantasy-leagues/{leagueId}/settings` | Bearer | Get league scoring and roster settings |
| `GET` | `/fantasy-leagues/{leagueId}/draft-order` | Bearer, league member | Get a league's draft order |
| `GET` | `/health` | Public | Check service and database health |

### Users

`POST /auth/register`

```json
{
  "username": "player_1",
  "email": "player@example.com",
  "password": "a-strong-password"
}
```

Usernames must be 3-30 letters, numbers, or underscores. Email is normalized to lowercase. Passwords must be at least eight characters and pass the configured strength check. Success is `201`:

```json
{
  "data": {
    "message": "User registered successfully!",
    "user": {
      "id": 1,
      "username": "player_1",
      "email": "player@example.com",
      "created_at": "timestamp"
    },
    "token": "<jwt>"
  }
}
```

`POST /auth/login` accepts `username` and `password` (not email). Success is `200` with `{ "data": { "token": "<jwt>", "user": { "id", "username", "email" } } }`. Invalid credentials return `401`.

`GET /users/me` returns `{ "data": { "id", "username", "email", "created_at" } }`.

Registration and login are limited per IP over 15 minutes. In production, the limits are five registrations and ten login attempts; in other environments, each limit is 100.

### Leagues and membership

`POST /fantasy-leagues` accepts:

```json
{ "name": "RBBL_League", "numOfTeams": 8 }
```

`name` must be 3-30 letters, numbers, or underscores; `numOfTeams` must parse as an integer. Success is `201` with the created league row inside `data`, including `id`, `league_name`, `commissioner_id`, `max_number_teams`, `invite_code`, `draft_status`, and `created_at`. Creating a league also creates its settings and commissioner membership and copies active players into its fantasy-player pool.

`GET /fantasy-leagues` returns `{ "data": [...] }`. This query returns leagues where the caller is commissioner; use `GET /fantasy-leagues/memberships` for memberships.

`GET /fantasy-leagues/{leagueId}` returns `{ "data": { ... } }` with league metadata, `commissioner_username`, and a nested `settings` object. The caller must be a member of the league.

`PATCH /fantasy-leagues/{leagueId}` accepts any subset of `league_name`, `draft_status`, `draft_date`, and `needs_new_invite_code`. Only the commissioner may update the league. Setting `draft_status` to `SCHEDULED` together with `draft_date` generates a randomized draft order and schedules the draft room. Success returns the updated league object inside `data`. Supported `draft_status` values are `PREDRAFT`, `SCHEDULED`, `DRAFTING`, `POSTDRAFT`, and `COMPLETED`.

`POST /fantasy-leagues/memberships` accepts `{ "invite_code": "AB12CD34" }`. The code is trimmed and uppercased. Success is `200` with `{ "data": { "message": "...", "league": {...} } }`; an unknown code returns `404`, and an existing membership returns `409`.

`GET /fantasy-leagues/memberships` returns `{ "data": [...] }`. Each membership row contains `id`, `league_id`, `user_id`, `role`, `joined_at`, `league_name`, and `fantasy_team_name`.

`GET /fantasy-leagues/{leagueId}/members` returns `{ "data": [...] }` with the same row shape for all members of that league. The caller must be a member.

### Fantasy teams and rosters

`POST /fantasy-teams` accepts `{ "league_id": 1, "team_name": "My_Team" }` and returns `{ "data": { ... } }` with the created team row (`201`). Team names must be 3-30 letters, numbers, or underscores. The caller must be a league member; the league's configured team capacity is enforced, and the database allows one team per user per league.

`GET /fantasy-teams` returns `{ "data": [...] }` for teams owned by the caller.

`GET /fantasy-teams/{teamId}/roster` returns `{ "data": [...] }`. Each row includes player details, `real_team_id`, `is_starter`, and `roster_id`. Any member of the team's league may view the roster.

`POST /fantasy-teams/{teamId}/roster` accepts `{ "player_id": 10 }`. The caller must own the team, and a player already rostered by a team in the same league cannot be added again. Success is `201` with `{ "data": { "message": "...", "roster": { "id", "fantasy_team_id", "player_id", "is_starter" } } }`.

`GET /fantasy-leagues/{leagueId}/players?undrafted=true` returns an array of active, undrafted player rows. The caller must be a member of the league.

`PUT /fantasy-teams/{teamId}/roster` accepts a non-empty JSON array. Each entry must include `roster_id`, `player_id`, and `is_starter` boolean. Success returns `{ "data": [...] }` with the updated roster:

```json
[
  { "roster_id": 21, "player_id": 10, "is_starter": true }
]
```

All entries are applied to the team identified by `{teamId}`. The caller must own that team. The submitted starters may not exceed five players, and their combined `sport_class` may not exceed `14.5`.

### Players, standings, settings, and draft order

`GET /fantasy-leagues/{leagueId}/players` returns `{ "data": [...] }` with active fantasy-player rows. Add `?undrafted=true` to limit the result to undrafted players. The caller must be a member of the league.

`GET /fantasy-leagues/{leagueId}/standings` returns `{ "data": [...] }`. Each row contains `team_id`, `team_name`, `wins`, `losses`, `total_points`, and `rank`. The caller must be a member of the league.

`GET /fantasy-leagues/{leagueId}/settings` returns `{ "data": { ... } }` with `league_id`, `max_lineup_points`, `max_roster_size`, scoring values, and bonuses. The caller must be a member of the league.

`GET /fantasy-leagues/{leagueId}/draft-order` returns `{ "data": [...] }` with rows shaped like `{ "league_id", "fantasy_team_id", "team_name", "draft_position" }`. The caller must be a league member.

### Real games and health

`GET /real-games` returns `{ "data": [...], "meta": { "weekNumber": 0 } }`. Each match includes `id`, home/away team names, scores, and `status` (`SCHEDULED`, `LIVE`, or `FINISHED`).

`GET /real-games?week={number}` returns `{ "data": [...], "meta": { "weekNumber": <week> } }`. Match rows also include home/away logo URLs and `game_date`. A non-numeric week returns `400`.

`GET /health` returns service status, timestamp, uptime, execution time, system memory and CPU load, and database health. It returns `200` when the database check succeeds and `503` when it fails.

## Errors

All HTTP errors use the same structure. The HTTP status code is authoritative; `error.code` is a stable machine-readable value. `details` is optional and is intended for safe, field-specific validation information.

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "The request is invalid.",
    "details": {
      "field": "email"
    }
  }
}
```

Common codes are `BAD_REQUEST` (`400`), `UNAUTHENTICATED` (`401`), `FORBIDDEN` (`403`), `NOT_FOUND` (`404`), `CONFLICT` (`409`), `TOO_MANY_REQUESTS` (`429`), and `INTERNAL_ERROR` (`500`). Invalid or missing Bearer tokens return `401`. Rate limits return `429`. Unexpected server and database errors return a generic message; internal details are logged, not sent to clients. Health-check responses retain their operational top-level shape.

## Draft Socket.IO events

Socket.IO uses the same server origin and the default namespace. A JWT is required at connection time, either as `auth.token` or in the `Authorization` handshake header. The Socket.IO handshake accepts a token with or without the `Bearer ` prefix.

| Direction | Event | Data / behavior |
| --- | --- | --- |
| Client to server | `draft:join_room` | `{ "leagueId": 1 }`; joins `draft_{leagueId}` and receives `draft:room_state` or `draft:error` |
| Client to server | `draft:leave_room` | `{ "leagueId": 1 }`; leaves the league room |
| Client to server | `draft:make_pick` | `{ "leagueId": 1, "fantasyPlayerId": 10 }`; server responds with `draft:pick_success` or `draft:error` |
| Client to server | `draft:start` | `{ "leagueId": 1 }`; starts the draft and broadcasts `draft:started` or returns `draft:error` to the requester |
| Server to room | `draft:pick_made` | Pick details and, unless complete, next-turn details |
| Server to room | `draft:completed` | `{ "message": "The draft has ended!" }` |

Only league members may join a draft room, and only the commissioner may start the draft. The room-state payload contains draft status, scheduled time, current turn metadata, and available players. Pick deadlines and event payload details are currently defined in `src/services/draftService.js` and may evolve with that implementation.

## Contract caveats

- Successful domain HTTP responses use `data`; game responses also use `meta`. Health and error responses are intentionally not wrapped. Socket.IO events retain their event-specific payloads.
- Authentication is not equivalent to authorization. League-scoped reads require membership; league updates and draft starts require the commissioner; roster writes require the team owner, while roster reads are available to league members.
- Draft sockets use the JWT `userId` claim for manual-pick ownership checks.
- Response envelopes are not fully consistent: some endpoints return arrays or rows directly, while others wrap results in an object. Examples and shapes above reflect the current handlers.