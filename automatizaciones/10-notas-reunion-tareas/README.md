# 10 · Notas de reunión a tareas en Trello con IA

## Para qué sirve

Las reuniones terminan con acuerdos que nadie anota. Este flujo recibe el texto de la reunión (notas o transcripción), usa IA para sacar las acciones con responsable y fecha, y crea una tarjeta en Trello por cada una. Sirve a equipos pequeños, socios, freelancers con clientes y cualquiera que pierda compromisos.

## Qué hace el proceso

1. **Recibe** el texto por un webhook: notas escritas, o una transcripción pegada.
2. **Normaliza** el texto (recorta a 12 000 caracteres como máximo) y el nombre de la reunión.
3. **Extrae** con un agente de IA un arreglo JSON de acciones: `tarea`, `responsable` y `fecha`. La IA tiene la regla de no inventar tareas.
4. **Valida** el JSON con un nodo Code. Si el formato no sirve, no crea nada y te deja el texto crudo para revisión.
5. **Crea** una tarjeta en Trello por cada acción, con el responsable y la fecha en el nombre.
6. Si algo falla, te llega una alerta.

## Piezas que usa

- Webhook.
- Edit Fields (Set).
- Agente de IA con modelo DeepSeek Chat.
- Code (validación de JSON).
- Trello.
- Error Trigger y Gmail.

## Antes de empezar

- Un tablero de Trello con una lista de "Pendientes". Copia su id.
- Una forma de enviar el texto: un atajo en el móvil, un formulario o una automatización de tu herramienta de reuniones.
- Si tienes transcripciones de Zoom o Meet, pégalas en el webhook o conecta la transcripción a Google Drive en una versión futura.

## Cómo construirlo a mano

1. **Webhook**, método `POST`, ruta `nota-reunion-v2`.
2. **Edit Fields (Set)**: `texto` (recortado a 12 000 caracteres) y `reunion` (nombre de la reunión).
3. **Agente de IA** con modelo DeepSeek Chat, temperatura 0.1. En el system message pide un arreglo JSON de objetos con `tarea`, `responsable` y `fecha`, y que no invente acciones. Si no hay acciones, debe responder `[]`.
4. **Code**: quita bloques de código markdown, intenta `JSON.parse`. Si falla, devuelve un error. Si funciona, devuelve un elemento por tarea.
5. **Trello**, recurso "Card", operación "Create", con `name` = tarea, responsable y fecha, y `listId` = tu lista.
6. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Notas de reunión a tareas". Webhook POST en la ruta "nota-reunion-v2". Set que normaliza texto (recortado a 12 000 caracteres) y reunion. Agente de IA con modelo DeepSeek Chat, temperatura 0.1, y system message: extrae solo acciones concretas; responde solo un arreglo JSON con tarea, responsable y fecha; si no hay acciones responde []; no inventes. Code que quita fences de markdown, parsea el JSON en try/catch, y devuelve un elemento por tarea con valores por defecto "sin asignar" y "sin fecha". Trello crea una tarjeta por elemento en la lista PEGAR_ID_DE_LISTA_TRELLO con nombre "tarea (responsable, fecha)". Error Trigger que envía alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LISTA_TRELLO`, `PEGAR_TU_EMAIL`.
- Trello, DeepSeek o créditos de IA.

## Pruebas

- Envía una nota con dos acciones y responsables. Revisa las tarjetas en Trello.
- Envía un texto sin acciones. No debe crear nada.
- Envía algo que no sea una lista. Debe fallar con un mensaje claro y no crear tarjetas.

## Riesgos y notas

- La IA puede asignar responsables mal si el nombre no aparece en la nota. Revisa las tarjetas.
- Entrada por webhook en esta versión. Conectar Drive o Zoom es la siguiente mejora.
- Tiempo estimado: 2 horas.
