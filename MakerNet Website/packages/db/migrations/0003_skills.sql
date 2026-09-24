CREATE TABLE makernet.skill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 100),
  parent_id uuid REFERENCES makernet.skill(id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 2 AND 80),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS DISTINCT FROM id)
);

CREATE OR REPLACE FUNCTION makernet.guard_skill_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE ancestors(id, parent_id) AS (
      SELECT id, parent_id FROM makernet.skill WHERE id = NEW.parent_id
      UNION ALL
      SELECT s.id, s.parent_id FROM makernet.skill s JOIN ancestors a ON s.id = a.parent_id
    ) SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'skill parent cycle';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER skill_no_cycle BEFORE INSERT OR UPDATE OF parent_id ON makernet.skill
  FOR EACH ROW EXECUTE FUNCTION makernet.guard_skill_cycle();

CREATE OR REPLACE FUNCTION makernet.normalize_skill_term(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT lower(regexp_replace(btrim(value), '[[:space:]]+', ' ', 'g'))
$$;

CREATE TABLE makernet.skill_term (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES makernet.skill(id) ON DELETE RESTRICT,
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 2 AND 100),
  normalized_label text GENERATED ALWAYS AS (makernet.normalize_skill_term(label)) STORED,
  locale text NOT NULL DEFAULT 'en' CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  kind text NOT NULL CHECK (kind IN ('canonical', 'alias')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (locale, normalized_label)
);
CREATE UNIQUE INDEX one_canonical_term_per_skill ON makernet.skill_term(skill_id) WHERE kind = 'canonical';

CREATE TABLE makernet.skill_alias (
  term_id uuid PRIMARY KEY REFERENCES makernet.skill_term(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  created_by uuid REFERENCES makernet.person(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION makernet.guard_skill_alias() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM makernet.skill_term WHERE id = NEW.term_id AND kind = 'alias') THEN
    RAISE EXCEPTION 'skill alias must reference alias term';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER skill_alias_kind BEFORE INSERT OR UPDATE ON makernet.skill_alias
  FOR EACH ROW EXECUTE FUNCTION makernet.guard_skill_alias();

INSERT INTO makernet.skill(id, name, parent_id, category) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Prototyping', NULL, 'Design'),
  ('00000000-0000-4000-8000-000000000002', 'CAD', NULL, 'Design'),
  ('00000000-0000-4000-8000-000000000003', '3D modeling', '00000000-0000-4000-8000-000000000002', 'Design'),
  ('00000000-0000-4000-8000-000000000004', '3D printing', '00000000-0000-4000-8000-000000000001', 'Fabrication'),
  ('00000000-0000-4000-8000-000000000005', 'Laser cutting', '00000000-0000-4000-8000-000000000001', 'Fabrication'),
  ('00000000-0000-4000-8000-000000000006', 'Woodworking', NULL, 'Fabrication'),
  ('00000000-0000-4000-8000-000000000007', 'Metalworking', NULL, 'Fabrication'),
  ('00000000-0000-4000-8000-000000000008', 'CNC milling', '00000000-0000-4000-8000-000000000007', 'Fabrication'),
  ('00000000-0000-4000-8000-000000000009', 'Welding', '00000000-0000-4000-8000-000000000007', 'Fabrication'),
  ('00000000-0000-4000-8000-000000000010', 'Electronics', NULL, 'Electronics'),
  ('00000000-0000-4000-8000-000000000011', 'Circuit design', '00000000-0000-4000-8000-000000000010', 'Electronics'),
  ('00000000-0000-4000-8000-000000000012', 'Soldering', '00000000-0000-4000-8000-000000000010', 'Electronics'),
  ('00000000-0000-4000-8000-000000000013', 'Programming', NULL, 'Computing'),
  ('00000000-0000-4000-8000-000000000014', 'Arduino', '00000000-0000-4000-8000-000000000013', 'Computing'),
  ('00000000-0000-4000-8000-000000000015', 'Raspberry Pi', '00000000-0000-4000-8000-000000000013', 'Computing'),
  ('00000000-0000-4000-8000-000000000016', 'Robotics', NULL, 'Computing'),
  ('00000000-0000-4000-8000-000000000017', 'Textiles', NULL, 'Craft'),
  ('00000000-0000-4000-8000-000000000018', 'Sewing', '00000000-0000-4000-8000-000000000017', 'Craft'),
  ('00000000-0000-4000-8000-000000000019', 'Ceramics', NULL, 'Craft'),
  ('00000000-0000-4000-8000-000000000020', 'Photography', NULL, 'Media'),
  ('00000000-0000-4000-8000-000000000021', 'Videography', NULL, 'Media'),
  ('00000000-0000-4000-8000-000000000022', 'Graphic design', NULL, 'Media'),
  ('00000000-0000-4000-8000-000000000023', 'Screen printing', '00000000-0000-4000-8000-000000000022', 'Media'),
  ('00000000-0000-4000-8000-000000000024', 'Product design', NULL, 'Design'),
  ('00000000-0000-4000-8000-000000000025', 'Data visualization', NULL, 'Computing')
ON CONFLICT (id) DO NOTHING;

INSERT INTO makernet.skill_term(skill_id, label, kind)
SELECT id, name, 'canonical' FROM makernet.skill
WHERE id::text LIKE '00000000-0000-4000-8000-%'
ON CONFLICT DO NOTHING;

INSERT INTO makernet.skill_term(skill_id, label, kind) VALUES
  ('00000000-0000-4000-8000-000000000004', 'Additive manufacturing', 'alias'),
  ('00000000-0000-4000-8000-000000000004', 'FDM printing', 'alias'),
  ('00000000-0000-4000-8000-000000000002', 'Computer-aided design', 'alias'),
  ('00000000-0000-4000-8000-000000000005', 'Laser engraving', 'alias'),
  ('00000000-0000-4000-8000-000000000011', 'Circuit layout', 'alias'),
  ('00000000-0000-4000-8000-000000000012', 'Solder', 'alias'),
  ('00000000-0000-4000-8000-000000000014', 'Arduino programming', 'alias'),
  ('00000000-0000-4000-8000-000000000018', 'Machine sewing', 'alias'),
  ('00000000-0000-4000-8000-000000000020', 'Photo', 'alias'),
  ('00000000-0000-4000-8000-000000000023', 'Silkscreen', 'alias'),
  ('00000000-0000-4000-8000-000000000025', 'Data viz', 'alias')
ON CONFLICT DO NOTHING;

INSERT INTO makernet.skill_alias(term_id)
SELECT id FROM makernet.skill_term WHERE kind = 'alias' ON CONFLICT DO NOTHING;
