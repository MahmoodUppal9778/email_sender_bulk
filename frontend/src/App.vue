<template>
  <div class="min-h-screen">
    <template v-if="authStore.isAuthenticated">
      <Sidebar />
      <main class="pl-64">
        <Navbar />
        <div class="p-6">
          <router-view />
        </div>
      </main>
    </template>
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/layout/Sidebar.vue'
import Navbar from '@/components/layout/Navbar.vue'

const authStore = useAuthStore()

onMounted(() => {
  authStore.checkAuth()
})
</script>
