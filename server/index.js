import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.json({ status: 'ok', time: Date.now() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
