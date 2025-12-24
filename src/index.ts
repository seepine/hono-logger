import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import pino from 'pino'
import PinoPretty, { type PrettyOptions } from 'pino-pretty'
import crypto from 'crypto'

export type Logger = pino.Logger

export type HonoLoggerOptions = {
  level?: 'error' | 'warn' | 'info' | 'debug' | 'trace'
  /**
   * 是否在日志中记录请求id
   * @default true
   */
  logWithRequestId?: boolean
  /**
   * 是否启用请求日志
   * @default true
   */
  requestLogEnable?: boolean
  /**
   * 请求id头名称
   * @default 'X-Request-Id'
   */
  requestIdHeaderName?: string
  /**
   * 响应时间头名称
   * @default 'X-Response-Time'
   */
  responseTimeHeaderName?: string
  /**
   * 请求id生成器，默认 crypto.randomUUID()
   * @param c Context
   * @returns requestId
   */
  generator?: (c: Context) => string
  /**
   * 获取ip地址的方法，若空则从请求头获取
   * @param c Context
   * @returns ip
   *
   * @example
   * ```typescript
   * import { getConnInfo } from 'hono/bun'
   *
   * getIpAddress: (c) => {
   *   const info = getConnInfo(c)
   *   return info.remote.address
   * }
   * `
   */
  getIpAddress?: (c: Context) => string
  /**
   * 从请求头获取ip地址的字段列表，按顺序获取
   * @default 数组 ['X-Real-Ip', 'X-Forwarded-For']
   */
  getIpFromHeaders?: string[]
  /**
   * pino destination stream
   * @default pretty stream
   */
  stream?: pino.DestinationStream
  /**
   * pino pretty options
   */
  prettyOptions?: PrettyOptions
}

export const formatTime = ([diffSec, diffNs]: number[]) => {
  if (diffSec === undefined || diffNs === undefined) return '0ms'
  if (diffSec > 0) {
    return `${diffSec}.${(diffNs / 1000000).toFixed(0)}s`
  }
  if (diffNs < 1000) {
    return `${diffNs}ns`
  }
  if (diffNs < 1000000) {
    return `${(diffNs / 1000).toFixed(2)}us`
  }
  return `${(diffNs / 1000000).toFixed(2)}ms`
}

export const logStream = (options?: PrettyOptions) => {
  const isDev =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['MODE'] !== 'production'
  return PinoPretty({
    colorize: true,
    singleLine: true,
    levelFirst: true,
    sync: isDev,
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
    ignore: 'pid,hostname',
    ...options,
  })
}

const buildOpts = (opts?: HonoLoggerOptions) => {
  return {
    level: opts?.level ?? 'info',
    logWithRequestId: opts?.logWithRequestId ?? true,
    requestLogEnable: opts?.requestLogEnable ?? true,
    requestIdHeaderName: opts?.requestIdHeaderName ?? 'X-Request-Id',
    responseTimeHeaderName: opts?.responseTimeHeaderName ?? 'X-Response-Time',
    generator: opts?.generator ?? (() => crypto.randomUUID()),
    logStream: opts?.stream ?? logStream(opts?.prettyOptions),
    getIpFromHeaders: opts?.getIpFromHeaders ?? [
      'X-Real-Ip',
      'X-Forwarded-For',
    ],
    getIpAddress: opts?.getIpAddress,
  }
}

const getIpAddress = (c: Context, opt: HonoLoggerOptions) => {
  if (opt.getIpAddress !== undefined) {
    return opt.getIpAddress(c)
  }
  if (opt.getIpFromHeaders != undefined) {
    for (const headerName of opt.getIpFromHeaders) {
      const ip = c.req.header(headerName)
      if (ip !== undefined) {
        return ip.indexOf(',') > 0 ? ip.split(',')[0] : ip
      }
    }
  }
  return 'unknown'
}

export const createLoggerMiddleware = (opts?: HonoLoggerOptions) => {
  const opt = buildOpts(opts)
  const log = pino(
    {
      level: opt.level,
    },
    opt.logStream,
  )
  return {
    log: log,
    loggerMiddleware: createMiddleware(async (c, next) => {
      const reqId = opt.generator(c)
      const logger = log.child({ reqId })
      if (opt.requestLogEnable) {
        const ipAddress = getIpAddress(c, opt)
        logger.info({ path: c.req.path, ip: ipAddress }, 'request incoming')
      }
      if (opt.logWithRequestId) {
        c.set('log', logger)
      } else {
        c.set('log', log)
      }
      const start = process.hrtime()
      c.res.headers.set(opt.requestIdHeaderName, reqId)
      await next()
      const diffFormat = formatTime(process.hrtime(start))
      c.res.headers.set(opt.responseTimeHeaderName, `${diffFormat}`)
      if (opt.requestLogEnable) {
        logger.info(
          { status: c.res.status, respTime: `${diffFormat}` },
          'complete request',
        )
      }
    }),
  }
}

export const loggerMiddleware = (opts?: Partial<HonoLoggerOptions>) => {
  return createLoggerMiddleware(opts).loggerMiddleware
}

declare module 'hono' {
  interface ContextVariableMap {
    log: Logger
  }
}
