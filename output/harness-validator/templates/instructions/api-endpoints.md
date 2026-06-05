---
name: API Endpoints
type: instruction
trigger: api-project
tags: [backend, api]
---

# API Endpoint Conventions

- Use RESTful resource naming (`/users`, `/users/:id`).
- Return consistent response envelopes (`{ data, error, meta }`).
- Validate input with a schema library (Zod, Joi, class-validator).
- Document endpoints with OpenAPI / Swagger.
- Return appropriate HTTP status codes.
