# NZSL-Cultural-Foundation-Web

## Run (Python / Flask)

1. Install dependencies:

```bash
pip3 install -r requirements.txt
```

2. Set environment variables (example):

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DBNAME"
export JWT_SECRET="change-me"
```

3. Start the server:

```bash
python3 app.py
```

Server will:

- Serve frontend from `public/`
- Serve uploads from `/uploads/`
- Expose API under `/api/*`

Health check:

- `GET http://localhost:3000/api/health`
