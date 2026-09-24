CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE makernet.person (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL,
  provider_subject text NOT NULL,
  institution_email text NOT NULL,
  display_name text NOT NULL,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'suspended', 'departed', 'deleted')),
  eligibility_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer, provider_subject)
);

CREATE TABLE makernet.organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('club', 'lab', 'department')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE makernet.organization_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  organization_id uuid NOT NULL REFERENCES makernet.organization(id),
  role text NOT NULL CHECK (role IN ('member', 'officer')),
  status text NOT NULL CHECK (status IN ('active', 'ended')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CHECK ((status = 'active' AND ended_at IS NULL) OR (status = 'ended' AND ended_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_active_membership ON makernet.organization_membership(person_id, organization_id) WHERE status = 'active';

CREATE TABLE makernet.role_grant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  role text NOT NULL CHECK (role IN ('moderator', 'staff_reviewer', 'administrator')),
  scope_type text NOT NULL CHECK (scope_type IN ('site', 'skill')),
  scope_id uuid,
  granted_by uuid REFERENCES makernet.person(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK ((scope_type = 'site' AND scope_id IS NULL AND role <> 'staff_reviewer') OR
         (scope_type = 'skill' AND scope_id IS NOT NULL AND role = 'staff_reviewer'))
);
CREATE UNIQUE INDEX one_active_role_grant ON makernet.role_grant(person_id, role, scope_type, scope_id) NULLS NOT DISTINCT WHERE revoked_at IS NULL;

CREATE TABLE makernet.session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  token_hash char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at <= absolute_expires_at)
);
CREATE INDEX session_person_active ON makernet.session(person_id) WHERE revoked_at IS NULL;

CREATE TABLE makernet.auth_flow (
  state_hash char(64) PRIMARY KEY,
  code_verifier text NOT NULL,
  nonce text NOT NULL,
  return_to text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE TABLE makernet.audit_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES makernet.person(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  scope text NOT NULL,
  reason text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_event_target ON makernet.audit_event(target_type, target_id, occurred_at DESC);
CREATE OR REPLACE FUNCTION makernet.reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append only';
END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON makernet.audit_event
  FOR EACH ROW EXECUTE FUNCTION makernet.reject_audit_mutation();

CREATE TABLE makernet.outbox_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version integer NOT NULL,
  event_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aggregate_type, aggregate_id, aggregate_version, event_type)
);
