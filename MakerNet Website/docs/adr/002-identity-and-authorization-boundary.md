# ADR 002 Identity and authorization boundary

- **Status:** Implemented locally; college provider integration pending
- **Date:** 2026-09-24
- **Subsystem:** 0 Repository and Delivery Foundation

## Context

College identity data and content visibility affect every later subsystem. The product architecture requires access checks before search ranking, notifications, analytics, and media delivery. Provider-specific identity claims cannot become application permissions directly.

## Decision

Create an identity-provider adapter interface in Subsystem 2 with local development and production implementations. Key accounts by issuer plus provider subject. Normalize an allowlisted identity profile, then let a central policy service decide access from account state, audience type and organization scope, accepted attribution audience, content state, and resource relationships. Routes and UI call module services that enforce this policy; hidden controls do not count as authorization. ADR 003 records the user-directed temporary passwordless-email production adapter while college OIDC or SAML is deferred.

Foundation configuration validates the URLs and credentials needed to start, without exposing them through health or logs. The implementation will not invent college SSO claims or privilege mappings before integration details are available.

## Consequences

Subsystem 2 must own session lifecycle, account states, scoped roles, audit records, and an authorization matrix. Future modules provide resource facts to the central policy service and may narrow, never widen, effective access.

## Verification

Subsystem 2 will test anonymous, member, organization member, officer, moderator, staff reviewer, administrator, suspended, and departed cases at service and browser boundaries.
