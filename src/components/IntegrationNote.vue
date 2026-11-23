<script setup lang="ts">
defineProps<{ isApiMode: boolean }>()
</script>

<template>
  <aside class="rounded-[15px] border border-[#dce8f0] bg-[#edf5f9] p-[22px] text-[#62788e]">
    <div class="grid h-6 w-6 place-items-center rounded-full bg-[#d8e9f1] font-serif font-bold text-[#5f87a3]">i</div>
    <h3 class="mt-[18px] font-display text-sm font-bold text-[#314b65]">{{ isApiMode ? 'Интеграция с Keitaro включена' : 'Интеграция будет позже' }}</h3>
    <p class="mt-2 text-[11px] leading-relaxed">{{ isApiMode ? 'Список кампаний, офферы, статусы и сохранение весов работают через Admin API.' : 'Добавьте переменные Keitaro в .env, чтобы включить реальные запросы. Без них приложение работает в mock-режиме.' }}</p>
    <div class="mt-5 rounded-lg border border-[#dce8f0] bg-white/50 p-3 font-mono text-[10px] leading-relaxed text-[#6b8395]">
      KeitaroClient<br />
      <span class="text-[#4c9f89]">→ createCampaign()</span><br />
      <span class="text-[#4c9f89]">→ updateOffers()</span>
    </div>
  </aside>
</template>
