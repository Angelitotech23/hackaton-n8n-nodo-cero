import { workflow, node, trigger, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const recibirLead = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Recibir lead',
    parameters: { httpMethod: 'POST', path: 'captura-lead-v2', responseMode: 'onReceived' },
  },
  output: [{ body: { nombre: 'Ana', email: 'ana@example.com', telefono: '555-0100', origen: 'web' } }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar datos',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'n', name: 'nombre', value: expr('{{ ($json.body?.nombre ?? $json.nombre ?? "").toString().trim() }}'), type: 'string' },
          { id: 'e', name: 'email', value: expr('{{ ($json.body?.email ?? $json.email ?? "").toString().trim().toLowerCase() }}'), type: 'string' },
          { id: 't', name: 'telefono', value: expr('{{ ($json.body?.telefono ?? $json.telefono ?? "").toString() }}'), type: 'string' },
          { id: 'o', name: 'origen', value: expr('{{ $json.body?.origen ?? $json.origen ?? "web" }}'), type: 'string' },
          { id: 'f', name: 'recibido', value: expr('{{ $now.toISO() }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ nombre: 'Ana', email: 'ana@example.com', telefono: '555-0100', origen: 'web', recibido: '2026-11-19T10:00:00' }]
});

const datosCompletos = ifElse({
  version: 2.2,
  config: {
    name: '¿Datos completos?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.nombre }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { leftValue: expr('{{ $json.email }}'), operator: { type: 'string', operation: 'contains' }, rightValue: '@' },
        ],
        combinator: 'and',
      },
    },
  },
});

const guardarLead = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Guardar lead válido',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Leads" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ nombre: 'Ana', email: 'ana@example.com', estado: 'nuevo' }]
});

const guardarRevision = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Guardar para revisar',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Revisar" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ nombre: '', email: 'sin-datos', estado: 'revisar' }]
});

const avisoSlack = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Aviso a Slack',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#leads" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Nuevo lead: {{ $("Normalizar datos").item.json.nombre }} ({{ $("Normalizar datos").item.json.email }}) desde {{ $("Normalizar datos").item.json.origen }}'),
    },
    credentials: { slackApi: newCredential('Slack') },
    onError: 'continueRegularOutput',
  },
  output: [{ ok: true }]
});

const bienvenida = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Email de bienvenida',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Normalizar datos").item.json.email }}'),
      subject: 'Gracias por tu interés',
      message: expr('Hola {{ $("Normalizar datos").item.json.nombre }}. Recibimos tu solicitud y te contactamos en menos de 24 horas.'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Captura de leads v2' } }]
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

const nota = sticky('## Captura de leads v2\nWebhook → normaliza → valida. Válidos: Sheets Leads, Slack y bienvenida. Inválidos: pestaña Revisar. Errores: alerta por email. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('captura-leads-v2', 'Captura de leads v2')
  .add(nota)
  .add(recibirLead)
  .to(normalizar)
  .to(datosCompletos
    .onTrue(guardarLead.to(avisoSlack.to(bienvenida)))
    .onFalse(guardarRevision))
  .add(errorAlerta)
  .to(alertarFallo);
