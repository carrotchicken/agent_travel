import pluginVue from 'eslint-plugin-vue'
import js from '@eslint/js'

export default [
  // 基础 JS 推荐规则
  js.configs.recommended,

  // Vue 3 推荐规则（包括模板、响应式等）
  ...pluginVue.configs['flat/recommended'],

  {
    // 全局忽略
    ignores: ['dist/**', 'node_modules/**', '*.config.js']
  },

  {
    // 项目自定义规则
    rules: {
      // 不强制要求 props 默认值（Vue 3 的 defineProps 用默认值很自然）
      'vue/require-default-prop': 'off',
      // 允许多单词组件名或单单词（如 App.vue）
      'vue/multi-word-component-names': 'off',
      // 允许 console（开发阶段需要调试）
      'no-console': 'off',
      // 允许未使用变量（开发阶段常见）
      'no-unused-vars': 'warn',
      // 缩进用 2 空格（和 Prettier 保持一致）
      'indent': ['warn', 2],
      // 单引号
      'quotes': ['warn', 'single'],
      // 分号可省略
      'semi': ['warn', 'never']
    }
  }
]
