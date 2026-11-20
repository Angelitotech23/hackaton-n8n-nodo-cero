# 14 · Agenda de citas con confirmación y recordatorio

## Para qué sirve

Las citas que se confirman a mano consumen llamadas y olvidos. Este flujo recibe una reserva, la pone en tu calendario, confirma al cliente y le recuerda 24 horas antes. Sirve a consultores, estéticas, clases, talleres y cualquier servicio con horario.

## Qué hace el proceso

1. **Recibe** la reserva por webhook con nombre, email, inicio y fin en formato ISO.
2. **Normaliza** los campos.
3. **Valida** que el email tenga arroba, el nombre no esté vacío y la fecha de inicio sea futura.
4. Si la reserva es válida:
   - crea el evento en Google Calendar,
   - envía la confirmación al cliente,
   - si faltan más de 24 horas, espera hasta 24 horas antes de la cita y envía el recordatorio.
5. Si no es válida, avisa en `#citas` en Slack.
6. Si algo falla, te llega una alerta.

## Piezas que usa

- Webhook.
- Edit Fields (Set).
- IF (dos veces).
- Google Calendar.
- Gmail (confirmación y recordatorio).
- Wait (espera hasta una hora específica).
- Slack.
- Error Trigger y Gmail.

## Antes de empezar

- Un calendario de Google dedicado a citas. Copia su id.
- Un formulario o página de reserva que envíe `nombre`, `email`, `inicio` y `fin` en formato ISO (por ejemplo `2026-12-01T10:00:00`).
- Canal de Slack `citas`.

## Cómo construirlo a mano

1. **Webhook**, `POST`, ruta `reserva-cita-v2`.
2. **Edit Fields (Set)**: `nombre`, `email` en minúsculas, `inicio`, `fin`.
3. **IF**: email contiene `@`, nombre no vacío, `inicio` después de `{{ $now.toISO() }}`.
4. Rama verdadera:
   - **Google Calendar** (evento, calendario = tu id, inicio y fin, título "Cita con nombre").
   - **Gmail** (confirmación).
   - **IF**: `{{ $now.toISO() }}` antes de `{{ DateTime.fromISO(inicio).minus({ hours: 24 }).toISO() }}`.
   - Si es verdadero: **Wait** en modo "At Specified Time" con esa misma fecha, y después **Gmail** (recordatorio).
5. Rama falsa: **Slack** en `#citas`.
6. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Agenda de citas con confirmación y recordatorio". Webhook POST en "reserva-cita-v2". Set con nombre, email en minúsculas, inicio y fin. IF: email con "@", nombre no vacío e inicio posterior a ahora. Si es válido: crea evento en Google Calendar del calendario PEGAR_ID_DEL_CALENDARIO con inicio, fin y título "Cita con nombre"; envía confirmación por Gmail; luego un IF que verifica si faltan más de 24 horas; si sí, un Wait hasta 24 horas antes del inicio y un correo de recordatorio. Si no es válido, avisa en Slack canal "citas". Error Trigger con alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DEL_CALENDARIO`, `PEGAR_TU_EMAIL`.
- Google Calendar, Gmail, Slack.

## Pruebas

- Envía una reserva de prueba para dentro de tres días. Revisa el evento, la confirmación y, al día siguiente, el recordatorio.
- Envía una con fecha pasada. Debe ir a Slack.

## Riesgos y notas

- El Wait mantiene la ejecución pendiente. Si n8n se reinicia, revisa que el recordatorio siga programado.
- Las zonas horarias importan. Configura la zona horaria del flujo en la configuración del workflow.
- No hay control de choques de horario. Puedes consultar el calendario antes de crear el evento.
- Tiempo estimado: 2 horas.
