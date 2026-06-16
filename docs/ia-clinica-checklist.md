# IA Clinica Checklist (Cierre 100%)

## Requisitos
- `ANTHROPIC_API_KEY` configurada en entorno.
- `SUPABASE_SERVICE_ROLE_KEY` configurada.
- Al menos 1 paciente activo con sesiones/evaluaciones.

## Validacion rapida
- [ ] Abrir `/ia` y seleccionar paciente.
- [ ] Generar cada modo: `reporte`, `resumen`, `tareas`, `analisis`, `patrones`.
- [ ] Confirmar que el reporte se guarda en `reportes_ia`.
- [ ] Descargar PDF desde boton `PDF`.
- [ ] Publicar en portal padres y validar visibilidad en `/portal/reportes`.

## Smoke automatizado
- Ejecutar:
  - `npm run ia:smoke`
- Esperado:
  - Llamada Anthropic exitosa
  - Insercion en `reportes_ia` con titulo `Smoke IA <fecha>`

## Casos de error (deben ser claros)
- [ ] Sin API key: mensaje `ANTHROPIC_API_KEY no configurada`.
- [ ] Limite de IA (429): mensaje de reintento.
- [ ] Solicitud invalida (400): mensaje `solicitud no valida`.
