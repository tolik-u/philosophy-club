# Philosophy Club

A members-only web application for a gentlemen's social club centered around fine spirits and refined conversation. Features Google OAuth authentication, a whisky bottle inventory, and a live countdown to the next Thursday gathering.

## Tech Stack

**Backend** — Python / Flask / MongoDB, deployed on AWS Lambda via Terraform

**Frontend** — Vue 3 (CDN) / Pico CSS / Google Sign-In, hosted on GitHub Pages

## Project Structure

```
be/            Flask API (port 8080)
  app.py       Application and routes
docs/          Static frontend (no build step, served via GitHub Pages)
  index.html   Entry point
  app.js       Vue application
  admin.html   Admin panel page
  admin.js     Admin panel logic
  style.css    Custom styling
infra/         Terraform configuration (Lambda, API Gateway, IAM)
run-local.sh   Local dev script (Linux/macOS)
run-local.bat  Local dev script (Windows)
```

## Features

- Google OAuth 2.0 sign-in with role-based access (admin/user)
- First registered user is automatically granted admin role
- Whisky bottle inventory pulled from MongoDB
- Live countdown timer to next Thursday 18:00 gathering
- Admin panel with bottle CRUD management
- Whisky catalog search (Atlas Search) to pre-fill new bottles
- User management with promote/demote controls

## Getting Started

### Prerequisites

- Python 3
- MongoDB (local or remote)
- A Google OAuth 2.0 Client ID

### Quick Start

Run both backend and frontend with one command:

```bash
# Linux / macOS
./run-local.sh

# Windows
run-local.bat
```

This starts the backend on `http://localhost:8080` and serves the frontend on `http://localhost:8000`. The frontend auto-detects localhost and points API calls to the local backend.

### Manual Setup

**Backend:**

```bash
cd be
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `be/`:

```
MONGODB_URL=mongodb://127.0.0.1:27017
```

Run the server:

```bash
python app.py
```

The API will be available at `http://127.0.0.1:8080`.

**Frontend:**

Serve the `docs/` directory with any static file server, for example:

```bash
cd docs
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## API Endpoints

| Method | Path                  | Auth  | Description                    |
|--------|-----------------------|-------|--------------------------------|
| POST   | /login                |       | Google token login             |
| GET    | /users                | admin | List all members               |
| PUT    | /users/:email/role    | admin | Promote/demote user            |
| GET    | /bottles              | user  | List whisky inventory          |
| POST   | /bottles              | admin | Add a bottle                   |
| PUT    | /bottles/:id          | admin | Update a bottle                |
| DELETE | /bottles/:id          | admin | Delete a bottle                |
| GET    | /whiskies/search?q=   | admin | Search whisky catalog          |
| GET    | /health               |       | Health check                   |

## Deployment

The backend deploys automatically to AWS Lambda when changes are pushed to `main` (paths: `be/**`, `infra/**`). The GitHub Actions workflow installs dependencies, packages the Lambda, and runs `terraform apply`.

**Infrastructure** (managed by Terraform):
- AWS Lambda (Python 3.11)
- API Gateway HTTP API with CORS
- CloudWatch log group (7-day retention)
- S3 bucket for Terraform state (`philosophy-club-tfstate`)

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — IAM credentials
- `AWS_REGION` — e.g. `eu-west-1`
- `MONGODB_URL` — MongoDB Atlas connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials

## License

GPLv3 — see [LICENSE](LICENSE) for details.
