import { workflow, node, trigger, languageModel, newCredential, expr, ifElse, sticky } from '@n8n/workflow-sdk';

const reciboNuevo = trigger({
  type: 'n8n-nodes-base.gmailTrigger',
  version: 1.2,
  config: {
    name: 'Correo con recibo',
    parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] }, filters: { readStatus: 'unread', q: 'subject:recibo' } },
    credentials: { gmailOAuth2: newCredential('Gmail') },
  },
  output: [{ id: '18c0rc', subject: 'Recibo de compra', from: 'tienda@example.com', snippet: 'Total 250 MXN, IVA 40, 10/nov/2026' }]
});

const modeloIA = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
  version: 1,
  config: {
    name: 'Modelo DeepSeek',
    parameters: { model: 'deepseek-chat', options: { temperature: 0.1 } },
  },
});

const extraer = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Extraer datos del recibo',
    parameters: {
      promptType: 'define',
      text: expr('Asunto: {{ $json.subject }}\nRemitente: {{ $json.from }}\nTexto: {{ $json.snippet }}'),
      options: {
        systemMessage: 'Extrae datos de un recibo de compra. Responde solo JSON: {"fecha":"AAAA-MM-DD|null","comercio":"texto|null","total":número|null,"impuesto":número|null,"categoria":"comida|transporte|software|oficina|otro"}. No inventes: si un dato no está, usa null.',
      },
    },
    subnodes: { model: modeloIA },
  },
  output: [{ output: '{"fecha":"2026-11-10","comercio":"Tienda","total":250,"impuesto":40,"categoria":"oficina"}' }]
});

const parsear = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Leer JSON de la IA',
    parameters: {
      jsCode: 'const crudo = String($input.first().json.output || "").replace(/```json|```/g, "").trim();\nlet d = {};\ntry { d = JSON.parse(crudo); } catch (e) { d = {}; }\nreturn [{ json: { fecha: d.fecha ?? null, comercio: d.comercio ?? null, total: d.total ?? null, impuesto: d.impuesto ?? null, categoria: d.categoria ?? "otro", asunto: $("Correo con recibo").first().json.subject } }];',
    },
    onError: 'continueRegularOutput',
  },
  output: [{ fecha: '2026-11-10', comercio: 'Tienda', total: 250, impuesto: 40, categoria: 'oficina', asunto: 'Recibo' }]
});

const completo = ifElse({
  version: 2.2,
  config: {
    name: '¿Recibo completo?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.total }}'), operator: { type: 'number', operation: 'gt' }, rightValue: 0 },
          { leftValue: expr('{{ $json.fecha }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { leftValue: expr('{{ $json.comercio }}'), operator: { type: 'string', operation: 'notEmpty' } },
        ],
        combinator: 'and',
      },
    },
  },
});

const guardarGasto = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Guardar en Gastos',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Gastos" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ comercio: 'Tienda', total: 250 }]
});

const guardarRevisar = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Guardar en Revisar gastos',
    parameters: {
      operation: 'append',
      documentId: expr('{{ "PEGAR_ID_DE_LA_HOJA" }}'),
      sheetName: expr('{{ "Revisar gastos" }}'),
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets') },
    onError: 'continueRegularOutput',
  },
  output: [{ comercio: null }]
});

const marcarLeido = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Marcar recibo como leído',
    parameters: {
      resource: 'message',
      operation: 'markAsRead',
      messageId: expr('{{ $("Correo con recibo").item.json.id }}'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: '18c0rc' }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Gastos v2' } }]
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

const nota = sticky('## Gastos desde recibos v2\nGmail con asunto "recibo" → IA extrae datos en JSON → Código valida el formato → si el recibo está completo: Gastos; si no: Revisar gastos. Marca el correo como leído. Lee el texto del correo; los PDF adjuntos aún no se leen en esta versión. Reemplazar PEGAR_ID_DE_LA_HOJA y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('gastos-recibos-v2', 'Gastos desde recibos v2')
  .add(nota)
  .add(reciboNuevo)
  .to(extraer)
  .to(parsear)
  .to(completo
    .onTrue(guardarGasto.to(marcarLeido))
    .onFalse(guardarRevisar.to(marcarLeido)))
  .add(errorAlerta)
  .to(alertarFallo);
