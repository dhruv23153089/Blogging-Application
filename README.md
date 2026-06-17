# Inkline Blogging Platform

Inkline is a full-stack blogging platform built with React, Express, MongoDB, and JWT authentication. It supports protected blog CRUD, comments, search, pagination, drafts, likes, bookmarks, and a responsive olive/yellow/white editorial UI.

## Features

- User registration and login with JWT.
- Protected create, edit, delete, like, bookmark, and comment actions.
- Blog feed with search, tag filtering, and pagination.
- Landscape author editor on large screens and stacked responsive editor on smaller screens.
- Comments with owner/post-author moderation.
- Draft and published post states.
- Reading-time calculation, cover image URL support, and author stats.
- Vite dev proxy from `http://localhost:5173/api` to `http://localhost:5000/api`.
- Backend best practices: modular routes/controllers/models, Zod validation, Helmet, CORS, rate limiting, global error handling, environment config, and graceful shutdown messaging.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express, Mongoose
- Database: MongoDB local or MongoDB Atlas
- Auth: JWT + bcrypt
- Validation: Zod

## Project Structure

```text
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    utils/
    validators/
frontend/
  public/
  src/
    main.jsx
    styles.css
```

## Setup

Install dependencies:

```bash
npm run install:all
```

Create your backend environment file:

```bash
copy backend\.env.example backend\.env
```

Example local MongoDB config:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/blogging_platform
MONGO_DB_NAME=blogging_platform
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

Example Atlas URI format:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/blogging_platform?retryWrites=true&w=majority&appName=Cluster0
```

Do not commit real passwords or production secrets.

## Running

Start the backend in one terminal:

```bash
npm run dev:backend
```

Start the frontend in another terminal:

```bash
npm run dev:frontend
```

Open:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:5000/api/health
```

Expected backend startup:

```text
MongoDB connected
API running on http://localhost:5000
```

## Important Validation Rules

Register:

- Name: minimum 2 characters
- Email: valid email
- Password: minimum 6 characters

Create/update post:

- Title: minimum 3 characters
- Short excerpt: minimum 10 characters
- Article content: minimum 20 characters
- Cover image URL: must be a valid URL or blank
- Tags: maximum 8 tags, 30 characters each

If you see `Validation failed`, one of these rules was not satisfied. The UI now shows a clearer message before publishing when title, excerpt, or content is too short.

## API Overview

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Posts:

- `GET /api/posts?page=1&limit=6&search=&tag=`
- `POST /api/posts`
- `GET /api/posts/:slug`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`
- `POST /api/posts/:id/bookmark`

Comments:

- `POST /api/posts/:postId/comments`
- `DELETE /api/posts/comments/:id`

Protected routes require:

```text
Authorization: Bearer <token>
```

## Verification

Frontend build:

```bash
npm run build --prefix frontend
```

Backend syntax checks:

```bash
node --check backend\src\server.js
node --check backend\src\app.js
node --check backend\src\controllers\authController.js
node --check backend\src\controllers\postController.js
```

## Troubleshooting

### `Failed to fetch`

The frontend cannot reach the backend. Make sure both servers are running:

```bash
npm run dev:backend
npm run dev:frontend
```

The frontend uses Vite proxy, so browser API calls go through:

```text
http://localhost:5173/api
```

### `Validation failed`

The post or auth input does not match the validation rules above. For publishing, make sure the title, excerpt, and article body are long enough.

### `EADDRINUSE: address already in use :::5000`

Port `5000` is already occupied, usually by another backend instance. Stop the old terminal/process, or change `PORT` in `backend/.env`.

### MongoDB Atlas cannot connect

If Atlas says it cannot connect to any servers:

- Check Atlas Network Access.
- Add your current IP address.
- For development only, `0.0.0.0/0` allows all IPs.
- Some Wi-Fi networks block MongoDB port `27017`; try a mobile hotspot, VPN, or local MongoDB.

### UI does not update after changes

Hard refresh the browser:

```text
Ctrl + Shift + R
```

Restart the Vite dev server if configuration files changed.
