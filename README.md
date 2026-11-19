# RoadSide+ (Node + Express + React + PostgreSQL)

Full-stack roadside assistance prototype: JWT + bcrypt auth, Haversine matching,
Socket.IO live tracking, Leaflet map, AI chat (mock fallback), payments (demo mode), admin charts.

See RoadSidePlus_Setup_Commands.pdf for the exact Command Prompt steps.

Quick start (two Command Prompt windows):

    cd server
    npm install
    (edit DATABASE_URL password in .env)
    npm run setup
    npm run dev

    cd client
    npm install
    npm run dev          (open http://localhost:5173)

Demo accounts (one-click buttons): demo_user / demo_mechanic / demo_admin @roadside.test, password demo123
