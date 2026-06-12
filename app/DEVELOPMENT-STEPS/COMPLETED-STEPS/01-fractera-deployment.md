# 01 — Fractera Deployment

> Development step · importance: critical · completed 2026-06-12

The deployment that brought this workspace online. A bare Ubuntu VPS was turned into a full
self-hosted AI workspace: the services came up under PM2 (the web app, authentication, the admin
panel / bridges, the coding-agent bridges, the data service, Memory/LightRAG, and Brain/Hermes), the
database schema applied itself on first start, and the Admin workspace went live — IP-first, on plain
HTTP at `http://<your-IP>:3002`.

This is the seed entry of the work log. Every later step builds on this running system. It is here so
that an agent reading `DEVELOPMENT-STEPS/COMPLETED-STEPS/` at session start (per `CLAUDE.md` §4) sees a
real, completed milestone rather than an empty folder.

## To-do
- Provision the VPS and install the workspace (done by the external setup service)
- Bring all services online under PM2 and verify the Admin workspace answers on :3002
- Register the first admin account on the fresh server

<!-- fractera:step
{"number":1,"name":"Fractera Deployment","importance":"critical","status":"completed","completedAt":"2026-06-12","description":"The deployment that brought this workspace online. A bare Ubuntu VPS was turned into a full self-hosted AI workspace: the services came up under PM2 (web app, authentication, admin/bridges, coding-agent bridges, data, Memory/LightRAG, Brain/Hermes), the database schema applied itself on first start, and the Admin workspace went live IP-first on plain HTTP at http://<your-IP>:3002. Seed entry of the work log.","tasks":[{"id":"11111111-1111-4111-8111-111111111111","body":"Provision the VPS and install the workspace (done by the external setup service)"},{"id":"22222222-2222-4222-8222-222222222222","body":"Bring all services online under PM2 and verify the Admin workspace answers on :3002"},{"id":"33333333-3333-4333-8333-333333333333","body":"Register the first admin account on the fresh server"}]}
-->
