<template>
  <div class="config-form">
    <h2>[ 用户配置 ]</h2>
    <div class="config-content">
      <div class="form-group">
        <label for="token">Token:</label>
        <div class="token-container">
          <input
            id="token"
            v-model="userStore.user.token"
            type="text"
            placeholder="your.token.here"
            class="form-control"
          />
          <button
            v-if="isTauri"
            @click="autoGetToken"
            class="btn-auto-token"
            :disabled="isLoggingIn"
          >
            {{ isLoggingIn ? '登录中...' : '自动获取' }}
          </button>
        </div>
        <small>{{ isTauri ? '点击"自动获取"打开CAS登录窗口' : '需要在小程序中获取' }}</small>
        <small v-if="loginError" class="error-text">{{ loginError }}</small>
      </div>

      <div class="form-group">
        <label for="datetime">锻炼时间:</label>
        <div class="datetime-container">
          <input
            id="datetime"
            v-model="localDateTime"
            type="datetime-local"
            step="1"
            class="form-control datetime-input"
            @change="updateDateTime"
          />
          <button @click="setNow" class="btn-now">现在</button>
        </div>
      </div>

      <div class="form-group">
        <label for="route-select">运动场地:</label>
        <select
          id="route-select"
          v-model="userStore.user.route"
          class="form-control"
          @change="onRouteChange"
        >
          <option value="" disabled>请选择场地</option>
          <option v-for="routeName in routeStore.routeNames" :key="routeName" :value="routeName">
            {{ routeName }}
          </option>
        </select>
        <small>选择您的锻炼场地</small>
      </div>

      <div class="images-section">
        <ImageUploader
          id="start"
          title="开始图片"
          @file-selected="(file) => userStore.updateStartImage(file)"
        />
        <ImageUploader
          id="finish"
          title="结束图片"
          @file-selected="(file) => userStore.updateFinishImage(file)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouteStore } from '@/stores/route'
import ImageUploader from './ImageUploader.vue'
import { isTauriEnvironment } from '@/utils/tauriEnv'

const userStore = useUserStore()
const routeStore = useRouteStore()

const localDateTime = ref('')
const isTauri = ref(false)
const isLoggingIn = ref(false)
const loginError = ref('')

function formatDateTimeLocal(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

function updateDateTime() {
  if (localDateTime.value) {
    userStore.updateDateTime(new Date(localDateTime.value).toISOString())
  }
}

function setNow() {
  const now = new Date().toISOString()
  userStore.updateDateTime(now)
  localDateTime.value = formatDateTimeLocal(now)
}

function onRouteChange() {
  console.log('UserConfigForm: Route changed to:', userStore.user.route)
}

async function autoGetToken() {
  if (isLoggingIn.value) return

  isLoggingIn.value = true
  loginError.value = ''

  try {
    const { openLoginWindow } = await import('@/services/loginService')
    const result = await openLoginWindow()

    if (result.success && result.token) {
      userStore.updateToken(result.token)
      console.log('Token获取成功')
    } else {
      loginError.value = result.error || '获取Token失败'
    }
  } catch (error) {
    console.error('Auto login error:', error)
    loginError.value = error instanceof Error ? error.message : '登录过程出错'
  } finally {
    isLoggingIn.value = false
  }
}

onMounted(async () => {
  localDateTime.value = formatDateTimeLocal(userStore.user.dateTime)
  await routeStore.loadRoutes()

  isTauri.value = isTauriEnvironment()
})
</script>

<style scoped>
.config-form {
  padding: 0;
  background: var(--color-surface);
  margin: 0;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.config-content {
  padding: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group:last-child {
  margin-bottom: 0;
}

@media (min-width: 640px) {
  .config-content {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 18px;
  }

  h2 {
    font-size: 20px;
    padding: 18px 25px 15px;
  }

  .form-control {
    padding: 12px 15px;
    font-size: 15px;
  }

  label {
    font-size: 14px;
  }

  small {
    font-size: 13px;
  }

  .btn-now {
    padding: 8px 16px;
    font-size: 13px;
  }

  .btn-auto-token {
    padding: 8px 16px;
    font-size: 13px;
  }
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: var(--color-text);
  text-transform: uppercase;
  font-size: 13px;
  letter-spacing: 1px;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface-interactive);
  color: var(--color-text);
  font-size: 14px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  outline: none;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    box-shadow 0.2s;
  box-sizing: border-box;
}

.token-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.token-container .form-control {
  flex: 1;
  min-width: 0;
}

.datetime-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.datetime-input {
  flex: 1;
  min-width: 180px;
  max-width: none;
}

/* iOS Safari specific fixes */
@supports (-webkit-touch-callout: none) {
  .datetime-input {
    -webkit-appearance: none;
    -moz-appearance: textfield;
    appearance: none;
  }
}

@media (max-width: 320px) {
  .datetime-input {
    min-width: 140px;
  }
}

.form-control:focus {
  border-color: var(--color-primary);
}

small {
  display: block;
  margin-top: 6px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.error-text {
  color: var(--color-error, #ff6b6b);
}

.btn-now,
.btn-auto-token {
  padding: 6px 12px;
  background: var(--color-primary);
  color: var(--color-background);
  border: 1px solid var(--color-primary);
  cursor: pointer;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
  transition: all 0.2s;
  flex-shrink: 0;
  height: fit-content;
  white-space: nowrap;
}

.btn-now:hover,
.btn-auto-token:hover {
  background: var(--color-background);
  color: var(--color-primary);
}

.btn-auto-token:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.images-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-top: 20px;
}

@media (min-width: 640px) {
  .images-section {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 25px;
  }
}

h2 {
  font-size: 18px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 15px 0;
  color: var(--color-text);
  text-align: center;
  padding: 15px 20px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-surface-raised);
}
</style>
