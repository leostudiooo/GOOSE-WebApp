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

function handleDrop(event: DragEvent) {
  isDragOver.value = false
  const files = event.dataTransfer?.files
  if (files && files[0]) {
    processFile(files[0])
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
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
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
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
  transition: background-color 0.2s;
}

.upload-label:hover {
  background: transparent;
}

.upload-label.drag-over {
  background: var(--color-surface);
  border-color: var(--color-primary);
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
