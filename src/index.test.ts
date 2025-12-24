import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { createLoggerMiddleware, formatTime, loggerMiddleware } from './index'

describe('Base', async () => {
  const app = new Hono()
  app.use(loggerMiddleware())

  app.get('/test', async (c) => {
    c.var.log.info('test log')
    return c.text('ok')
  })

  it('Request', async () => {
    const req = new Request('http://localhost/test')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})

describe('Custom', async () => {
  const app = new Hono()
  let requestCount = 0
  const { loggerMiddleware } = createLoggerMiddleware({
    generator(c) {
      return `req-${++requestCount}`
    },
    getIpAddress(c) {
      return `192.168.1.1`
    },
    logWithRequestId: false,
  })
  app.use(loggerMiddleware)

  app.get('/test', async (c) => {
    c.var.log.info('test log')
    return c.text('ok')
  })

  it('Request', async () => {
    const req = new Request('http://localhost/test')
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})

describe('Custom Ip Header', async () => {
  const app = new Hono()
  const { loggerMiddleware } = createLoggerMiddleware({
    getIpFromHeaders: ['X-Custom-Ip', 'X-Forwarded-For'],
  })
  app.use(loggerMiddleware)

  app.get('/test', async (c) => {
    c.var.log.info('test log')
    return c.text('ok')
  })

  it('Request', async () => {
    const req = new Request('http://localhost/test', {
      headers: {
        'X-Custom-Ip': '192.168.1.1',
      },
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  it('Request', async () => {
    const req = new Request('http://localhost/test', {
      headers: {
        'X-Forwarded-For': '192.168.3.1,192.168.3.2',
      },
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})

describe('Test formatTime', () => {
  it('Test ns', async () => {
    expect(formatTime([0, 123])).toBe('123ns')
  })
  it('Test us', async () => {
    expect(formatTime([0, 1234])).toBe('1.23us')
  })
  it('Test ms', async () => {
    expect(formatTime([0, 123456789])).toBe('123.46ms')
  })
  it('Test second', async () => {
    expect(formatTime([1, 0])).toBe('1.0s')
  })
  it('Test error', async () => {
    expect(formatTime([])).toBe('0ms')
  })
})
