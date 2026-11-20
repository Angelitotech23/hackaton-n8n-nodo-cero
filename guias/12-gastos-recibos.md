# 12 · Registro de gastos desde recibos por correo

## Para qué sirve

Los recibos de compra llegan por correo (tiendas en línea, facturas de software, transporte) y se pierden. Este flujo lee los correos con asunto "recibo", extrae fecha, comercio, total, impuesto y categoría con IA, y los guarda en una hoja de gastos. Sirve a freelancers y pequeños negocios que declaran impuestos y necesitan control de gastos.

## Qué hace el proceso

1. **Detecta** correos no leídos con asunto "recibo" (revisa cada minuto).
2. **Lee** el asunto, el remitente y el texto breve del correo.
3. **Extrae** con IA un JSON con fecha, comercio, total, impuesto y categoría (comida, transporte, software, oficina u otro). Si un dato no aparece, debe poner `null`.
4. **Valida** el JSON con un nodo Code que tolera formatos raros.
5. Si el recibo está completo (total mayor que cero, fecha y comercio), lo guarda en `Gastos`. Si no, lo guarda en `Revisar gastos`.
6. **Marca** el correo como leído.

## Piezas que usa

- Gmail Trigger.
- Agente de IA con modelo DeepSeek Chat.
- Code (lectura del JSON).
- IF.
- Google Sheets (dos destinos).
- Gmail (marcar como leído).
- Error Trigger y Gmail.

## Antes de empezar

- Hoja con pestañas `Gastos` y `Revisar gastos`. Columnas: `fecha`, `comercio`, `total`, `impuesto`, `categoria`, `asunto`.
- Para que el flujo funcione, los recibos deben tener el asunto con la palabra "recibo".

## Cómo construirlo a mano

1. **Gmail Trigger**, filtro "no leídos" y búsqueda `subject:recibo`.
2. **Agente de IA**, modelo DeepSeek Chat, temperatura 0.1. En el prompt pasa asunto, remitente y texto. En el system message pide JSON con los cinco campos y que no invente.
3. **Code**: quita bloques markdown, parsea en `try/catch`, y devuelve un elemento con los campos y el asunto del correo original.
4. **IF**: `total` mayor que 0, `fecha` no vacía, `comercio` no vacío.
5. Rama verdadera: **Google Sheets** (Append, `Gastos`) → **Gmail** (marcar leído).
6. Rama falsa: **Google Sheets** (Append, `Revisar gastos`) → **Gmail** (marcar leído).
7. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Registro de gastos desde recibos". Gmail Trigger cada minuto para correos no leídos con asunto "recibo". Agente de IA con modelo DeepSeek Chat, temperatura 0.1, y system message: extrae fecha AAAA-MM-DD, comercio, total numérico, impuesto numérico y categoría (comida, transporte, software, oficina u otro); responde solo JSON; usa null si falta un dato; no inventes. Code que quita fences de markdown, parsea en try/catch y devuelve los campos más el asunto. IF: total mayor que 0, fecha no vacía y comercio no vacío. Si es válido, añade fila a "Gastos" de Google Sheets; si no, a "Revisar gastos". Ambas ramas marcan el correo como leído. Error Trigger con alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_TU_EMAIL`.
- Gmail, Google Sheets, DeepSeek o créditos de IA.

## Pruebas

- Envíate un correo con asunto "Recibo de prueba" y datos de una compra. Revisa la fila en `Gastos`.
- Envía uno sin total. Debe ir a `Revisar gastos`.

## Riesgos y notas

- Esta versión lee el texto del correo, no el contenido de imágenes ni PDF adjuntos. Si tus recibos vienen en PDF, combina esta guía con la 05.
- La categoría es sugerida. Revisa antes de declarar.
- Tiempo estimado: 1 a 2 horas.
