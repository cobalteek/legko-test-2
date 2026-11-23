<script setup lang="ts">
defineProps({
  activeView: { type: String, required: true },
  connectionLabel: { type: String, required: true },
})

defineEmits(['navigate'])

const views = [
  { id: 'campaigns', label: 'Кампании', icon: '▦' },
  { id: 'create', label: 'Создать кампанию', icon: '+' },
]
</script>

<template>
  <aside class="flex w-[248px] shrink-0 flex-col bg-navy px-[18px] py-7 text-slate-200 max-[700px]:w-[68px] max-[700px]:px-2.5 max-[700px]:py-5">
    <div class="flex items-center gap-3 px-3 pb-[34px] max-[700px]:justify-center max-[700px]:px-0 max-[700px]:pb-7">
      <div class="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-mint font-display text-xl font-extrabold text-[#14253a]">A</div>
      <div class="max-[700px]:hidden">
        <strong class="block font-display text-base text-white">Adrobot</strong>
        <span class="mt-0.5 block text-[11px] text-[#8da4bd]">Keitaro wrapper</span>
      </div>
    </div>

    <nav class="grid gap-2" aria-label="Основная навигация">
      <button
        v-for="view in views"
        :key="view.id"
        type="button"
        class="flex items-center gap-3 rounded-[10px] border border-transparent px-3 py-3 text-left text-sm text-[#9bb0c8] transition hover:border-[#35516f] hover:bg-[#253b56] hover:text-white focus-visible:outline-white max-[700px]:justify-center max-[700px]:px-1.5"
        :class="activeView === view.id ? 'border-[#35516f] bg-[#253b56] text-white shadow-[inset_3px_0_#b9ecde]' : ''"
        @click="$emit('navigate', view.id)"
      >
        <span class="w-[18px] text-center text-lg">{{ view.icon }}</span>
        <span class="max-[700px]:hidden">{{ view.label }}</span>
      </button>
    </nav>

    <div class="mt-auto flex items-center gap-2.5 border-t border-[#2b4059] px-3 py-3.5 max-[700px]:justify-center max-[700px]:px-0">
      <div class="h-2 w-2 rounded-full bg-[#65d8b5] shadow-[0_0_0_4px_#254658]" />
      <div class="max-[700px]:hidden">
        <span class="block text-[10px] uppercase tracking-wider text-[#829ab3]">Режим подключения</span>
        <strong class="mt-0.5 block text-xs text-slate-200">{{ connectionLabel }}</strong>
      </div>
    </div>
  </aside>
</template>
