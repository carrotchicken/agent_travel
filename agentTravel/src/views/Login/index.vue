<script setup>
// ============================================================
// 登录页面
// ============================================================
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表单数据
const username = ref('')
const password = ref('')
const isLoading = ref(false)

// 登录
const handleLogin = async () => {
  if (!username.value.trim()) {
    showToast('请输入用户名')
    return
  }
  if (!password.value || password.value.length < 6) {
    showToast('密码至少 6 位')
    return
  }

  isLoading.value = true
  try {
    const res = await authStore.login(username.value.trim(), password.value)
    if (res.success) {
      showToast('登录成功')
      // 跳回来源页或首页
      const redirect = router.currentRoute.value.query.redirect || '/'
      router.replace(redirect)
    } else {
      showToast(res.error || '登录失败')
    }
  } catch {
    showToast('网络错误，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 跳转注册
const goRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="page-container">
    <van-nav-bar title="登录" left-arrow @click-left="router.back" />

    <div class="auth-content">
      <!-- Logo -->
      <div class="auth-logo">🏖️</div>
      <h2 class="auth-title">智能旅游助手</h2>

      <!-- 表单 -->
      <form class="auth-form" @submit.prevent="handleLogin">
        <van-field
          v-model="username"
          label="用户名"
          placeholder="请输入用户名"
          clearable
          autocomplete="username"
        />
        <van-field
          v-model="password"
          type="password"
          label="密码"
          placeholder="请输入密码（至少6位）"
          clearable
          autocomplete="current-password"
          @keyup.enter="handleLogin"
        />
        <van-button
          size="large"
          block
          class="login-btn primary-gradient-btn"
          :loading="isLoading"
          native-type="submit"
        >
          登录
        </van-button>
      </form>

      <!-- 注册入口 -->
      <div class="auth-footer">
        还没有账号？<span class="link" @click="goRegister">立即注册</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Claymorphism 黏土风格 */
.page-container {
  background: #f3efe8;
  min-height: 100vh;
}

.auth-content {
  padding: 40px 24px;
  text-align: center;
}

.auth-logo {
  font-size: 72px;
  margin-bottom: 12px;
  margin-top: 20px;
  /* 黏土悬浮感 */
  filter: drop-shadow(0 6px 12px rgba(130, 188, 200, 0.2));
}

.auth-title {
  font-size: 22px;
  color: #4a4a5a;
  margin-bottom: 8px;
  font-weight: 700;
}

.auth-subtitle {
  font-size: 14px;
  color: #a0a0b0;
  margin-bottom: 36px;
}

/* 黏土表单卡片 */
.auth-form {
  text-align: left;
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  padding: 8px 0;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.05),
    0 2px 8px rgba(0, 0, 0, 0.03);
  position: relative;
}

.auth-form::after {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  right: 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(130, 188, 200, 0.15), transparent);
}

.auth-form :deep(.van-field) {
  padding: 14px 16px;
}

.auth-form :deep(.van-field__label) {
  color: #6e6e7e;
  font-size: 14px;
  width: 70px;
}

.auth-form :deep(.van-cell::after) {
  left: 16px;
  right: 16px;
  border-color: #f0e8e0;
}

/* 黏土输入框凹槽 */
.auth-form :deep(.van-field__control) {
  background: #ede8e0;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.04),
    inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

.login-btn {
  margin-top: 28px;
  margin-bottom: 8px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 28px !important;
}

.auth-footer {
  margin-top: 24px;
  font-size: 14px;
  color: #a0a0b0;
}

.link {
  color: #82bcc8;
  cursor: pointer;
  font-weight: 600;
}
</style>
