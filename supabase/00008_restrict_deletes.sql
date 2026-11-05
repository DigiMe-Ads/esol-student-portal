-- Deleting students and lecturers is Super Admin only. 00005 let the roles that edit them also DELETE
-- through the API directly, which skipped the confirmation and left their portal logins behind.
-- Also: audit lines now name the deleted person, and the admin-only error message is generic.
BEGIN;

DROP POLICY staff_delete ON student_portal.students;
DROP POLICY staff_delete ON student_portal.lecturers;
CREATE POLICY staff_delete ON student_portal.students FOR DELETE TO anon, authenticated
  USING ((SELECT student_portal.has_role('super_admin')));
CREATE POLICY staff_delete ON student_portal.lecturers FOR DELETE TO anon, authenticated
  USING ((SELECT student_portal.has_role('super_admin')));

CREATE OR REPLACE FUNCTION student_portal._require_admin() RETURNS uuid
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE u users := _session_user();
BEGIN
  IF u.id IS NULL THEN RAISE EXCEPTION 'Your session has expired. Please sign in again.' USING ERRCODE = '28000'; END IF;
  IF u.role <> 'super_admin' THEN RAISE EXCEPTION 'Only a Super Admin can do this.' USING ERRCODE = '42501'; END IF;
  RETURN u.id;
END $$;

CREATE OR REPLACE FUNCTION student_portal._audit() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = student_portal AS $$
DECLARE u users := _session_user(); v_old jsonb; v_new jsonb; v_changed text; v_label text;
BEGIN
  v_old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - 'password_hash' END;
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - 'password_hash' END;
  IF TG_OP = 'UPDATE' THEN
    SELECT string_agg(k, ', ') INTO v_changed FROM jsonb_object_keys(v_new) k
     WHERE v_new -> k IS DISTINCT FROM v_old -> k AND k NOT IN ('updated_at', 'failed_logins', 'locked_until');
    IF v_changed IS NULL THEN RETURN NULL; END IF;
  END IF;
  -- a readable name for the row: "EPC-2026-00004 Mohamed Farook", "LEC-0101 Dr. ...", an invoice number, ...
  SELECT concat_ws(' ',
           coalesce(r ->> 'student_number', r ->> 'lecturer_id', r ->> 'invoice_number', r ->> 'receipt_number',
                    r ->> 'ref_number', r ->> 'ticket_number', r ->> 'certificate_number', r ->> 'exam_code',
                    r ->> 'username', r ->> 'code'),
           coalesce(r ->> 'full_name', r ->> 'title', r ->> 'name'))
    INTO v_label FROM (SELECT coalesce(v_new, v_old) AS r) x;
  INSERT INTO audit_logs (user_role, action, entity_type, entity_id, details, ip_address)
  VALUES (coalesce(u.display_name || ' (' || u.role || ')', 'System'), TG_OP, TG_TABLE_NAME,
          coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'student_id', v_old ->> 'student_id'),
          CASE TG_OP WHEN 'INSERT' THEN 'Created ' WHEN 'UPDATE' THEN 'Changed ' || v_changed || ' on ' ELSE 'Deleted ' END
            || coalesce(nullif(v_label, ''), 'record'),
          NULL);
  RETURN NULL;
END $$;

COMMIT;
