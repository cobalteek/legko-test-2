<script setup lang="ts">
defineProps({
  isCreate: { type: Boolean, default: false },
  connectionLabel: { type: String, required: true },
})
</script>

<template>
  <header class="mb-8 flex items-start justify-between max-[700px]:mb-6">
    <div>
      <span class="text-[10px] font-bold uppercase tracking-[.14em] text-[#8090a4]">Workspace / campaigns</span>
      <h1 class="mt-1.5 font-display text-[28px] font-extrabold tracking-[-.04em] text-ink max-[700px]:text-2xl">
        {{ isCreate ? 'Новая кампания' : 'Кампании' }}
      </h1>
    </div>
    <div class="flex items-center gap-4">
      <span class="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe5e0] bg-[#effaf7] px-2.5 py-1.5 text-[11px] font-bold text-[#428d78] max-[700px]:hidden">
        <span class="h-1.5 w-1.5 rounded-full bg-[#58c7a6]" />
        {{ connectionLabel }}
      </span>
      <div class="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#d9e6f2] text-[11px] font-bold text-[#53708c]">ИВ</div>
    </div>
  </header>
</template>
