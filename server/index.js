import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const publicDir = path.join(process.cwd(), 'public')
console.log('Public dir:', publicDir, 'exists:', fs.existsSync(publicDir))

const app = express()
app.use(cors())
app.use(express.json())

// 手动静态文件服务 + SPA 回退
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  const hasExt = path.extname(req.path)
  const filePath = hasExt
    ? path.join(publicDir, req.path)
    : path.join(publicDir, 'index.html')
  try {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath)
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
    res.end(data)
  } catch {
    try {
      const data = fs.readFileSync(path.join(publicDir, 'index.html'))
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(data)
    } catch {
      next()
    }
  }
})

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function callDeepSeek(messages, stream = false) {
  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 4096
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API 错误: ${res.status} - ${err}`)
  }

  return res
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body

    const systemMsg = {
      role: 'system',
      content: `你是一位专业的英语学习助手，服务对象是英语专业学生。
你擅长解答英语语法、词汇、写作、阅读、翻译、语言学等方面的问题。
回答要求：
1. 全面深入，不仅讲"是什么"，还要讲"为什么"
2. 提供例句帮助理解
3. 对容易混淆的知识点进行对比辨析
4. 用中文讲解，专业术语附英文原文
5. 回答结构清晰，使用Markdown格式组织内容（加粗用**文字**，表格用标准markdown表格，列表用-或1.）方便后续整理成学习笔记`
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const response = await callDeepSeek([systemMsg, ...messages], true)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`)
            }
          } catch {
            // 忽略无法解析的行
          }
        }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Chat error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

app.post('/api/summarize', async (req, res) => {
  try {
    const { messages } = req.body

    const systemMsg = {
      role: 'system',
      content: `你是一位专业的英语学习笔记整理助手。你的任务是将一段英语学习对话精简总结为一个结构化的知识点。

请按以下格式输出：

**标题**：一个简洁的知识点标题（10字以内）

**核心知识点**：
- 用3-5个要点精炼总结学到的核心内容
- 每个要点一句话说清

**例句/示例**（如有）：
- 保留对话中关键的例句

**易错提醒**（如有）：
- 指出容易犯的错误或需要特别注意的地方

要求：
1. 精简！只保留最关键的、有助于复习的内容
2. 不要复述对话过程，直接输出知识精华
3. 适合日后快速翻阅复习`
    }

    const response = await callDeepSeek([systemMsg, ...messages])
    const data = await response.json()
    const summary = data.choices[0].message.content

    const titleMatch = summary.match(/\*\*标题\*\*[：:]\s*(.+)/)
    const title = titleMatch ? titleMatch[1].trim() : '未命名知识点'

    res.json({ title, summary })
  } catch (err) {
    console.error('Summarize error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/conversations', async (req, res) => {
  try {
    const { title, messages } = req.body

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ title })
      .select()
      .single()

    if (convErr) throw convErr

    const msgsToInsert = messages.map((m) => ({
      conversation_id: conv.id,
      role: m.role,
      content: m.content
    }))

    const { error: msgErr } = await supabase
      .from('messages')
      .insert(msgsToInsert)

    if (msgErr) throw msgErr

    res.json({ id: conv.id })
  } catch (err) {
    console.error('Save conversation error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/knowledge', async (req, res) => {
  try {
    const { conversation_id, title, summary, user_notes, category_id } = req.body

    const { data, error } = await supabase
      .from('knowledge_items')
      .insert({
        conversation_id,
        title,
        summary,
        user_notes: user_notes || null,
        category_id: category_id || null
      })
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (err) {
    console.error('Save knowledge error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/knowledge', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json(data)
  } catch (err) {
    console.error('Get knowledge error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/knowledge/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('knowledge_items')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error

    res.json({ success: true })
  } catch (err) {
    console.error('Delete knowledge error:', err)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend + Static on port ${PORT}`)
})
