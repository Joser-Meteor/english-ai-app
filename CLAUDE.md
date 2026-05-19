# English AI App

## 项目概述
AI 驱动的英语学习 PWA 应用（React + Vite + TypeScript + Tailwind CSS v4），部署在 Railway。

## 功能
- 对话页面：与 DeepSeek AI 深入讨论英语问题，支持多题目分隔
- 知识库页面：浏览、搜索、删除已保存的知识点，导出 Word/PDF
- 设置页面：后端状态检测、API 配置说明

## 技术栈
- 前端：React 19, React Router 6, Vite 8, Tailwind CSS v4, vite-plugin-pwa
- 后端：Express 5 (server/index.js), Supabase (数据库)
- AI：DeepSeek API (纯文本，不支持图片)
- 认证：Supabase Auth (邮箱注册登录)
- 部署：Railway (服务端在 server/ 目录)

## 关键文件
- `src/pages/ChatPage.tsx` — 核心对话页（聊天、流式SSE、多题分隔保存）
- `src/pages/KnowledgePage.tsx` — 知识库（搜索、展开、删除、导出）
- `src/pages/SettingsPage.tsx` — 设置页
- `src/components/Layout.tsx` — 页面布局（h-dvh 移动端适配）
- `src/components/MessageBubble.tsx` — 消息气泡 + 分隔线渲染
- `src/lib/ChatContext.tsx` — 消息状态管理
- `src/lib/api.ts` — API 请求封装（apiFetch + apiStream）
- `server/index.js` — Express 后端（API路由、静态文件）
- `server/rls.sql` — Supabase RLS 策略
- `vite.config.ts` — 构建配置（PWA、代理）
- `scripts/generate-icons.mjs` — PWA 图标生成脚本

## 重要约定
- Message 角色有三种：user、assistant、separator（分隔线，不发给AI）
- 移动端布局使用 h-dvh + overflow-hidden + flex-col（输入栏固定在底部）
- 知识库读写走服务端 API（apiFetch），不用 Supabase 直连（RLS问题）
- 流式对话在发送前过滤 separator：`messages.filter(m => m.role !== 'separator')`
- 只在新用户消息时自动滚到底部，AI 流式输出时不强制滚动（用户可自由浏览）
- PWA 图标更新后手机需删除旧图标重新添加

## 用户信息
- 用户是编程小白，在中国大陆，使用 Windows + VSCode
- 部署在 Railway，代码托管在 GitHub：Joser-Meteor/english-ai-app
- DeepSeek API 通过服务端中转（server/.env 配置）
