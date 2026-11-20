# 07 · Onboarding de cliente tras pago: Drive, brief y Trello

## Para qué sirve

Después de que un cliente paga, hay un trabajo repetido: crear su carpeta, enviarle el brief para llenar, anotar la tarea de arranque. Este flujo lo hace en segundos. Sirve a agencias, consultores, diseñadores y cualquier servicio con clientes nuevos cada semana.

## Qué hace el proceso

1. **Escucha** el evento `checkout.session.completed` de Stripe (pago completado por un enlace de pago).
2. **Normaliza** nombre, email y el id de la sesión.
3. **Valida** que haya nombre y un email con arroba.
4. Si los datos están completos:
   - crea una carpeta en Google Drive con el nombre del cliente y el id de la sesión,
   - envía un correo de bienvenida con el enlace a tu brief,
   - crea una tarjeta en Trello en tu lista de arranque, con el email y la sesión en la descripción.
5. Si faltan datos, avisa en `#onboarding` para revisarlo a mano.
6. Si Drive o Trello fallan, el flujo sigue y el correo llega igual.

## Piezas que usa

- Stripe Trigger.
- Edit Fields (Set).
- IF.
- Google Drive (crear carpeta).
- Gmail (bienvenida).
- Trello (tarjeta).
- Slack (aviso de datos incompletos).
- Error Trigger y Gmail.

## Antes de empezar

- Un enlace de pago en Stripe que pida nombre y correo.
- Un formulario de brief (Google Forms o Typeform). Copia su enlace.
- Un tablero de Trello con una lista de "Onboarding". Copia el id de la lista.
- Canal de Slack `onboarding`.

## Cómo construirlo a mano

1. **Stripe Trigger**, evento `checkout.session.completed`.
2. **Edit Fields (Set)**: `nombre` desde `data.object.customer_details.name`, `email` desde `customer_details.email`, `sesionId` desde `id`.
3. **IF**: nombre no vacío y email con arroba.
4. Rama verdadera: **Google Drive** (crear carpeta con nombre y sesión) → **Gmail** (bienvenida con el enlace del brief) → **Trello** (crear tarjeta en la lista).
5. Rama falsa: **Slack** en `#onboarding`.
6. Activa "Continue on fail" en Drive, Gmail y Trello.
7. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Onboarding de cliente tras pago". Stripe Trigger con checkout.session.completed. Set: nombre desde customer_details.name, email en minúsculas desde customer_details.email, sesionId desde id. IF: nombre no vacío y email con "@". Si es válido: crea carpeta en Google Drive con nombre y sesión; envía por Gmail un correo de bienvenida con el enlace del brief PEGAR_LINK_DEL_BRIEF; crea tarjeta en Trello en la lista PEGAR_ID_DE_LISTA_TRELLO con email y sesión en la descripción. Todos con continue on fail. Si no es válido, avisa en Slack canal "onboarding". Error Trigger que envía alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_LINK_DEL_BRIEF`, `PEGAR_ID_DE_LISTA_TRELLO`, `PEGAR_TU_EMAIL`.
- Stripe (modo de prueba primero), Google Drive, Gmail, Trello, Slack.

## Pruebas

- Haz un pago de prueba con el enlace de Stripe en modo de prueba.
- Revisa la carpeta en Drive, el correo y la tarjeta en Trello.

## Riesgos y notas

- Si el cliente paga dos veces, se crean dos carpetas. Puedes buscar por sesión antes de crear.
- El correo menciona una fecha de inicio. Si la manejas en otro lugar, quítala del texto.
- Tiempo estimado: 2 a 3 horas.
