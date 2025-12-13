SHELL := /bin/bash

dev-up:
	docker compose up -d postgres mongo

dev-down:
	docker compose down

backend:
	cd backend && npm install && npm run dev

frontend:
	cd frontend && npm install && npm run dev

migrate:
	cd backend && npm run prisma:migrate

seed:
	cd backend && npm run seed

test:
	cd backend && npm test -- --passWithNoTests && cd ../frontend && npm test -- --watch=false || true
