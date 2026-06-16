# Smoke Test Checklist (MVP)

## 1) Autenticación
- [ ] Login staff con `admin@aprendamosjuntos.mx`.
- [ ] Login padre con cuenta portal.
- [ ] Redirección correcta: staff a `/dashboard`, padre a `/portal/citas`.

## 2) Agenda y Citas
- [ ] Crear cita nueva desde `/agenda`.
- [ ] Confirmar cita y marcar `completada`.
- [ ] Crear sesión desde cita.

## 3) Sesiones
- [ ] Registrar sesión manual desde `/sesiones`.
- [ ] Ver sesión en el listado con paciente, terapeuta y duración.

## 4) Evaluaciones
- [ ] Crear evaluación nueva para un paciente.
- [ ] Verla en `/evaluaciones` y en expediente del paciente.
- [ ] Validar que aparezcan 8 áreas disponibles:
  `motricidad_fina`, `motricidad_gruesa`, `integracion_sensorial`, `atencion`,
  `conducta`, `cognitivo`, `lenguaje`, `socioafectivo`.

## 5) Portal Padres
- [ ] Ver citas del hijo en `/portal/citas`.
- [ ] Enviar/recibir mensaje en `/portal/mensajes`.
- [ ] Ver reportes compartidos en `/portal/reportes`.

## 6) Encuestas
- [ ] Crear encuesta en `/configuracion?tab=encuestas`.
- [ ] Copiar enlace y responder desde `/encuesta/[token]`.
- [ ] Confirmar estado respondida y puntuación en configuración.

## 7) PWA / Offline
- [ ] Verificar registro de Service Worker (`/sw.js`).
- [ ] Abrir `/offline` y validar fallback sin conexión.
- [ ] Confirmar instalación PWA desde navegador.

## 8) Permisos por rol (terapeuta)
- [ ] Terapeuta solo ve sus citas en `/agenda`.
- [ ] Terapeuta solo ve sus sesiones en `/sesiones`.
- [ ] Terapeuta solo ve sus evaluaciones y pacientes asignados en `/evaluaciones`.
