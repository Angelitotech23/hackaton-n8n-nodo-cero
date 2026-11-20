import { workflow, node, trigger, languageModel, newCredential, expr, sticky } from '@n8n/workflow-sdk';

const notaReunion = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Recibir nota o transcripción',
    parameters: { httpMethod: 'POST', path: 'nota-reunion-v2', responseMode: 'onReceived' },
  },
  output: [{ body: { texto: 'Juan envía propuesta el viernes. Ana revisa presupuesto antes del 25.', reunion: 'Seguimiento cliente X' } }]
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalizar nota',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 't', name: 'texto', value: expr('{{ String($json.body?.texto ?? $json.texto ?? "").trim().slice(0, 12000) }}'), type: 'string' },
          { id: 'r', name: 'reunion', value: expr('{{ String($json.body?.reunion ?? $json.reunion ?? "Reunión").trim() }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{ texto: 'Juan envía propuesta el viernes.', reunion: 'Seguimiento cliente X' }]
});

const modeloIA = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
  version: 1,
  config: {
    name: 'Modelo DeepSeek',
    parameters: { model: 'deepseek-chat', options: { temperature: 0.1 } },
  },
});

const extraerTareas = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Extraer tareas con IA',
    parameters: {
      promptType: 'define',
      text: expr('Reunión: {{ $json.reunion }}\nNota:\n{{ $json.texto }}'),
      options: {
        systemMessage: 'Extrae solo acciones concretas de la nota. Responde únicamente un array JSON. Cada elemento: {"tarea": texto corto en infinitivo, "responsable": nombre o null, "fecha": AAAA-MM-DD o texto como viene o null}. Si no hay acciones responde []. No inventes tareas.',
      },
    },
    subnodes: { model: modeloIA },
  },
  output: [{ output: '[{"tarea":"Enviar propuesta","responsable":"Juan","fecha":"viernes"}]' }]
});

const separarTareas = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Separar tareas (con validación)',
    parameters: {
      jsCode: 'const crudo = String($input.first().json.output || "").replace(/```json|```/g, "").trim();\nlet lista = [];\ntry { lista = JSON.parse(crudo); } catch (e) { return [{ json: { error: "IA devolvió formato no válido", crudo } }]; }\nif (!Array.isArray(lista)) return [{ json: { error: "No es una lista", crudo } }];\nreturn lista.filter(t => t && t.tarea).map(t => ({ json: { tarea: t.tarea, responsable: t.responsable ?? "sin asignar", fecha: t.fecha ?? "sin fecha" } }));',
    },
    onError: 'continueRegularOutput',
  },
  output: [{ tarea: 'Enviar propuesta', responsable: 'Juan', fecha: 'viernes' }]
});

const crearTarjeta = node({
  type: 'n8n-nodes-base.trello',
  version: 1,
  config: {
    name: 'Crear tarjeta por tarea',
    parameters: {
      resource: 'card',
      operation: 'create',
      name: expr('{{ $json.tarea }} ({{ $json.responsable }}, {{ $json.fecha }})'),
      listId: expr('{{ "PEGAR_ID_DE_LISTA_TRELLO" }}'),
    },
    credentials: { trelloApi: newCredential('Trello') },
    onError: 'continueRegularOutput',
  },
  output: [{ id: 'card1' }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Notas a tareas v2' } }]
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

const nota = sticky('## Notas de reunión a tareas v2\nWebhook recibe texto (transcripción o notas) → normaliza → IA extrae acciones en JSON → valida (si el JSON está mal, no crea nada) → una tarjeta Trello por acción. Entrada por webhook; conectar Zoom/Meet o Drive después. Reemplazar PEGAR_ID_DE_LISTA_TRELLO y PEGAR_TU_EMAIL.', [], { color: 4 });

export default workflow('notas-tareas-v2', 'Notas de reunión a tareas v2')
  .add(nota)
  .add(notaReunion)
  .to(normalizar)
  .to(extraerTareas)
  .to(separarTareas)
  .to(crearTarjeta)
  .add(errorAlerta)
  .to(alertarFallo);
