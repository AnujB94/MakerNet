CREATE OR REPLACE FUNCTION makernet.purge_profile_projection_on_account_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state <> 'active' OR (NEW.eligibility_ends_at IS NOT NULL AND NEW.eligibility_ends_at <= now()) THEN
    DELETE FROM makernet.person_skill_projection WHERE person_id = NEW.id;
    UPDATE makernet.session SET revoked_at = now()
      WHERE person_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER account_projection_purge ON makernet.person;
CREATE TRIGGER account_projection_purge AFTER UPDATE OF state, eligibility_ends_at ON makernet.person
  FOR EACH ROW EXECUTE FUNCTION makernet.purge_profile_projection_on_account_change();
