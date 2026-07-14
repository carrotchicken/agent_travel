// ============================================================
// Markdown 渲染工具（AI 回复展示）
// 使用 marked 解析 + DOMPurify 消毒，防止 XSS
// ============================================================
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  breaks: true,
  gfm: true
})

/**
 * 将 Markdown 文本转为安全的 HTML
 * @param {string} text - 原始 Markdown 文本
 * @returns {string} 消毒后的 HTML
 */
export function renderMarkdown(text) {
  if (!text) return ''
  const html = marked.parse(text)
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true }
  })
}
