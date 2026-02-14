# Philosophy Club

A members-only web application for a gentlemen's social club centered around fine spirits and refined conversation. Features Google OAuth authentication, a whisky bottle inventory, and a live countdown to the next Thursday gathering.

## Tech Stack

**Backend** — Python / Flask / MongoDB

**Frontend** — Vue 3 (CDN) / Pico CSS / Google Sign-In

## Project Structure

```
be/            Flask API (port 8080)
  app.py       Application and routes
docs/          Static frontend (no build step, served via GitHub Pages)
  index.html   Entry point
  app.js       Vue application
  style.css    Custom styling
```

## Features

- Google OAuth 2.0 sign-in with role-based access (admin/user)
- First registered user is automatically granted admin role
- Whisky bottle inventory pulled from MongoDB
- Live countdown timer to next Thursday 18:00 gathering

## Getting Started

### Prerequisites

- Python 3
- MongoDB (local or remote)
- A Google OAuth 2.0 Client ID

### Backend

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

### Frontend

Serve the `docs/` directory with any static file server, for example:

```bash
cd docs
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## API Endpoints

| Method | Path      | Description          |
|--------|-----------|----------------------|
| POST   | /login    | Google token login   |
| GET    | /users    | List all members     |
| GET    | /bottles  | List whisky inventory|
| GET    | /health   | Health check         |

## License

GPLv3 — see [LICENSE](LICENSE) for details.
