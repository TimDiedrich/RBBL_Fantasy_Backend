# Fantasy Manager Backend

A Node.js and Express RESTful API powering a fantasy sports management platform. Handles user authentication, league configurations, team management, rosters, player stats, standings, and real-game schedules.

---

## Features

- **User Management**: Authentication and profile handling.
- **Fantasy Leagues & Settings**: Creation and administration of fantasy leagues.
- **Roster & Team Management**: Fantasy team creation, roster adjustments, and player drops/adds.
- **Player Stats & Real Games**: Live tracking of real-world games and player performance.
- **Standings**: Real-time league leaderboards and record tracking.
- **API Versioning**: All production endpoints are clean, structured, and version-controlled under `/api/v1`.

---

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (`pg` connection pool)
- **Security**: [Helmet](https://helmetjs.github.io/) for HTTP security headers
- **Environment Management**: `dotenv`

---

## 📋 Prerequisites

Ensure you have the following installed locally:

- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **PostgreSQL**: `v14.x` or higher

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone [https://github.com/TimDiedrich/RBBL_Fantasy_Backend.git](https://github.com/TimDiedrich/RBBL_Fantasy_Backend.git)
cd RBBL_Fantasy_Backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a local `.env` file by copying the template
```bash
cp .env.example .env
```

Open `.env` and fill in your local connection details:
```Code snippet
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/fantasydb

# Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here
```

### 4. Database Setup

1. Create a PostgreSQL database named `fantasydb` (or the name specified in your `.env`).
2. Run your schema and seed scripts to set up the database structure and test data:

```bash
# Example if executing raw SQL scripts with psql
psql -U postgres -d fantasydb -f path/to/schema.sql
psql -U postgres -d fantasydb -f path/to/seed.sql
```

- [Backend System Architecture & Design](./ARCHITECTURE.md)
- [Contribution Guidelines](./CONTRIBUTING.md)
