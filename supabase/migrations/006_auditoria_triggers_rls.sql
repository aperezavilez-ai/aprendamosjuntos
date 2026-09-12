-- Auditoría automática + RLS para que admin/director vean actividad del staff

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin ve auditoría de su clínica" ON auditoria;
CREATE POLICY "Admin ve auditoría de su clínica"
  ON auditoria FOR SELECT
  USING (
    clinica_id = get_clinica_id()
    AND get_user_rol() IN ('admin_general', 'director_clinico')
  );

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_clinica_id UUID;
  v_registro_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_clinica_id := OLD.clinica_id;
    v_registro_id := OLD.id;
  ELSE
    v_clinica_id := NEW.clinica_id;
    v_registro_id := NEW.id;
  END IF;

  IF v_clinica_id IS NULL AND TG_TABLE_NAME = 'familiares' THEN
    SELECT p.clinica_id INTO v_clinica_id
    FROM pacientes p
    WHERE p.id = COALESCE(NEW.paciente_id, OLD.paciente_id);
  END IF;

  INSERT INTO auditoria (clinica_id, usuario_id, tabla, registro_id, accion, datos_antes, datos_despues)
  VALUES (
    v_clinica_id,
    auth.uid(),
    TG_TABLE_NAME,
    v_registro_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers en tablas operativas principales
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pacientes', 'citas', 'sesiones', 'evaluaciones',
    'planes_terapeuticos', 'usuarios', 'familiares', 'facturacion'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()',
      t, t
    );
  END LOOP;
END $$;
