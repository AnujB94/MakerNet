CREATE TABLE makernet.guide (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES makernet.person(id),
  owner_type text NOT NULL CHECK (owner_type IN ('person', 'organization')),
  owner_person_id uuid REFERENCES makernet.person(id),
  owner_organization_id uuid REFERENCES makernet.organization(id),
  guide_type text NOT NULL CHECK (guide_type IN ('how_to', 'build_log', 'reference')),
  visibility text NOT NULL CHECK (visibility IN ('college', 'organization', 'private')),
  audience_organization_id uuid REFERENCES makernet.organization(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'removed')),
  current_revision_id uuid,
  effective_revision_id uuid,
  lock_version integer NOT NULL DEFAULT 0 CHECK (lock_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((owner_type = 'person' AND owner_person_id IS NOT NULL AND owner_organization_id IS NULL) OR
         (owner_type = 'organization' AND owner_person_id IS NULL AND owner_organization_id IS NOT NULL)),
  CHECK ((visibility = 'organization' AND audience_organization_id IS NOT NULL) OR
         (visibility <> 'organization' AND audience_organization_id IS NULL))
);

CREATE TABLE makernet.guide_maintainer (
  guide_id uuid NOT NULL REFERENCES makernet.guide(id),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  scopes text[] NOT NULL CHECK (scopes <@ ARRAY['manage_contributors','publish_revisions','change_visibility','archive','manage_maintainers']::text[]),
  is_owner boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_by uuid REFERENCES makernet.person(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (guide_id, person_id),
  CHECK (NOT is_owner OR cardinality(scopes) = 5)
);

CREATE OR REPLACE FUNCTION makernet.guard_last_owner_maintainer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_owner AND OLD.status = 'active' AND (TG_OP = 'DELETE' OR NEW.status <> 'active' OR NOT NEW.is_owner) THEN
    IF NOT EXISTS (SELECT 1 FROM makernet.guide_maintainer
      WHERE guide_id = OLD.guide_id AND person_id <> OLD.person_id AND is_owner AND status = 'active') THEN
      RAISE EXCEPTION 'cannot remove last owner-maintainer';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER guide_last_owner BEFORE UPDATE OR DELETE ON makernet.guide_maintainer
  FOR EACH ROW EXECUTE FUNCTION makernet.guard_last_owner_maintainer();

CREATE TABLE makernet.guide_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES makernet.guide(id),
  version integer NOT NULL CHECK (version > 0),
  content jsonb NOT NULL,
  changelog text NOT NULL DEFAULT '',
  editor_id uuid NOT NULL REFERENCES makernet.person(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  publication_status text NOT NULL DEFAULT 'current' CHECK (publication_status IN ('current', 'superseded', 'withdrawn')),
  safety_status text NOT NULL DEFAULT 'not_flagged' CHECK (safety_status IN ('not_flagged', 'under_review', 'cleared', 'quarantined')),
  UNIQUE (guide_id, version),
  UNIQUE (guide_id, id)
);
ALTER TABLE makernet.guide ADD CONSTRAINT guide_current_revision_fk FOREIGN KEY (id, current_revision_id)
  REFERENCES makernet.guide_revision(guide_id, id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE makernet.guide ADD CONSTRAINT guide_effective_revision_fk FOREIGN KEY (id, effective_revision_id)
  REFERENCES makernet.guide_revision(guide_id, id) DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION makernet.guard_revision_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.guide_id IS DISTINCT FROM NEW.guide_id OR OLD.version IS DISTINCT FROM NEW.version OR
     OLD.content IS DISTINCT FROM NEW.content OR OLD.changelog IS DISTINCT FROM NEW.changelog OR
     OLD.editor_id IS DISTINCT FROM NEW.editor_id OR OLD.published_at IS DISTINCT FROM NEW.published_at THEN
    RAISE EXCEPTION 'published revision content is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guide_revision_immutable BEFORE UPDATE ON makernet.guide_revision
  FOR EACH ROW EXECUTE FUNCTION makernet.guard_revision_immutability();

CREATE TABLE makernet.guide_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES makernet.guide(id),
  base_revision_id uuid REFERENCES makernet.guide_revision(id),
  content jsonb NOT NULL,
  lock_version integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'abandoned')),
  updated_by uuid NOT NULL REFERENCES makernet.person(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_guide_draft ON makernet.guide_draft(guide_id)
  WHERE status IN ('draft', 'ready');

CREATE TABLE makernet.guide_edit_proposal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES makernet.guide(id),
  base_revision_id uuid NOT NULL REFERENCES makernet.guide_revision(id),
  proposer_id uuid NOT NULL REFERENCES makernet.person(id),
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'stale')),
  reviewer_id uuid REFERENCES makernet.person(id),
  decision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE makernet.draft_contribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES makernet.guide_draft(id),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  role text NOT NULL CHECK (role IN ('lead_author', 'author', 'contributor')),
  contribution_note text NOT NULL DEFAULT '' CHECK (length(contribution_note) <= 1000),
  credit_order integer NOT NULL CHECK (credit_order > 0),
  invitation_status text NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  accepted_audience text CHECK (accepted_audience IN ('college', 'organization', 'private')),
  accepted_organization_id uuid REFERENCES makernet.organization(id),
  public_byline text NOT NULL DEFAULT 'Contributor' CHECK (length(public_byline) BETWEEN 2 AND 100),
  responded_at timestamptz,
  UNIQUE (draft_id, person_id),
  UNIQUE (draft_id, credit_order),
  CHECK ((accepted_audience = 'organization' AND accepted_organization_id IS NOT NULL) OR
         (accepted_audience <> 'organization' AND accepted_organization_id IS NULL))
);

