import http from 'node:http'

const PORT = process.env.PORT || 3001

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok' }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
