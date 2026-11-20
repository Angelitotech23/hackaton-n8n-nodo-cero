# 01 · Captura de leads a Sheets, Slack y bienvenida

## Para qué sirve

Cuando alguien llena un formulario de tu web (contacto, cotización, lista de espera), el dato no debe perderse ni quedar en un correo olvidado. Este flujo lo guarda en una hoja de cálculo, avisa al equipo en Slack y le manda un correo de bienvenida al prospecto. Sirve a cualquier negocio que vive de leads: servicios, tiendas, consultorías, inmobiliarias.

## Qué hace el proceso

1. **Recibe** los datos del formulario por un webhook (una dirección que tu formulario llama cada vez que alguien envía).
2. **Normaliza** los datos: quita espacios, pasa el correo a minúsculas, acepta los campos venga como vengan del formulario y pone la fecha de recepción.
3. **Valida** que haya nombre y un correo con arroba.
4. Si los datos están completos:
   - guarda una fila en la pestaña `Leads` de tu hoja,
   - avisa en el canal de Slack `#leads`,
   - envía el correo de bienvenida.
5. Si faltan datos, guarda la fila en la pestaña `Revisar` para que una persona la complete.
6. Si algún paso falla, el flujo sigue con los demás y te llega un correo de alerta.

## Piezas que usa

- Nodo Webhook (recibe el formulario).
- Nodo Set (normaliza).
- Nodo IF (valida).
- Google Sheets (dos operaciones de añadir fila).
- Slack (aviso).
- Gmail (bienvenida y alerta de error).
- Error Trigger (detecta fallos del flujo).

## Antes de empezar

- Una hoja de Google con dos pestañas: `Leads` y `Revisar`. Las columnas recomendadas: `recibido`, `nombre`, `email`, `telefono`, `origen`, `estado`.
- Un canal de Slack llamado `leads`.
- Credenciales en n8n: Google Sheets, Slack y Gmail.

## Cómo construirlo a mano

1. Crea un flujo nuevo. Añade el nodo **Webhook**, método `POST`, ruta `captura-lead-v2`, respuesta "al recibir".
2. Añade un nodo **Edit Fields (Set)** y crea cinco campos: `nombre`, `email`, `telefono`, `origen` y `recibido`. Para `nombre` usa la expresión `{{ ($json.body?.nombre ?? $json.nombre ?? "").toString().trim() }}`. Repite el patrón para los demás. Para `email`, agrega `.toLowerCase()`. Para `recibido`, usa `{{ $now.toISO() }}`.
3. Añade un nodo **IF** con dos condiciones unidas por "y":
   - `nombre` no está vacío,
   - `email` contiene `@`.
4. En la rama verdadera, conecta **Google Sheets** (operación "Append", pestaña `Leads`). En la misma rama, conecta **Slack** (canal `leads`) y después **Gmail** (bienvenida).
5. En la rama falsa, conecta **Google Sheets** a la pestaña `Revisar`.
6. Añade un nodo **Error Trigger** y conéctalo a **Gmail** para enviarte la alerta.
7. Activa "Continue on fail" en Sheets, Slack y Gmail, para que un fallo no detenga el resto.

## Cómo construirlo con la IA de n8n Cloud

Abre n8n Cloud, usa la función de crear flujo con IA y pega este prompt:

> Crea un flujo llamado "Captura de leads". Empieza con un webhook POST en la ruta `captura-lead-v2` que responde al recibir. Normaliza el cuerpo: nombre y email en texto sin espacios, email en minúsculas, teléfono en texto, origen por defecto "web", y fecha de recepción en ISO. Valida con un IF que el nombre no esté vacío y que el email contenga "@". Si es válido, añade la fila a la pestaña "Leads" de Google Sheets, envía un aviso al canal "leads" de Slack y un correo de bienvenida al email del prospecto. Si no es válido, añade la fila a la pestaña "Revisar". Añade un Error Trigger que envíe un correo de alerta a PEGAR_TU_EMAIL. Usa "continue on fail" en Sheets, Slack y Gmail. Deja el flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`: el ID de tu hoja (la parte larga de la URL entre `/d/` y `/edit`).
- `PEGAR_TU_EMAIL`: tu correo para alertas.
- Conecta Google Sheets, Slack y Gmail desde la interfaz de n8n.

## Pruebas

- Envía un formulario de prueba con datos completos. Revisa la fila en `Leads`, el aviso en Slack y el correo.
- Envía uno sin correo. Debe llegar a `Revisar`.
- Cambia temporalmente el ID de la hoja a uno falso. Debe llegar la alerta por correo.

## Riesgos y notas

- El correo de bienvenida es un texto fijo. Si quieres algo más personal, puedes añadir un nodo de IA.
- No deduplica leads que escriben dos veces. Puedes agregar una búsqueda por email antes de guardar.
- Tiempo estimado de construcción: 1 a 2 horas la primera vez.
