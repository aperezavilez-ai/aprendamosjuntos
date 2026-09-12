-- Evita que fallos de auditoría bloqueen inserts/updates operativos

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

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auditoria insert failed on %: %', TG_TABLE_NAME, SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
