# Backend System Architecture & Design

This document describes the architectural layout, technology stack, data flows, and design decisions for the backend API service.

---

## System Overview

The backend acts as a stateless RESTful API service providing business logic, authentication, data validation, and persistence for fantasy sport management.

```mermaid
graph TD
    Client[Mobile / Web Client] -->|HTTPS / REST API| API[Node.js + Express API Gateway]
    
    subgraph Core Server Process
        API --> AuthMiddleware[Auth & Perms Middleware]
        AuthMiddleware --> RouteHandlers[Route Handlers / Controllers]
        RouteHandlers --> Validation[Business Logic & Rule Checks]
        Validation --> DBClient[pg Pool Client / Transactions]
    end

    DBClient -->|TCP / Port 5432| Postgres[(PostgreSQL Database)]
```

## Data Model & Entity Relationships

```mermaid
erDiagram
    USERS ||--o{ FANTASY_LEAGUES : "commissioner of"
    USERS ||--o{ LEAGUE_MEMBERS : "participates in"
    USERS ||--o{ FANTASY_TEAMS : "owns"

    TEAMS ||--o{ PLAYERS : "contracts"
    TEAMS ||--o{ REAL_GAMES : "home team"
    TEAMS ||--o{ REAL_GAMES : "away team"
    TEAMS ||--o{ FANTASY_PLAYERS : "plays for (real)"

    PLAYERS ||--o{ PLAYER_GAME_STATS : "records"
    PLAYERS ||--o{ FANTASY_PLAYERS : "base for"

    REAL_GAMES ||--o{ PLAYER_GAME_STATS : "contains"

    GAME_WEEKS ||--o{ WEEKLY_LINEUPS : "schedules"
    GAME_WEEKS ||--o{ MATCHUPS : "occurs in"

    FANTASY_LEAGUES ||--o| LEAGUE_SETTINGS : "configured by"
    FANTASY_LEAGUES ||--o{ LEAGUE_MEMBERS : "has"
    FANTASY_LEAGUES ||--o{ FANTASY_PLAYERS : "draft pool"
    FANTASY_LEAGUES ||--o{ FANTASY_TEAMS : "contains"
    FANTASY_LEAGUES ||--o{ MATCHUPS : "hosts"
    FANTASY_LEAGUES ||--o{ DRAFT_PICKS : "manages"

    FANTASY_PLAYERS ||--o{ ROSTERS : "assigned to"
    FANTASY_PLAYERS ||--o{ WEEKLY_LINEUPS : "selected in"
    FANTASY_PLAYERS ||--o| DRAFT_PICKS : "drafted as"

    FANTASY_TEAMS ||--o{ ROSTERS : "maintains"
    FANTASY_TEAMS ||--o{ WEEKLY_LINEUPS : "sets"
    FANTASY_TEAMS ||--o{ MATCHUPS : "home competitor"
    FANTASY_TEAMS ||--o{ MATCHUPS : "away competitor"
    FANTASY_TEAMS ||--o{ DRAFT_PICKS : "owns pick"

    TEAMS {
        int id PK
        varchar team_id UK
        varchar name UK
        varchar logo_url
        varchar city
        timestamptz created_at
    }

    USERS {
        int id PK
        varchar username UK
        varchar email UK
        varchar pw_hash
        timestamptz created_at
    }

    PLAYERS {
        int id PK
        int shirt_number
        varchar player_name
        varchar image_url
        date dob
        int age
        varchar nationality
        varchar position
        numeric sport_class
        varchar team_id FK
        boolean is_active
        timestamptz created_at
    }

    REAL_GAMES {
        int id PK
        varchar home_team_id FK
        varchar away_team_id FK
        timestamptz game_date
        int home_score
        int away_score
    }

    GAME_WEEKS {
        int id PK
        int week_number
        timestamptz start_date
        timestamptz end_date
        boolean is_bye_week
    }

    PLAYER_GAME_STATS {
        int id PK
        int player_id FK
        int game_id FK
        interval minutes_played
        int two_points_made
        int two_points_attempted
        int three_points_made
        int three_points_attempted
        int ft_made
        int ft_attempted
        int def_rebounds
        int off_rebounds
        int assists
        int personal_fouls
        int steals
        int blocks
        int turnovers
        int points
    }

    FANTASY_LEAGUES {
        int id PK
        varchar league_name
        int commissioner_id FK
        varchar invite_code UK
        enum draft_status
        timestamptz created_at
    }

    LEAGUE_MEMBERS {
        int id PK
        int league_id FK
        int user_id FK
        enum role
        timestamptz joined_at
    }

    LEAGUE_SETTINGS {
        int league_id PK
        numeric max_lineup_points
        int max_roster_size
        numeric points_per_real_point
        numeric points_per_rebound
        numeric points_per_assist
        numeric points_per_steal
        numeric points_per_block
        numeric points_per_turnover
        numeric double_double_bonus
        numeric triple_double_bonus
        numeric three_point_made
    }

    FANTASY_PLAYERS {
        int id PK
        int league_id FK
        int original_player_id FK
        int shirt_number
        varchar player_name
        varchar image_url
        date dob
        varchar nationality
        varchar position
        numeric sport_class
        enum gender
        numeric bonus
        varchar team_id FK
        boolean is_active
        timestamptz created_at
    }

    FANTASY_TEAMS {
        int id PK
        int league_id FK
        int user_id FK
        varchar team_name
        timestamptz created_at
    }

    ROSTERS {
        int id PK
        int fantasy_team_id FK
        int player_id FK
        boolean is_starter
    }

    WEEKLY_LINEUPS {
        int id PK
        int fantasy_team_id FK
        int player_id FK
        int game_week_id FK
        boolean is_starter
    }

    MATCHUPS {
        int id PK
        int league_id FK
        int game_week_id FK
        int home_team_id FK
        int away_team_id FK
        numeric home_score
        numeric away_score
    }

    DRAFT_PICKS {
        int id PK
        int league_id FK
        int round
        int pick_number
        int fantasy_team_id FK
        int fantasy_player_id FK
        timestamptz picked_at
    }
```

