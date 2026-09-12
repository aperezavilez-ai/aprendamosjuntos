-- Corrige recursión infinita RLS entre pacientes ↔ familiares
-- Error: infinite recursion detected in policy for relation "pacientes"

CREATE OR REPLACE FUNCTION is_familiar_of_paciente(p_paciente_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.familiares f
    WHERE f.paciente_id = p_paciente_id
    AND f.auth_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_familiar_auth(p_familiar_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.familiares f
    WHERE f.id = p_familiar_id
    AND f.auth_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION staff_can_manage_paciente(p_paciente_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    INNER JOIN public.usuarios u ON u.clinica_id = p.clinica_id
    WHERE p.id = p_paciente_id
    AND u.id = auth.uid()
    AND u.rol::text != 'padre'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Pacientes
DROP POLICY IF EXISTS "Padre ve solo su hijo" ON pacientes;
CREATE POLICY "Padre ve solo su hijo"
  ON pacientes FOR SELECT
  USING (is_familiar_of_paciente(id));

-- Familiares
DROP POLICY IF EXISTS "Staff gestiona familiares" ON familiares;
CREATE POLICY "Staff gestiona familiares"
  ON familiares FOR ALL
  USING (staff_can_manage_paciente(paciente_id));

-- Citas
DROP POLICY IF EXISTS "Padre ve citas de su hijo" ON citas;
CREATE POLICY "Padre ve citas de su hijo"
  ON citas FOR SELECT
  USING (is_familiar_of_paciente(paciente_id));

DROP POLICY IF EXISTS "Padre confirma citas" ON citas;
CREATE POLICY "Padre confirma citas"
  ON citas FOR UPDATE
  USING (is_familiar_of_paciente(paciente_id))
  WITH CHECK (is_familiar_of_paciente(paciente_id));

-- Sesiones
DROP POLICY IF EXISTS "Padre ve sesiones de su hijo" ON sesiones;
CREATE POLICY "Padre ve sesiones de su hijo"
  ON sesiones FOR SELECT
  USING (is_familiar_of_paciente(paciente_id));

-- Chat
DROP POLICY IF EXISTS "Participantes ven el chat" ON chat_mensajes;
CREATE POLICY "Participantes ven el chat"
  ON chat_mensajes FOR SELECT
  USING (
    clinica_id = get_clinica_id()
    OR is_familiar_of_paciente(paciente_id)
  );

DROP POLICY IF EXISTS "Padre envía mensajes" ON chat_mensajes;
CREATE POLICY "Padre envía mensajes"
  ON chat_mensajes FOR INSERT
  WITH CHECK (
    is_familiar_of_paciente(paciente_id)
    AND clinica_id = (
      SELECT p.clinica_id FROM public.pacientes p WHERE p.id = paciente_id LIMIT 1
    )
  );

-- Reportes IA
DROP POLICY IF EXISTS "Padre ve reportes compartidos" ON reportes_ia;
CREATE POLICY "Padre ve reportes compartidos"
  ON reportes_ia FOR SELECT
  USING (
    enviado_a_padres = TRUE
    AND is_familiar_of_paciente(paciente_id)
  );

-- Archivos
DROP POLICY IF EXISTS "Padre ve archivos de su hijo" ON archivos_paciente;
CREATE POLICY "Padre ve archivos de su hijo"
  ON archivos_paciente FOR SELECT
  USING (
    COALESCE(visible_a_padres, TRUE)
    AND is_familiar_of_paciente(paciente_id)
  );

DROP POLICY IF EXISTS "Staff gestiona archivos" ON archivos_paciente;
CREATE POLICY "Staff gestiona archivos"
  ON archivos_paciente FOR ALL
  USING (staff_can_manage_paciente(paciente_id));

-- Encuestas
DROP POLICY IF EXISTS "Padre ve encuestas familiares" ON encuestas_satisfaccion;
CREATE POLICY "Padre ve encuestas familiares"
  ON encuestas_satisfaccion FOR SELECT
  USING (is_familiar_auth(familiar_id));

DROP POLICY IF EXISTS "Padre responde encuestas" ON encuestas_satisfaccion;
CREATE POLICY "Padre responde encuestas"
  ON encuestas_satisfaccion FOR UPDATE
  USING (respondida = FALSE AND is_familiar_auth(familiar_id))
  WITH CHECK (is_familiar_auth(familiar_id));
