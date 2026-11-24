<script setup lang="ts">
</script>

<template>
  <aside class="rounded-[15px] border border-[#dce8f0] bg-[#edf5f9] p-[22px] text-[#62788e]">
    <div class="grid h-6 w-6 place-items-center rounded-full bg-[#d8e9f1] font-serif font-bold text-[#5f87a3]">i</div>
    <h3 class="mt-[18px] font-display text-sm font-bold text-[#314b65]">FastAPI-обёртка подключена</h3>
    <p class="mt-2 text-[11px] leading-relaxed">Список кампаний, офферы, статусы и сохранение весов проходят через backend. Api-Key не попадает в браузер.</p>
    <div class="mt-5 rounded-lg border border-[#dce8f0] bg-white/50 p-3 font-mono text-[10px] leading-relaxed text-[#6b8395]">
      FastAPI → SQLAlchemy → Keitaro<br />
      <span class="text-[#4c9f89]">→ createCampaign()</span><br />
      <span class="text-[#4c9f89]">→ updateOffers()</span>
    </div>
  </aside>
</template>
