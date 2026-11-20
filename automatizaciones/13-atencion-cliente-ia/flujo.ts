import { workflow, node, trigger, languageModel, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const nuevoTicket = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Nuevo ticket de soporte',
    parameters: { httpMethod: 'POST', path: 'soporte-ticket-v2', responseMode: 'onReceived' },
  },
  output: [{ body: { nombre: 'Ana', email: 'ana@example.com', mensaje: 'No puedo entrar a mi cuenta desde ayer' } }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar ticket',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'n', name: 'nombre', value: expr('{{ String($json.body?.nombre ?? "").trim() }}'), type: 'string' },
          { id: 'e', name: 'email', value: expr('{{ String($json.body?.email ?? "").trim().toLowerCase() }}'), type: 'string' },
          { id: 'm', name: 'mensaje', value: expr('{{ String($json.body?.mensaje ?? "").trim().slice(0, 4000) }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ nombre: 'Ana', email: 'ana@example.com', mensaje: 'No puedo entrar' }]
});

const modeloIA = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
  version: 1,
  config: {
    name: 'Modelo DeepSeek',
    parameters: { model: 'deepseek-chat', options: { temperature: 0.2 } },
  },
});

const clasificar = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Clasificar y redactar borrador',
    parameters: {
      promptType: 'define',
      text: expr('Mensaje del cliente: {{ $json.mensaje }}'),
      options: {
        systemMessage: 'Clasifica el mensaje en: duda, queja, urgente o venta. Escribe un borrador de respuesta corto y amable, sin prometer plazos ni reembolsos. Responde solo JSON: {"categoria":"duda|queja|urgente|venta","borrador":"texto"}. Urgente = no puede acceder, cobro incorrecto, problema de seguridad o pérdida de servicio.',
      },
    },
    subnodes: { model: modeloIA },
  },
  output: [{ output: '{"categoria":"urgente","borrador":"Hola, revisamos tu acceso."}' }]
});

const parsear = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Leer clasificación',
    parameters: {
      jsCode: 'const crudo = String($input.first().json.output || "").replace(/```json|```/g, "").trim();\nlet d = {};\ntry { d = JSON.parse(crudo); } catch (e) { d = { categoria: "sin clasificar", borrador: "" }; }\nconst base = $("Normalizar ticket").first().json;\nreturn [{ json: { ...base, categoria: d.categoria ?? "sin clasificar", borrador: d.borrador ?? "" } }];',
    },
    onError: 'continueRegularOutput',
  },
  output: [{ nombre: 'Ana', email: 'ana@example.com', mensaje: 'No puedo entrar', categoria: 'urgente', borrador: 'Hola' }]
});

const registrar = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Registrar ticket en Sheets',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Tickets" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ categoria: 'urgente' }]
});

const esUrgente = ifElse({
  version: 2.2,
  config: {
    name: '¿Es urgente?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.categoria }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'urgente' }],
        combinator: 'and',
      },
    },
  },
});

const avisoSlack = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Aviso urgente en Slack',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#soporte-urgente" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Ticket urgente de {{ $json.email }}: {{ $json.mensaje }}. Borrador listo en Sheets Tickets.'),
    },
    credentials: { slackApi: newCredential('Slack') },
    onError: 'continueRegularOutput',
  },
  output: [{ ok: true }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Soporte v2' } }]
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

const nota = sticky('## Atención al cliente v2\nWebhook de ticket → normaliza → IA clasifica y redacta BORRADOR → registra en Sheets Tickets → si es urgente, avisa en Slack. Nunca responde al cliente solo: el borrador queda en la hoja para que lo revises. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('soporte-tickets-v2', 'Atención al cliente v2')
  .add(nota)
  .add(nuevoTicket)
  .to(normalizar)
  .to(clasificar)
  .to(parsear)
  .to(registrar)
  .to(esUrgente.onTrue(avisoSlack))
  .add(errorAlerta)
  .to(alertarFallo);
