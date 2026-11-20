# 05 · Extracción de datos de facturas PDF a Gastos

## Para qué sirve

Los proveedores te mandan facturas en PDF por correo. Pasarlas a mano a una hoja de gastos es lento y genera errores. Este flujo toma cada PDF, extrae el texto, usa IA para sacar proveedor, fecha, total e impuesto, y los guarda en tu hoja. Si los datos están incompletos, los manda a una pestaña de revisión. Sirve para contabilidad básica y control de gastos.

## Qué hace el proceso

1. **Detecta** correos no leídos con asunto que contenga "factura" y un PDF adjunto.
2. **Descarga** el adjunto (queda como `attachment_0`).
3. **Extrae el texto** del PDF con el nodo Extract From File.
4. **Pide a la IA** que devuelva JSON con proveedor, fecha, total, impuesto y moneda. Si un dato no aparece, debe poner `null`.
5. **Separa** los campos y valida que haya proveedor, fecha y total mayor que cero.
6. Si está completo, lo guarda en `Gastos`. Si no, lo guarda en `Revisar gastos`.
7. **Marca el correo como leído** para no procesarlo dos veces.

## Piezas que usa

- Gmail Trigger con adjuntos.
- Extract From File (PDF).
- Agente de IA con modelo DeepSeek Chat.
- Edit Fields (Set) con `JSON.parse`.
- IF.
- Google Sheets (dos destinos).
- Gmail (marcar leído) y alertas.

## Antes de empezar

- Hoja con pestañas `Gastos` y `Revisar gastos`. Columnas: `proveedor`, `fecha`, `total`, `impuesto`, `moneda`.
- Solo funciona con PDF que tengan texto seleccionable. Las fotos escaneadas no se leen en esta versión.

## Cómo construirlo a mano

1. **Gmail Trigger**, filtro "no leídos" y búsqueda `subject:factura has:attachment filename:pdf`. Activa la descarga de adjuntos y verifica que el nombre de la propiedad sea `attachment_0`. Si no encuentras la opción de descarga, revisa las opciones del trigger o la documentación del nodo en tu versión de n8n.
2. **Extract From File**, operación "PDF", campo binario `attachment_0`.
3. **Agente de IA**, con modelo DeepSeek Chat, temperatura 0.1. En el prompt pasa el texto `{{ $json.text }}` y el asunto. En el system message pide JSON con `proveedor`, `fecha` (AAAA-MM-DD), `total`, `impuesto`, `moneda`, y prohíbe inventar datos.
4. **Edit Fields (Set)** que lee `JSON.parse($json.output)` y crea cada campo. Usa tipo número para `total` e `impuesto`.
5. **IF**: `proveedor` no vacío, `total` mayor que 0, `fecha` no vacía.
6. Rama verdadera: **Google Sheets** (Append, `Gastos`) → **Gmail** (marcar como leído).
7. Rama falsa: **Google Sheets** (Append, `Revisar gastos`) → **Gmail** (marcar como leído).
8. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Extracción de facturas PDF a Gastos". Gmail Trigger cada minuto para correos no leídos con asunto "factura" y adjunto PDF, con descarga de adjuntos activada (propiedad attachment_0). Extract From File en modo PDF sobre attachment_0. Agente de IA con modelo DeepSeek Chat, temperatura 0.1, y system message: extrae proveedor, fecha AAAA-MM-DD, total numérico, impuesto numérico y moneda; responde solo JSON; si un dato no aparece usa null; no inventes. Set que parsea el JSON. IF: proveedor no vacío, total mayor que 0, fecha no vacía. Si es válido, añade a la pestaña "Gastos" de Google Sheets; si no, a "Revisar gastos". Ambas ramas marcan el correo como leído. Error Trigger que envía alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_TU_EMAIL`.
- Gmail, Google Sheets, DeepSeek o créditos de IA.

## Pruebas

- Envía a tu correo una factura PDF de prueba con asunto "Factura de prueba". Revisa la fila en `Gastos`.
- Envía un PDF sin total visible. Debe ir a `Revisar gastos`.

## Riesgos y notas

- La IA puede leer mal un número. Revisa siempre los montos antes de declarar impuestos.
- Este flujo no sustituye la contabilidad. Úsalo como captura de datos.
- Si no aparecen adjuntos, revisa la configuración de descarga del Gmail Trigger.
- Tiempo estimado: 2 a 3 horas, por la parte del adjunto.
