import { workflow, node, trigger, languageModel, newCredential, expr, sticky } from '@n8n/workflow-sdk';

const diaHabil = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Lunes a viernes 10:00',
    parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 10 * * 1-5' }] } },
  },
  output: [{}]
});

const leerProspectos = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Leer lista de prospectos',
    parameters: {
      operation: 'read',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Prospectos" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
  },
  output: [{ nombre: 'Café Centro', email: 'contacto@example.com', estado: 'nuevo', consentimiento: 'si' }]
});

const validos = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: {
    name: 'Solo nuevos con consentimiento y email',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.estado }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'nuevo' },
          { leftValue: expr('{{ $json.consentimiento }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'si' },
          { leftValue: expr('{{ $json.email }}'), operator: { type: 'string', operation: 'contains' }, rightValue: '@' },
        ],
        combinator: 'and',
      },
    },
  },
  output: [{ nombre: 'Café Centro', email: 'contacto@example.com', estado: 'nuevo', consentimiento: 'si' }]
});

const lote = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: {
    name: 'Máximo 20 por día',
    parameters: { maxItems: 20, keep: 'firstItems' },
  },
  output: [{ nombre: 'Café Centro', email: 'contacto@example.com', estado: 'nuevo', consentimiento: 'si' }]
});

const modeloIA = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
  version: 1,
  config: {
    name: 'Modelo DeepSeek',
    parameters: { model: 'deepseek-chat', options: { temperature: 0.4 } },
  },
});

const redactar = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Redactar email personalizado',
    parameters: {
      promptType: 'define',
      text: expr('Nombre del prospecto: {{ $json.nombre }}'),
      options: {
        systemMessage: 'Escribe un email corto (máximo 80 palabras) en español, personal y sin promesas exageradas. No inventes datos de la empresa del prospecto. Termina con: "Si no quieres recibir más correos, responde BAJA y no te escribiremos de nuevo." Responde solo JSON: {"asunto":"texto","cuerpo":"texto"}.',
      },
    },
    subnodes: { model: modeloIA },
  },
  output: [{ output: '{"asunto":"Una propuesta para Café Centro","cuerpo":"Hola..."}' }]
});

const parsear = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Leer email generado',
    parameters: {
      jsCode: 'const crudo = String($input.first().json.output || "").replace(/```json|```/g, "").trim();\nlet d = null;\ntry { d = JSON.parse(crudo); } catch (e) { d = null; }\nif (!d || !d.cuerpo) return [];\nreturn [{ json: { asunto: d.asunto, cuerpo: d.cuerpo, email: $("Máximo 20 por día").first().json.email, nombre: $("Máximo 20 por día").first().json.nombre } }];',
    },
    onError: 'continueRegularOutput',
  },
  output: [{ asunto: 'Una propuesta', cuerpo: 'Hola...', email: 'contacto@example.com', nombre: 'Café Centro' }]
});

const enviar = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar email',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $json.email }}'),
      subject: expr('{{ $json.asunto }}'),
      message: expr('{{ $json.cuerpo }}'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const marcarContactado = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Marcar como contactado',
    parameters: {
      operation: 'appendOrUpdate',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Prospectos" }}'),
      columns: {
        mappingMode: 'defineBelow',
        value: { email: expr('{{ $("Leer email generado").item.json.email }}'), estado: 'contactado' },
        matchingColumns: ['email'],
      },
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ email: 'contacto@example.com', estado: 'contactado' }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Prospección v2' } }]
});

const alertarFallo = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Alerta de fallo',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ "PEGAR_TU_EMAIL" }}'),
      subject: expr('Falló: {{ $json.workflow.name }}'),
      message: expr('Error: {{ $json.execution.error.message }}. Revisa la ejecución en n8n.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
  },
  output: [{ id: '1' }]
});

const nota = sticky('## Prospección v2 (lista propia)\nSolo contactos con consentimiento o base legal confirmada. Lunes a viernes 10:00 → filtra nuevos con consentimiento y email válido → máximo 20 por día → IA redacta email corto con opción de baja → envía → marca "contactado" para no repetir. Antes de activar, confirma la base legal de contacto en tu país. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL.', [], { color: 3 });

export default workflow('prospeccion-v2', 'Prospección con lista propia v2')
  .add(nota)
  .add(diaHabil)
  .to(leerProspectos)
  .to(validos)
  .to(lote)
  .to(redactar)
  .to(parsear)
  .to(enviar)
  .to(marcarContactado)
  .add(errorAlerta)
  .to(alertarFallo);
