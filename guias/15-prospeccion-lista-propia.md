# 15 · Prospección con lista propia y opción de baja

## Para qué sirve

Hacer prospección por correo es una de las formas más baratas de vender, pero es fácil cruzar la línea del spam. Esta guía trata la prospección como una lista propia, con consentimiento o base legal confirmada, con límite diario y con opción de baja. Sirve a ventas B2B pequeñas y a emprendedores que contactan a personas que ya mostraron interés.

**Alternativa que se descarta:** extraer correos de Google Maps u otros directorios sin permiso. Va contra los términos de esos servicios y, en muchos países, contra la ley de protección de datos.

## Qué hace el proceso

1. **Se activa** de lunes a viernes a las 10:00.
2. **Lee** la pestaña `Prospectos`.
3. **Filtra** solo los contactos que cumplen:
   - `estado` igual a `nuevo`,
   - `consentimiento` igual a `si`,
   - email con arroba.
4. **Limita** a 20 contactos por ejecución.
5. **Redacta** un correo corto y personal con IA. El system message prohíbe inventar datos de la empresa y obliga a incluir la frase de baja.
6. **Lee** el JSON generado. Si la IA no lo entrega bien, no envía nada.
7. **Envía** el correo.
8. **Marca** el contacto como `contactado` en la hoja, para no repetir.

## Piezas que usa

- Schedule Trigger.
- Google Sheets (lectura y actualización).
- Filter.
- Limit (máximo de elementos).
- Agente de IA con DeepSeek Chat.
- Code (lectura del JSON).
- Gmail.
- Error Trigger y Gmail.

## Antes de empezar

- Confirma tu base legal. En muchos países, escribir a un contacto frío sin consentimiento es spam. Revisa la ley de tu país antes de activar.
- Hoja `Prospectos`: `nombre`, `email`, `estado` (`nuevo`/`contactado`), `consentimiento` (`si`/`no`).
- Llena la columna de consentimiento solo con personas que te lo dieron o con quienes ya tienes relación.

## Cómo construirlo a mano

1. **Schedule Trigger**, cron `0 10 * * 1-5`.
2. **Google Sheets**, Read, pestaña `Prospectos`.
3. **Filter**: `estado` igual a `nuevo`, `consentimiento` igual a `si`, `email` contiene `@`.
4. **Limit**: 20 elementos, primeros.
5. **Agente de IA**, modelo DeepSeek Chat, temperatura 0.4. System message: correo corto en español, máximo 80 palabras, sin inventar datos de la empresa, termina con la frase de baja, responde solo JSON con `asunto` y `cuerpo`.
6. **Code**: parsea el JSON. Si no hay `cuerpo`, no devuelve nada.
7. **Gmail**, Send, con `asunto` y `cuerpo` del JSON, al email del contacto.
8. **Google Sheets**, Append or Update, coincidencia por `email`, estado `contactado`.
9. **Error Trigger** con alerta.

## Cómo construirlo con la IA de n8n Cloud

> Crea un flujo "Prospección con lista propia". Schedule Trigger de lunes a viernes a las 10:00. Lee la pestaña "Prospectos" de Google Sheets. Filter: estado igual a "nuevo", consentimiento igual a "si", email con "@". Limit de 20 elementos. Agente de IA con modelo DeepSeek Chat, temperatura 0.4, y system message: escribe un correo corto en español de máximo 80 palabras, sin inventar datos de la empresa, que termine con "Si no quieres recibir más correos, responde BAJA y no te escribiremos de nuevo"; responde solo JSON con asunto y cuerpo. Code que parsea el JSON y no devuelve nada si falta el cuerpo. Gmail envía el correo al email del contacto. Google Sheets actualiza la fila por email con estado "contactado". Error Trigger con alerta a PEGAR_TU_EMAIL. Flujo inactivo.

## Credenciales y valores que reemplazar

- `PEGAR_ID_DE_LA_HOJA`, `PEGAR_TU_EMAIL`.
- Google Sheets, Gmail, DeepSeek o créditos de IA.

## Pruebas

- Prueba con dos contactos de prueba que sean tuyos. Revisa el correo y que la fila cambie a `contactado`.
- Ejecuta dos veces. El segundo run no debe enviar a los mismos contactos.

## Riesgos y notas

- Antes de activar, confirma la base legal y responde con honestidad a quien pida baja. Si pide baja, quítalo de la lista.
- La IA puede escribir mal el tono. Revisa las primeras diez salidas antes de dejarlo correr solo.
- El límite de 20 por día es una práctica de buena reputación para tu dominio de correo, no un requisito legal.
- Tiempo estimado: 2 horas.
