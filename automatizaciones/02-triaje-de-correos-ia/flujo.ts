import { workflow, node, trigger, languageModel, newCredential, expr, switchCase, sticky } from '@n8n/workflow-sdk';

const correoNuevo = trigger({
  type: 'n8n-nodes-base.gmailTrigger',
  version: 1.2,
  config: {
    name: 'Correo no leído nuevo',
    parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] }, filters: { readStatus: 'unread' } },
    credentials: { gmailOAuth2: newCredential('Gmail') },
  },
  output: [{ id: '18c0ex', subject: 'Pedido de cotización', from: 'cliente@example.com', snippet: 'Hola, quiero cotizar 20 unidades...' }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar correo',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      assignments: {
        assignments: [
          { id: 's', name: 'asunto', value: expr('{{ ($json.subject ?? "").trim() }}'), type: 'string' },
          { id: 'r', name: 'remitente', value: expr('{{ ($json.from ?? "").toLowerCase() }}'), type: 'string' },
          { id: 'x', name: 'extracto', value: expr('{{ ($json.snippet ?? "").slice(0, 800) }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ id: '18c0ex', asunto: 'Pedido de cotización', remitente: 'cliente@example.com', extracto: 'Hola...' }]
});

const modeloIA = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
  version: 1,
  config: {
    name: 'Modelo DeepSeek',
    parameters: { model: 'deepseek-chat', options: { temperature: 0.1 } },
  },
});

const clasificar = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Clasificar correo',
    parameters: {
      promptType: 'define',
      text: expr('Asunto: {{ $json.asunto }}\nRemitente: {{ $json.remitente }}\nTexto: {{ $json.extracto }}'),
      options: {
        systemMessage: 'Clasifica el correo en exactamente una categoría: cliente, proveedor, urgente u otro. Responde solo JSON con los campos categoria (una de esas cuatro palabras) y motivo (máximo 15 palabras). Ejemplo: {"categoria":"cliente","motivo":"pide cotización"}',
      },
    },
    subnodes: { model: modeloIA },
  },
  output: [{ output: '{"categoria":"cliente","motivo":"pide cotización"}' }]
});

const ruta = switchCase({
  version: 3.2,
  config: {
    name: 'Ruta por categoría',
    parameters: {
      rules: {
        values: [
          { outputKey: 'cliente', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' }, conditions: [{ leftValue: expr('{{ $json.output }}'), operator: { type: 'string', operation: 'contains' }, rightValue: 'cliente' }], combinator: 'and' } },
          { outputKey: 'urgente', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' }, conditions: [{ leftValue: expr('{{ $json.output }}'), operator: { type: 'string', operation: 'contains' }, rightValue: 'urgente' }], combinator: 'and' } },
        ],
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'Otro' },
    },
  },
});

const borrador = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Borrador de respuesta a cliente',
    parameters: {
      resource: 'draft',
      operation: 'create',
      subject: expr('Re: {{ $("Normalizar correo").item.json.asunto }}'),
      message: 'Gracias por escribirnos. Revisamos tu solicitud y te respondemos hoy.',
      sendTo: expr('{{ $("Normalizar correo").item.json.remitente }}'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: 'draft1' }]
});

const avisoUrgente = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Aviso de urgente',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#urgentes" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Correo urgente de {{ $("Normalizar correo").item.json.remitente }}: {{ $("Normalizar correo").item.json.asunto }}'),
    },
    credentials: { slackApi: newCredential('Slack') },
    onError: 'continueRegularOutput',
  },
  output: [{ ok: true }]
});

const sinClasificar = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Revisión manual',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#revision" }}'),
      resource: 'message',
      operation: 'post',
      text: expr('Correo sin clasificar, revisar a mano: {{ $("Normalizar correo").item.json.asunto }} de {{ $("Normalizar correo").item.json.remitente }}'),
    },
    credentials: { slackApi: newCredential('Slack') },
    onError: 'continueRegularOutput',
  },
  output: [{ ok: true }]
});

const marcarLeido = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Marcar como leído',
    parameters: {
      resource: 'message',
      operation: 'markAsRead',
      messageId: expr('{{ $("Normalizar correo").item.json.id }}'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '18c0ex' }]
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

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Triaje v2' } }]
});

const nota = sticky('## Triaje de email v2\nGmail no leído → normaliza → IA clasifica (JSON) → Switch: cliente (borrador), urgente (Slack), otro (revisión manual). Todo correo procesado se marca como leído para no repetirlo. Reemplazar PEGAR_TU_EMAIL. Nunca envía respuestas solo.', [], { color: 4 });

export default workflow('triaje-email-v2', 'Triaje de email v2')
  .add(nota)
  .add(correoNuevo)
  .to(normalizar)
  .to(clasificar)
  .to(ruta
    .onCase(0, borrador.to(marcarLeido))
    .onCase(1, avisoUrgente.to(marcarLeido))
    .onCase(2, sinClasificar.to(marcarLeido)))
  .add(errorAlerta)
  .to(alertarFallo);
