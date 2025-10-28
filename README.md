# @seepine/hono-logger

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

适用于 Hono 框架的日志中间件，基于 pino 实现，支持请求日志、请求 ID 跟踪等功能。

## 特性

- 🚀 基于 pino 实现，性能优异
- 📝 支持请求日志记录
- 🔍 支持请求 ID 跟踪
- ⚙️ 高度可配置
- 🎨 开发环境下美化输出

## 安装

```bash
# npm
npm install @seepine/hono-logger

# yarn
yarn add @seepine/hono-logger

# pnpm
pnpm add @seepine/hono-logger

# bun
bun add @seepine/hono-logger
```

## 使用

### 基础用法

```typescript
import { Hono } from 'hono'
import { loggerMiddleware } from '@seepine/hono-logger'

const app = new Hono()

// 使用默认配置
app.use('*', loggerMiddleware())

// 或者使用自定义配置
app.use(
  '*',
  loggerMiddleware({
    level: 'debug',
  }),
)
```

### 配置选项

```typescript
export type HonoLoggerOptions = {
  // 日志级别
  level?: 'error' | 'warn' | 'info' | 'debug' | 'trace'

  // 是否在日志中记录请求 ID
  logWithRequestId?: boolean // 默认: true

  // 是否启用请求日志
  requestLogEnable?: boolean // 默认: true

  // 请求 ID 的请求头名称
  requestIdHeaderName?: string // 默认: 'X-Request-Id'

  // 响应时间的请求头名称
  responseTimeHeaderName?: string // 默认: 'X-Response-Time'

  // 自定义请求 ID 生成器
  generator?: (c: Context) => string

  // 自定义获取 IP 地址的方法
  getIpAddress?: (c: Context) => string

  // 从请求头获取 IP 地址的字段列表
  getIpFromHeaders?: string[] // 默认: ['X-Real-Ip', 'X-Forwarded-For']

  // pino 输出流
  stream?: pino.DestinationStream

  // pino-pretty 配置选项
  prettyOptions?: PrettyOptions
}
```

### Bun 运行时获取 IP 地址示例

```typescript
import { getConnInfo } from 'hono/bun'

app.use(
  '*',
  loggerMiddleware({
    getIpAddress: c => {
      const info = getConnInfo(c)
      return info.remote.address
    },
  }),
)
```

<!-- Refs -->

[npm-version-src]: https://img.shields.io/npm/v/@seepine/hono-logger
[npm-version-href]: https://www.npmjs.com/package/@seepine/hono-logger
[npm-downloads-src]: https://img.shields.io/npm/dm/@seepine/hono-logger
[npm-downloads-href]: https://npmjs.com/package/@seepine/hono-logger
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@seepine/hono-logger
[bundle-href]: https://bundlephobia.com/result?p=@seepine/hono-logger
[license-src]: https://img.shields.io/github/license/seepine/hono-logger.svg
[license-href]: https://github.com/seepine/hono-logger/blob/main/LICENSE
