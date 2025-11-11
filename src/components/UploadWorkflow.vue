<template>
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
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import ImageUploader from './ImageUploader.vue'

const userStore = useUserStore()
</script>

<style scoped>
.images-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

@media (min-width: 640px) {
  .images-section {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}
</style>
