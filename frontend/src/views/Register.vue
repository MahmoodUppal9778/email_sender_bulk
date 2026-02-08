<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 py-12 px-4">
    <div class="max-w-md w-full">
      <div class="card">
        <div class="card-body">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900">Create Account</h1>
            <p class="text-gray-600 mt-2">Start your outreach journey</p>
          </div>

          <form @submit.prevent="handleRegister">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="input"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  class="input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  v-model="form.password"
                  type="password"
                  class="input"
                  placeholder="••••••••"
                  minlength="6"
                  required
                />
              </div>

              <div v-if="error" class="text-red-600 text-sm">
                {{ error }}
              </div>

              <button
                type="submit"
                class="w-full btn btn-primary"
                :disabled="loading"
              >
                {{ loading ? 'Creating account...' : 'Create Account' }}
              </button>
            </div>
          </form>

          <p class="mt-6 text-center text-sm text-gray-600">
            Already have an account?
            <router-link to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  password: ''
})
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  loading.value = true
  error.value = ''

  try {
    await authStore.register(form.email, form.password, form.name)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to create account'
  } finally {
    loading.value = false
  }
}
</script>
