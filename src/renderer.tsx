import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body style={{ overflow: 'hidden' }}>{children}</body>
    </html>
  )
})