CREATE TABLE makernet.draft_evidence_candidate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES makernet.draft_contribution(id),
  skill_id uuid NOT NULL REFERENCES makernet.skill(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  responded_at timestamptz,
  UNIQUE (contribution_id, skill_id)
);

CREATE TABLE makernet.guide_revision_authorship (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES makernet.guide_revision(id),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  role text NOT NULL,
  contribution_note text NOT NULL,
  credit_order integer NOT NULL,
  accepted_audience text NOT NULL CHECK (accepted_audience IN ('college', 'organization', 'private')),
  accepted_organization_id uuid REFERENCES makernet.organization(id),
  public_byline text NOT NULL,
  accepted_at timestamptz NOT NULL,
  UNIQUE (revision_id, person_id),
  UNIQUE (revision_id, credit_order),
  CHECK ((accepted_audience = 'organization' AND accepted_organization_id IS NOT NULL) OR
         (accepted_audience <> 'organization' AND accepted_organization_id IS NULL))
);
CREATE OR REPLACE FUNCTION makernet.reject_authorship_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'revision authorship is immutable'; END $$;
CREATE TRIGGER revision_authorship_immutable BEFORE UPDATE OR DELETE ON makernet.guide_revision_authorship
  FOR EACH ROW EXECUTE FUNCTION makernet.reject_authorship_mutation();

CREATE TABLE makernet.guide_skill (
  revision_id uuid NOT NULL REFERENCES makernet.guide_revision(id),
  skill_id uuid NOT NULL REFERENCES makernet.skill(id),
  relationship text NOT NULL CHECK (relationship IN ('taught', 'required', 'used')),
  PRIMARY KEY (revision_id, skill_id, relationship)
);

CREATE TABLE makernet.skill_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  skill_id uuid NOT NULL REFERENCES makernet.skill(id),
  revision_authorship_id uuid NOT NULL REFERENCES makernet.guide_revision_authorship(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
  accepted_at timestamptz NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  audience text NOT NULL CHECK (audience IN ('college', 'organization', 'private')),
  audience_organization_id uuid REFERENCES makernet.organization(id),
  UNIQUE (revision_authorship_id, skill_id),
  CHECK ((audience = 'organization' AND audience_organization_id IS NOT NULL) OR
         (audience <> 'organization' AND audience_organization_id IS NULL))
);

CREATE TABLE makernet.guide_ownership_transfer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES makernet.guide(id),
  initiated_by uuid NOT NULL REFERENCES makernet.person(id),
  target_person_id uuid REFERENCES makernet.person(id),
  target_organization_id uuid REFERENCES makernet.organization(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK ((target_person_id IS NOT NULL AND target_organization_id IS NULL) OR
         (target_person_id IS NULL AND target_organization_id IS NOT NULL))
);

CREATE TABLE makernet.guide_visibility_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES makernet.guide(id),
  requested_by uuid NOT NULL REFERENCES makernet.person(id),
  new_visibility text NOT NULL CHECK (new_visibility IN ('college', 'organization', 'private')),
  new_organization_id uuid REFERENCES makernet.organization(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  CHECK ((new_visibility = 'organization' AND new_organization_id IS NOT NULL) OR
         (new_visibility <> 'organization' AND new_organization_id IS NULL))
);
CREATE TABLE makernet.guide_visibility_consent (
  change_id uuid NOT NULL REFERENCES makernet.guide_visibility_change(id),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  accepted_at timestamptz,
  PRIMARY KEY (change_id, person_id)
);
