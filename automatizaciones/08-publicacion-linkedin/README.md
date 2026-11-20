# 08 · Publicación programada en LinkedIn desde hoja

## Para qué sirve

Publicar con regularidad es clave para vender por contenido, pero escribir y acordarse cada día consume tiempo. Este flujo publica en LinkedIn los textos que dejaste preparados en una hoja, en la fecha que indicaste. Sirve a emprendedores y empresas pequeñas que quieren presencia constante sin estar pendientes.

## Qué hace el proceso

1. **Revisa cada hora** la pestaña `Contenido`.
2. **Filtra** solo las filas que cumplen tres condiciones:
   - estado `listo`,
   - fecha igual a hoy,
   - texto no vacío.
3. **Publica** el texto en LinkedIn (perfil o página de empresa).
4. **Marca** la fila como `publicado` en la hoja, para que no se repita.
5. Si la publicación falla, te llega un correo con el motivo probable: token vencido o permisos de la app.

## Piezas que usa

- Schedule Trigger (cada hora).
- Google Sheets (lectura y actualización).
- Filter.
- LinkedIn (crear publicación).
- Gmail (aviso de error).
- Error Trigger.

## Antes de empezar

- Una cuenta de LinkedIn con permiso para publicar. Para publicar en página de empresa necesitas la app aprobada por LinkedIn.
- Hoja con pestaña `Contenido`: `id`, `fecha` (AAAA-MM-DD), `texto`, `estado`, `enlace`.
- **Importante:** el token de LinkedIn caduca cada 60 días. Anota la fecha en que lo conectaste y renuévalo.

## Cómo construirlo a mano

1. **Schedule Trigger**, cada hora.
2. **Google Sheets**, operación "Read", pestaña `Contenido`.
3. **Filter** con tres condiciones: `estado` igual a `listo`, `fecha` igual a `{{ $now.toFormat("yyyy-MM-dd") }}`, `texto` no vacío.
4. **LinkedIn**, recurso "Post", operación "Create", con `person` (el id de tu perfil o página) y `text` = `{{ $json.texto }}`.
5. **Google Sheets**, operación "Append or Update", pestaña `Contenido`, columna de coincidencia `id`, y cambia `estado` a `publicado`.
6. Conecta un aviso por correo a la salida de error del nodo LinkedIn.
7. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Publicación programada en LinkedIn". Schedule Trigger cada hora. Lee la pestaña "Contenido" de Google Sheets. Filter: estado igual a "listo", fecha igual a hoy en formato AAAA-MM-DD, texto no vacío. Publica en LinkedIn con recurso post, operación create, person PEGAR_ID_DE_PERSONA_O_PAGINA y texto desde el campo texto. Luego actualiza la fila en Google Sheets con operación appendOrUpdate, coincidencia por id, y estado "publicado". Si la publicación falla, envía correo a PEGAR_TU_EMAIL explicando que puede ser token vencido o permisos. Error Trigger con alerta. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_ID_DE_PERSONA_O_PAGINA`, `PEGAR_TU_EMAIL`.
- LinkedIn y Google Sheets.

## Pruebas

- Escribe una fila de prueba con fecha de hoy y estado `listo`. Ejecuta el flujo manualmente.
- Publica primero como borrador o en un espacio privado si tu cuenta lo permite.

## Riesgos y notas

- LinkedIn limita la automatización. Lee sus términos y no publiques contenido repetido o engañoso.
- Si el flujo corre cada hora y el texto es el mismo, puede publicarse varias veces si el estado no cambia. El paso de marcar como publicado evita eso.
- Tiempo estimado: 2 a 4 horas, más la espera de aprobación de la app.
