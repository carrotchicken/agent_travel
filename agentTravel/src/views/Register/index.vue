<script setup>
// ============================================================
// 注册页面
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
const confirmPassword = ref('')
const isLoading = ref(false)

// 注册
const handleRegister = async () => {
  if (!username.value.trim()) {
    showToast('请输入用户名')
    return
  }
  if (username.value.trim().length < 2) {
    showToast('用户名至少 2 个字符')
    return
  }
  if (!password.value || password.value.length < 6) {
    showToast('密码至少 6 位')
    return
  }
  if (password.value !== confirmPassword.value) {
    showToast('两次密码不一致')
    return
  }

  isLoading.value = true
  try {
    const res = await authStore.register(username.value.trim(), password.value)
    if (res.success) {
      showToast('注册成功')
      router.replace('/')
    } else {
      showToast(res.error || '注册失败')
    }
  } catch {
    showToast('网络错误，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 跳转登录
const goLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="page-container">
    <van-nav-bar title="注册" left-arrow @click-left="router.back" />

    <div class="auth-content">
      <div class="auth-logo">✨</div>
      <h2 class="auth-title">创建账号</h2>

      <form class="auth-form" @submit.prevent="handleRegister">
        <van-field
          v-model="username"
          label="用户名"
          placeholder="2-20 个字符"
          clearable
          autocomplete="username"
        />
        <van-field
          v-model="password"
          type="password"
          label="密码"
          placeholder="至少 6 位"
          clearable
          autocomplete="new-password"
        />
        <van-field
          v-model="confirmPassword"
          type="password"
          label="确认密码"
          placeholder="再次输入密码"
          clearable
          autocomplete="new-password"
          @keyup.enter="handleRegister"
        />
        <van-button
          size="large"
          block
          class="register-btn primary-gradient-btn"
          :loading="isLoading"
          native-type="submit"
        >
          注册
        </van-button>
      </form>

      <div class="auth-footer">
        已有账号？<span class="link" @click="goLogin">立即登录</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  background: #fff8f5;
  min-height: 100vh;
}

.auth-content {
  padding: 40px 24px;
  text-align: center;
}

.auth-logo {
  font-size: 64px;
  margin-bottom: 12px;
  margin-top: 20px;
}

.auth-title {
  font-size: 22px;
  color: #1a1a1a;
  margin-bottom: 8px;
  font-weight: 700;
}

.auth-form {
  text-align: left;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  padding: 8px 0;
  box-shadow: 0 4px 20px rgba(255, 107, 53, 0.08);
}

.auth-form :deep(.van-field) {
  padding: 14px 16px;
}

.auth-form :deep(.van-field__label) {
  color: #666;
  font-size: 14px;
  width: 80px;
}

.auth-form :deep(.van-cell::after) {
  left: 16px;
  right: 16px;
  border-color: #f5f5f5;
}

.register-btn {
  margin-top: 28px;
  height: 46px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 23px !important;
}

.auth-footer {
  margin-top: 24px;
  font-size: 14px;
  color: #999;
}

.link {
  color: #ff6b35;
  cursor: pointer;
  font-weight: 500;
}
</style>
