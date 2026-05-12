/**
 * Single logger per CLAUDE_CODE_PROMPT.md §5.6.
 *
 * Thin wrapper around console so we can swap to Axiom / Logflare in one
 * place. Every record carries route + user id (or 'anonymous'). Use:
 *
 *   logger.error('attempt failed', { route: '/api/x', userId, err })
 *
 * TODO: ship logs to Axiom / Logflare and key by request id once we wire
 * a request-id middleware.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  route?: string
  userId?: string | null
  requestId?: string
  [k: string]: unknown
}

function format(level: LogLevel, message: string, ctx?: LogContext): string {
  const time = new Date().toISOString()
  const who = ctx?.userId ?? 'anonymous'
  const route = ctx?.route ?? '-'
  return `[${time}] ${level.toUpperCase()} ${route} user=${who} :: ${message}`
}

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  const line = format(level, message, ctx)
  const extra = ctx ? { ...ctx } : undefined
  if (extra) {
    delete extra.route
    delete extra.userId
    delete extra.requestId
  }
  if (level === 'error') {
    console.error(line, extra && Object.keys(extra).length ? extra : '')
  } else if (level === 'warn') {
    console.warn(line, extra && Object.keys(extra).length ? extra : '')
  } else {
    console.log(line, extra && Object.keys(extra).length ? extra : '')
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),
}
