CREATE OR REPLACE FUNCTION makernet.purge_profile_projection_on_account_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state <> 'active' THEN
    DELETE FROM makernet.person_skill_projection WHERE person_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER account_projection_purge AFTER UPDATE OF state ON makernet.person
  FOR EACH ROW EXECUTE FUNCTION makernet.purge_profile_projection_on_account_change();

CREATE OR REPLACE FUNCTION makernet.purge_profile_projection_on_deactivation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    DELETE FROM makernet.person_skill_projection WHERE person_id = NEW.person_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profile_projection_purge AFTER UPDATE OF status ON makernet.person_profile
  FOR EACH ROW EXECUTE FUNCTION makernet.purge_profile_projection_on_deactivation();

CREATE OR REPLACE FUNCTION makernet.purge_profile_projection_on_membership_end() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    DELETE FROM makernet.person_skill_projection WHERE person_id = NEW.person_id
      AND audience = 'organization' AND audience_organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER membership_projection_purge AFTER UPDATE OF status ON makernet.organization_membership
  FOR EACH ROW EXECUTE FUNCTION makernet.purge_profile_projection_on_membership_end();
