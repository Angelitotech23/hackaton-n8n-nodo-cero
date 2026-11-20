import { workflow, node, trigger, languageModel, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const lunes = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Lunes 7:00',
    parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 7 * * 1' }] } },
  },
  output: [{}]
});

const leerMetricas = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Leer hoja Métricas',
    parameters: {
      operation: 'read',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Métricas" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
  },
  output: [{ semana: '2026-11-16', ventas: 1200, leads: 18, cobros: 900 }]
});

const ultimas2 = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Preparar datos de dos semanas',
    executeOnce: true,
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'j', name: 'datos', value: expr('{{ JSON.stringify($input.all().slice(-2).map(i => i.json)) }}'), type: 'string' },
          { id: 'c', name: 'filas', value: expr('{{ $input.all().length }}'), type: 'number' },
        ],
      },
    },
  },
  output: [{ datos: '[{"semana":"2026-11-16","ventas":1200}]', filas: 1 }]
});

const hayDatos = ifElse({
  version: 2.2,
  config: {
    name: '¿Hay al menos 2 semanas?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.filas }}'), operator: { type: 'number', operation: 'gte' }, rightValue: 2 }],
        combinator: 'and',
      },
    },
  },
});

const modeloIA = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
  version: 1,
  config: {
    name: 'Modelo DeepSeek',
    parameters: { model: 'deepseek-chat', options: { temperature: 0.1 } },
  },
});

const redactar = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Redactar resumen semanal',
    parameters: {
      promptType: 'define',
      text: expr('Métricas (JSON): {{ $json.datos }}'),
      options: {
        systemMessage: 'Redacta un resumen semanal breve en español. Usa SOLO los números del JSON, sin inventar ni estimar. Compara la última semana con la anterior: indica subida o bajada en porcentaje. Máximo 6 líneas.',
      },
    },
    subnodes: { model: modeloIA },
  },
  output: [{ output: 'Ventas subieron 10% frente a la semana anterior.' }]
});

const enviarReporte = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar reporte',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ "PEGAR_TU_EMAIL" }}'),
      subject: 'Reporte semanal',
      message: expr('{{ $json.output }}'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const avisoSinDatos = node({
  type: 'n8n-nodes-base.slack',
  version: 2.7,
  config: {
    name: 'Aviso: faltan datos',
    parameters: {
      select: 'channel',
      channelId: expr('{{ "#reportes" }}'),
      resource: 'message',
      operation: 'post',
      text: 'Reporte semanal omitido: la hoja Métricas tiene menos de 2 semanas de datos.',
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
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Reporte semanal v2' } }]
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

const nota = sticky('## Reporte semanal v2\nLunes 7:00 → lee Métricas → toma las 2 últimas semanas → si hay 2 o más: IA redacta resumen usando solo esos números → email. Si hay menos de 2 semanas: aviso en Slack, sin reporte. La IA no inventa cifras. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL. Ojo: la hoja debe estar ordenada por fecha.', [], { color: 4 });

export default workflow('reporte-semanal-v2', 'Reporte semanal v2')
  .add(nota)
  .add(lunes)
  .to(leerMetricas)
  .to(ultimas2)
  .to(hayDatos
    .onTrue(redactar.to(enviarReporte))
    .onFalse(avisoSinDatos))
  .add(errorAlerta)
  .to(alertarFallo);