# TODO
## REST API Endpoint Specifications

All API endpoints are prefixed with `/api`. Authentication is handled via Bearer Tokens in the `Authorization` header.

### 1. Authentication & Users

| Endpoint | Method | Auth | Description | Payload / Query Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/auth/register` | `POST` | Public | Register a new user account | **Body:** `{ username, email, password }` |
| `/auth/login` | `POST` | Public | Authenticate user and issue JWT | **Body:** `{ email, password }` |
| `/users/me` | `GET` | Bearer | Get current user's profile | None |

### 2. Leagues & Membership

| Endpoint | Method | Auth | Description | Payload / Query Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/leagues` | `GET` | Bearer | List leagues joined or created by user | `?role=commissioner` |
| `/leagues` | `POST` | Bearer | Create a new fantasy league | **Body:** `{ league_name, max_roster_size, max_lineup_points }` |
| `/leagues/join` | `POST` | Bearer | Join a league via invite code | **Body:** `{ invite_code }` |
| `/leagues/:id/members` | `GET` | Bearer | Fetch members of a specific league | None |

### 3. Fantasy Teams & Rosters

| Endpoint | Method | Auth | Description | Payload / Query Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/leagues/:id/teams` | `POST` | Bearer | Claim/create a team in a league | **Body:** `{ team_name }` |
| `/teams/:team_id/roster` | `GET` | Bearer | View full player roster for a team | None |
| `/teams/:team_id/roster` | `POST` | Bearer | Add player to team roster (Free Agent) | **Body:** `{ fantasy_player_id }` |
| `/teams/:team_id/roster/:player_id` | `DELETE` | Bearer | Drop player from team roster | None |

### 4. Lineups & Matchups

| Endpoint | Method | Auth | Description | Payload / Query Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/teams/:team_id/lineup` | `GET` | Bearer | Retrieve team lineup for a game week | `?game_week_id=1` |
| `/teams/:team_id/lineup` | `PUT` | Bearer | Submit/update weekly starting lineup | **Body:** `{ game_week_id, player_ids: [] }` |
| `/leagues/:id/matchups` | `GET` | Bearer | View head-to-head matchups for a week | `?game_week_id=1` |

### 5. Draft Management

| Endpoint | Method | Auth | Description | Payload / Query Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/leagues/:id/draft` | `GET` | Bearer | Fetch draft status and pick order | None |
| `/leagues/:id/draft/pick` | `POST` | Bearer | Submit a draft pick during a live draft | **Body:** `{ fantasy_player_id, round, pick_number }` |
