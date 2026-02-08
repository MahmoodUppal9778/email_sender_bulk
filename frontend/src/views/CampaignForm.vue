<template>
  <div class="max-w-3xl mx-auto">
    <div class="card">
      <div class="card-header">
        <h2 class="text-lg font-semibold">Create New Campaign</h2>
      </div>
      <div class="card-body">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Basic Info -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">Campaign Details</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
              <input
                v-model="form.name"
                type="text"
                class="input"
                placeholder="Q1 Guest Post Outreach"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                v-model="form.description"
                class="input"
                rows="2"
                placeholder="Brief description of this campaign..."
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Your Name (Sender)</label>
              <input
                v-model="form.senderName"
                type="text"
                class="input"
                placeholder="John Smith"
                required
              />
            </div>
          </div>

          <hr class="border-gray-200" />

          <!-- Email Template -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-medium text-gray-900">Email Template</h3>
              <button 
                type="button" 
                @click="loadDefaultTemplate"
                class="text-sm text-primary-600 hover:text-primary-700"
              >
                Load Default Template
              </button>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
              <input
                v-model="form.emailTemplate.subject"
                type="text"
                class="input"
                placeholder="Collaboration Opportunity with {{site_name}}"
                required
              />
              <p class="text-xs text-gray-500 mt-1">Variables: {{site_name}}, {{domain}}, {{niche}}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email Body (HTML)</label>
              <textarea
                v-model="form.emailTemplate.htmlBody"
                class="input font-mono text-sm"
                rows="12"
                placeholder="<p>Hello,</p>..."
                required
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Plain Text Version</label>
              <textarea
                v-model="form.emailTemplate.textBody"
                class="input font-mono text-sm"
                rows="8"
                placeholder="Hello,..."
                required
              ></textarea>
            </div>
          </div>

          <div v-if="error" class="text-red-600 text-sm">
            {{ error }}
          </div>

          <div class="flex justify-end gap-3">
            <router-link to="/campaigns" class="btn btn-secondary">
              Cancel
            </router-link>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Creating...' : 'Create Campaign' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaigns'

const router = useRouter()
const campaignStore = useCampaignStore()

const form = reactive({
  name: '',
  description: '',
  senderName: '',
  emailTemplate: {
    subject: '',
    htmlBody: '',
    textBody: ''
  }
})

const loading = ref(false)
const error = ref('')

function loadDefaultTemplate() {
  form.emailTemplate.subject = 'Collaboration Opportunity with {{site_name}}'
  form.emailTemplate.htmlBody = `<p>Hello,</p>

<p>I came across <strong>{{site_name}}</strong> ({{domain}}) while researching quality sites in the {{niche}} space, and I was impressed by the content you've published.</p>

<p>My name is {{sender_name}}, and I work with businesses to create valuable, well-researched content. I'd love to explore potential collaboration opportunities with your site.</p>

<p>Specifically, I'm interested in:</p>
<ul>
  <li>Contributing a guest article on a topic relevant to your audience</li>
  <li>Discussing link insertion opportunities in existing content</li>
</ul>

<p>I ensure all content is original, thoroughly researched, and adds genuine value to your readers.</p>

<p>Would you be open to a brief conversation about this?</p>

<p>Best regards,<br>{{sender_name}}</p>

<hr>
<p style="font-size: 12px; color: #888;">This email was sent regarding potential content collaboration. Reply with "unsubscribe" to stop receiving similar emails.</p>`

  form.emailTemplate.textBody = `Hello,

I came across {{site_name}} ({{domain}}) while researching quality sites in the {{niche}} space, and I was impressed by the content you've published.

My name is {{sender_name}}, and I work with businesses to create valuable, well-researched content. I'd love to explore potential collaboration opportunities with your site.

Specifically, I'm interested in:
- Contributing a guest article on a topic relevant to your audience
- Discussing link insertion opportunities in existing content

I ensure all content is original, thoroughly researched, and adds genuine value to your readers.

Would you be open to a brief conversation about this?

Best regards,
{{sender_name}}

---
This email was sent regarding potential content collaboration. Reply with "unsubscribe" to stop receiving similar emails.`
}

async function handleSubmit() {
  loading.value = true
  error.value = ''

  try {
    const campaign = await campaignStore.createCampaign(form)
    router.push(`/campaigns/${campaign._id}`)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to create campaign'
  } finally {
    loading.value = false
  }
}
</script>
