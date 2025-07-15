<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Markdown MindMap</h1>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Input -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Markdown Input</h2>
          <textarea
            v-model="markdown"
            class="w-full h-64 p-4 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="Enter your markdown here..."
          />
        </div>
        
        <!-- Output -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">MindMap Output</h2>
          <div
            ref="mindmapContainer"
            class="w-full h-64 border border-gray-300 rounded-md"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

// Reactive data
const markdown = ref(`# Hello World
## Getting Started
- This is a test
- Another item
### Sub-items
- Sub item 1
- Sub item 2
## Features
- Markdown parsing
- Interactive mindmap
- Real-time updates`)

const mindmapContainer = ref(null)
let markmap = null

// Initialize markmap
onMounted(() => {
  if (mindmapContainer.value) {
    markmap = Markmap.create(mindmapContainer.value)
    updateMindmap()
  }
})

// Watch for markdown changes
watch(markdown, updateMindmap)

// Update mindmap function
function updateMindmap() {
  if (!markmap) return
  
  try {
    const transformer = new Transformer()
    const { root } = transformer.transform(markdown.value)
    markmap.setData(root)
  } catch (error) {
    console.error('Error updating mindmap:', error)
  }
}
</script>