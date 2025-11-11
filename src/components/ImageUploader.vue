<template>
  <div class="image-uploader">
    <div class="upload-area">
      <input
        :id="`file-${id}`"
        type="file"
        accept="image/*"
        @change="handleFileChange"
        class="file-input"
      />
      <label 
        :for="`file-${id}`" 
        class="upload-label"
        @drop.prevent="handleDrop"
        @dragover.prevent="handleDragOver"
        @dragenter.prevent="handleDragEnter"
        @dragleave.prevent="handleDragLeave"
        :class="{ 'drag-over': isDragOver }"
      >
        <div v-if="!imageUrl" class="placeholder">
          <span>📷</span>
          <p>{{ title }}</p>
          <small>点击选择或拖拽图片到此处</small>
        </div>
        <img v-else :src="imageUrl" alt="Preview" class="preview" />
      </label>
    </div>
    <p v-if="fileName" class="file-name">{{ fileName }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title: string
  id: string
}

defineProps<Props>()
const emit = defineEmits<{
  fileSelected: [file: File]
}>()

const imageUrl = ref<string>('')
const fileName = ref<string>('')
const isDragOver = ref<boolean>(false)
let dragCounter = 0

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    processFile(file)
  }
}

function processFile(file: File) {
  if (file && file.type.startsWith('image/')) {
    fileName.value = file.name
    imageUrl.value = URL.createObjectURL(file)
    emit('fileSelected', file)
  }
}

// 防止默认行为的通用函数
function preventDefaults(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
}

function handleDrop(event: DragEvent) {
  preventDefaults(event)
  dragCounter = 0
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files[0] && files[0].type.startsWith('image/')) {
    processFile(files[0])
  }
}

function handleDragOver(event: DragEvent) {
  preventDefaults(event)
}

function handleDragEnter(event: DragEvent) {
  preventDefaults(event)
  dragCounter++
  if (dragCounter === 1) {
    isDragOver.value = true
  }
}

function handleDragLeave(event: DragEvent) {
  preventDefaults(event)
  dragCounter--
  if (dragCounter === 0) {
    isDragOver.value = false
  }
}
</script>

<style scoped>
.image-uploader {
  margin-bottom: 25px;
  font-family: 'Courier New', monospace;
}


.upload-area {
  position: relative;
  border: 2px dashed var(--color-border);
  background: var(--color-background);
  transition: all 0.3s ease;
  border-radius: 4px;
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--tui-drag-bg);
}

.file-input {
  display: none;
}

.upload-label {
  display: flex;
  cursor: pointer;
  min-height: 150px;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transition: all 0.3s ease;
  border-radius: 4px;
  position: relative;
}

.upload-label:hover {
  background: transparent;
}

.upload-label.drag-over {
  background: var(--tui-primary);
  color: white;
  border-color: var(--tui-primary);
  box-shadow: 0 8px 25px var(--tui-drag-shadow);
}

.upload-area.drag-over {
  border-color: var(--tui-primary);
  border-style: solid;
  background: var(--tui-primary);
}

.upload-label.drag-over {
  color: white;
}

.upload-label.drag-over .placeholder {
  color: white;
}

.upload-label.drag-over .placeholder small {
  color: rgba(255, 255, 255, 0.9);
}


@media (min-width: 640px) {
  .upload-label {
    min-height: 180px;
    padding: 25px;
  }

  .image-uploader {
    margin-bottom: 30px;
  }


  .placeholder span {
    font-size: 48px;
  }

  .placeholder p {
    font-size: 14px;
  }
}

.placeholder {
  text-align: center;
  color: var(--color-text-muted);
}

.placeholder span {
  font-size: 36px;
  display: block;
  margin-bottom: 12px;
}

.placeholder p {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.placeholder small {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: 'Courier New', monospace;
  margin: 0;
}

.preview {
  width: 100%;
  height: auto;
  display: block;
}

.file-name {
  margin-top: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: 'Courier New', monospace;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  word-break: break-all;
  text-align: center;
  max-width: 200px;
  margin-left: auto;
  margin-right: auto;
}
</style>
