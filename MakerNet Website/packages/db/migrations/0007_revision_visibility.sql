ALTER TABLE makernet.guide_revision ADD COLUMN visibility text NOT NULL DEFAULT 'college'
  CHECK (visibility IN ('college', 'organization', 'private'));
ALTER TABLE makernet.guide_revision ADD COLUMN audience_organization_id uuid REFERENCES makernet.organization(id);
ALTER TABLE makernet.guide_revision ADD CONSTRAINT revision_organization_audience CHECK
  ((visibility = 'organization' AND audience_organization_id IS NOT NULL) OR
   (visibility <> 'organization' AND audience_organization_id IS NULL));

CREATE OR REPLACE FUNCTION makernet.guard_revision_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.guide_id IS DISTINCT FROM NEW.guide_id OR OLD.version IS DISTINCT FROM NEW.version OR
     OLD.content IS DISTINCT FROM NEW.content OR OLD.changelog IS DISTINCT FROM NEW.changelog OR
     OLD.editor_id IS DISTINCT FROM NEW.editor_id OR OLD.published_at IS DISTINCT FROM NEW.published_at OR
     OLD.visibility IS DISTINCT FROM NEW.visibility OR
     OLD.audience_organization_id IS DISTINCT FROM NEW.audience_organization_id THEN
    RAISE EXCEPTION 'published revision content is immutable';
  END IF;
  RETURN NEW;
END $$;
