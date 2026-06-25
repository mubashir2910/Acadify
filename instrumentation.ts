import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs'

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const exporter = new OTLPLogExporter({
      url: 'https://us.i.posthog.com/otlp/v1/logs',
      headers: {
        Authorization: 'Bearer phc_ut8Qy7fGm8X8DeKaxjUpR9scV7aipyppDZVmpE3aiVwL',
      },
    })

    const loggerProvider = new LoggerProvider({
      resource: resourceFromAttributes({
        'service.name': 'my-nextjs-app',
      }),
      processors: [new SimpleLogRecordProcessor(exporter)],
    })

    // make the logger available globally
    ;(globalThis as any).__posthogLogger = loggerProvider.getLogger('my-nextjs-app')
  }
}
