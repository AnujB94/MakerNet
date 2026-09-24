CREATE TABLE makernet.person_profile (
  person_id uuid PRIMARY KEY REFERENCES makernet.person(id),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 100),
  biography text NOT NULL DEFAULT '' CHECK (length(biography) <= 4000),
  year smallint CHECK (year BETWEEN 1 AND 8),
  department text NOT NULL DEFAULT '' CHECK (length(department) <= 120),
  willing_to_help boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE makernet.profile_field_visibility (
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  field_key text NOT NULL CHECK (field_key IN
    ('name', 'photo', 'biography', 'year', 'department', 'organizations',
     'skill_claims', 'evidence', 'willingness_to_help')),
  audience text NOT NULL DEFAULT 'college' CHECK (audience IN ('public', 'college', 'organization', 'private')),
  audience_organization_id uuid REFERENCES makernet.organization(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, field_key),
  CHECK ((audience = 'organization' AND audience_organization_id IS NOT NULL) OR
         (audience <> 'organization' AND audience_organization_id IS NULL))
);

CREATE TABLE makernet.person_skill_claim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  skill_id uuid NOT NULL REFERENCES makernet.skill(id),
  statement text NOT NULL DEFAULT '' CHECK (length(statement) <= 1000),
  audience text NOT NULL DEFAULT 'college' CHECK (audience IN ('public', 'college', 'organization', 'private')),
  audience_organization_id uuid REFERENCES makernet.organization(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((audience = 'organization' AND audience_organization_id IS NOT NULL) OR
         (audience <> 'organization' AND audience_organization_id IS NULL))
);
CREATE UNIQUE INDEX one_active_claim_per_skill ON makernet.person_skill_claim(person_id, skill_id)
  WHERE status = 'active';

CREATE TABLE makernet.person_skill_projection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES makernet.person(id),
  skill_id uuid NOT NULL REFERENCES makernet.skill(id),
  audience text NOT NULL CHECK (audience IN ('public', 'college', 'organization', 'private')),
  audience_organization_id uuid REFERENCES makernet.organization(id),
  self_claim_count integer NOT NULL DEFAULT 0 CHECK (self_claim_count >= 0),
  evidence_count integer NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  latest_at timestamptz,
  rebuilt_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((audience = 'organization' AND audience_organization_id IS NOT NULL) OR
         (audience <> 'organization' AND audience_organization_id IS NULL))
);
CREATE UNIQUE INDEX one_projection_audience ON makernet.person_skill_projection
  (person_id, skill_id, audience, audience_organization_id) NULLS NOT DISTINCT;

INSERT INTO makernet.person_profile(person_id, display_name)
SELECT id, display_name FROM makernet.person ON CONFLICT DO NOTHING;

INSERT INTO makernet.profile_field_visibility(person_id, field_key)
SELECT p.id, k.key FROM makernet.person p CROSS JOIN
  (VALUES ('name'), ('photo'), ('biography'), ('year'), ('department'),
          ('organizations'), ('skill_claims'), ('evidence'), ('willingness_to_help')) k(key)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION makernet.initialize_person_profile() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO makernet.person_profile(person_id, display_name) VALUES (NEW.id, NEW.display_name);
  INSERT INTO makernet.profile_field_visibility(person_id, field_key)
  SELECT NEW.id, k.key FROM
    (VALUES ('name'), ('photo'), ('biography'), ('year'), ('department'),
            ('organizations'), ('skill_claims'), ('evidence'), ('willingness_to_help')) k(key);
  RETURN NEW;
END $$;
CREATE TRIGGER person_profile_initialize AFTER INSERT ON makernet.person
  FOR EACH ROW EXECUTE FUNCTION makernet.initialize_person_profile();
