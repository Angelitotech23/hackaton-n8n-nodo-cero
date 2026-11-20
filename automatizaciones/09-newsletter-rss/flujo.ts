import { workflow, node, trigger, newCredential, expr, sticky } from '@n8n/workflow-sdk';

const semanal = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Lunes 8:00',
    parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 8 * * 1' }] } },
  },
  output: [{}]
});

const leerFeeds = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: 'Leer feed RSS',
    parameters: { url: expr('{{ "PEGAR_URL_RSS_1" }}') },
    onError: 'continueRegularOutput',
  },
  output: [{ title: 'Artículo de ejemplo', link: 'https://example.com/post', pubDate: '2026-11-17T08:00:00Z' }]
});

const ultimos7 = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: {
    name: 'Solo últimos 7 días',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.pubDate }}'), operator: { type: 'dateTime', operation: 'after' }, rightValue: expr('{{ $now.minus({ days: 7 }).toISO() }}') },
          { leftValue: expr('{{ $json.link }}'), operator: { type: 'string', operation: 'startsWith' }, rightValue: 'http' },
        ],
        combinator: 'and',
      },
    },
  },
  output: [{ title: 'Artículo de ejemplo', link: 'https://example.com/post' }]
});

const enviarBoletin = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar boletín semanal',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ "PEGAR_EMAIL_O_LISTA" }}'),
      subject: expr('Boletín semanal: {{ $input.all().length }} artículos'),
      message: expr('{{ $input.all().map(i => i.json.title + " - " + i.json.link).join("\\n") }}'),
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    executeOnce: true,
    onError: 'continueRegularOutput',
  },
  output: [{ id: '1' }]
});

const errorAlerta = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Si el flujo falla' },
  output: [{ execution: { error: { message: 'Error de prueba' } }, workflow: { name: 'Newsletter RSS v2' } }]
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

const nota = sticky('## Newsletter RSS v2\nLunes 8:00 → lee feed → deja artículos de los últimos 7 días → un solo email con títulos y enlaces. Sin artículos nuevos, no envía nada. Revisa derechos del contenido que reutilizas y cita la fuente. Reemplazar PEGAR_URL_RSS_1, PEGAR_EMAIL_O_LISTA y PEGAR_TU_EMAIL. Si quieres resumen con IA, es una mejora siguiente.', [], { color: 4 });

export default workflow('newsletter-rss-v2', 'Newsletter RSS v2')
  .add(nota)
  .add(semanal)
  .to(leerFeeds)
  .to(ultimos7)
  .to(enviarBoletin)
  .add(errorAlerta)
  .to(alertarFallo);
