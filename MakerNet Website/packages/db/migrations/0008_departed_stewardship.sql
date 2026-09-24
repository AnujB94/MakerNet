CREATE OR REPLACE FUNCTION makernet.handle_departed_guide_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  owned record;
  successor uuid;
BEGIN
  IF NEW.state = 'active' THEN RETURN NEW; END IF;
  FOR owned IN SELECT id FROM makernet.guide
    WHERE owner_type = 'person' AND owner_person_id = NEW.id AND status = 'active'
  LOOP
    SELECT m.person_id INTO successor FROM makernet.guide_maintainer m
      JOIN makernet.person p ON p.id = m.person_id
      WHERE m.guide_id = owned.id AND m.person_id <> NEW.id AND m.status = 'active'
        AND p.state = 'active' AND (p.eligibility_ends_at IS NULL OR p.eligibility_ends_at > now())
      ORDER BY m.granted_at, m.person_id LIMIT 1;
    IF successor IS NULL THEN
      UPDATE makernet.guide SET status = 'archived', updated_at = now() WHERE id = owned.id;
      INSERT INTO makernet.audit_event(action, target_type, target_id, scope, reason)
        VALUES ('guide_archive_departure', 'guide', owned.id::text, 'college', 'Owner departed without accepted co-maintainer');
    ELSE
      UPDATE makernet.guide_maintainer SET is_owner = true,
        scopes = ARRAY['manage_contributors','publish_revisions','change_visibility','archive','manage_maintainers']::text[]
        WHERE guide_id = owned.id AND person_id = successor;
      UPDATE makernet.guide_maintainer SET is_owner = false, status = 'revoked', revoked_at = now()
        WHERE guide_id = owned.id AND person_id = NEW.id;
      UPDATE makernet.guide SET owner_person_id = successor, updated_at = now() WHERE id = owned.id;
      INSERT INTO makernet.audit_event(action, target_type, target_id, scope, reason)
        VALUES ('stewardship_auto_transfer', 'guide', owned.id::text, 'college', 'Transferred to accepted active co-maintainer');
    END IF;
    successor := NULL;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER departed_guide_owner AFTER UPDATE OF state ON makernet.person
  FOR EACH ROW EXECUTE FUNCTION makernet.handle_departed_guide_owner();
