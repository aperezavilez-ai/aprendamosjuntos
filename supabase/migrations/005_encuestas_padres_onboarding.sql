-- Encuestas: padres pueden ver y responder; token público opcional

ALTER TABLE encuestas_satisfaccion
  ADD COLUMN IF NOT EXISTS token UUID DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_encuestas_token ON encuestas_satisfaccion(token);

DROP POLICY IF EXISTS "Padre ve encuestas familiares" ON encuestas_satisfaccion;
CREATE POLICY "Padre ve encuestas familiares"
  ON encuestas_satisfaccion FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.id = encuestas_satisfaccion.familiar_id
      AND f.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Padre responde encuestas" ON encuestas_satisfaccion;
CREATE POLICY "Padre responde encuestas"
  ON encuestas_satisfaccion FOR UPDATE
  USING (
    respondida = FALSE
    AND EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.id = encuestas_satisfaccion.familiar_id
      AND f.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.id = encuestas_satisfaccion.familiar_id
      AND f.auth_user_id = auth.uid()
    )
  );
