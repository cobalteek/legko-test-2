import { computed, ref } from 'vue'
import {
  createKeitaroClient,
  type KeitaroCampaign,
  type KeitaroCampaignRequest,
  type KeitaroStream,
} from '../api/keitaro'

export type CampaignStatus = 'active' | 'paused'
export type StreamStatus = 'active' | 'paused' | 'removed'
export type BaseStreamStatus = 'active' | 'paused' | 'none'
export type StreamType = 'forced' | 'regular' | 'default'
export type OfferState = 'active' | 'added' | 'removed' | 'restored'
export type BaseOfferState = 'active' | 'none' | 'removed'

export interface OfferCatalogItem {
  id: number
  name: string
  vertical: string
  geo: string
  archived?: boolean
}

export interface CampaignOffer {
  id: number
  state: OfferState
  pending: boolean
  pinned: boolean
  savedPercentage: number | null
  baseState: BaseOfferState
  basePinned: boolean
  basePercentage: number | null
}

export interface Campaign {
  id: number
  alias?: string
  name: string
  geo: string
  status: CampaignStatus
  domain: string
  group: string
  source: string
  createdAt: string
  streams: CampaignStream[]
}

export interface CampaignStream {
  id: number
  name: string
  type: StreamType
  status: StreamStatus
  position: number
  geo: string[]
  fallbackUrl: string
  pending: boolean
  isNew: boolean
  baseName: string
  baseType: StreamType
  baseStatus: BaseStreamStatus
  baseGeo: string[]
  baseFallbackUrl: string
  offers: CampaignOffer[]
}

export interface CampaignForm {
  name: string
  geo: string
  offer: string
  domain: string
  group: string
  source: string
}

export interface OfferRow extends OfferCatalogItem {
  state: OfferState
  pending: boolean
  pinned: boolean
  savedPercentage: number | null
  percentage: number
}

type LegacyCampaignOffer = number | (Partial<CampaignOffer> & Pick<CampaignOffer, 'id'>)
type LegacyCampaignStream = Partial<Omit<CampaignStream, 'offers'>> & {
  id: number
  name: string
  type: StreamType
  offers: LegacyCampaignOffer[]
}
type LegacyCampaign = Omit<Campaign, 'streams'> & {
  streams?: LegacyCampaignStream[]
  offers?: LegacyCampaignOffer[]
}

const fallbackOfferCatalog: OfferCatalogItem[] = [
  { id: 101, name: 'Nutra GEO MX', vertical: 'Nutra', geo: 'MX' },
  { id: 204, name: 'Finance Leads AU', vertical: 'Finance', geo: 'AU' },
  { id: 317, name: 'Dating RO', vertical: 'Dating', geo: 'RO' },
  { id: 422, name: 'Mobile App US', vertical: 'Apps', geo: 'US' },
  { id: 508, name: 'E-commerce DE', vertical: 'E-commerce', geo: 'DE' },
]

const storageKey = 'adrobot-campaigns-v1'

const defaultCampaigns: LegacyCampaign[] = [
  {
    id: 1,
    name: 'test_ivanov_mexico',
    geo: 'MX',
    status: 'active',
    domain: 'go.example.com',
    group: 'TESTS',
    source: 'Facebook',
    createdAt: 'Сегодня, 12:40',
    streams: [
      {
        id: 101,
        name: 'MX → офферы',
        type: 'regular',
        status: 'active',
        position: 1,
        geo: ['MX'],
        fallbackUrl: '',
        pending: false,
        isNew: false,
        baseName: 'MX → офферы',
        baseType: 'regular',
        baseStatus: 'active',
        baseGeo: ['MX'],
        baseFallbackUrl: '',
        offers: [
          { id: 101, state: 'active', pending: false, pinned: false },
          { id: 204, state: 'active', pending: false, pinned: false },
        ],
      },
      {
        id: 102,
        name: 'Остальной трафик → Google',
        type: 'default',
        status: 'active',
        position: 2,
        geo: [],
        fallbackUrl: 'https://www.google.com/',
        pending: false,
        isNew: false,
        baseName: 'Остальной трафик → Google',
        baseType: 'default',
        baseStatus: 'active',
        baseGeo: [],
        baseFallbackUrl: 'https://www.google.com/',
        offers: [],
      },
    ],
  },
  {
    id: 2,
    name: 'test_petrov_australia',
    geo: 'AU',
    status: 'active',
    domain: 'go.example.com',
    group: 'TESTS',
    source: 'Google Ads',
    createdAt: 'Вчера, 18:15',
    streams: [
      {
        id: 201,
        name: 'AU → оффер',
        type: 'regular',
        status: 'active',
        position: 1,
        geo: ['AU'],
        fallbackUrl: '',
        pending: false,
        isNew: false,
        baseName: 'AU → оффер',
        baseType: 'regular',
        baseStatus: 'active',
        baseGeo: ['AU'],
        baseFallbackUrl: '',
        offers: [{ id: 204, state: 'active', pending: false, pinned: false }],
      },
    ],
  },
  {
    id: 3,
    name: 'test_sidorov_romania',
    geo: 'RO',
    status: 'paused',
    domain: 'track.example.com',
    group: 'ARCHIVE',
    source: 'TikTok',
    createdAt: '19 ноя, 09:20',
    streams: [
      {
        id: 301,
        name: 'RO → офферы',
        type: 'regular',
        status: 'active',
        position: 1,
        geo: ['RO'],
        fallbackUrl: '',
        pending: false,
        isNew: false,
        baseName: 'RO → офферы',
        baseType: 'regular',
        baseStatus: 'active',
        baseGeo: ['RO'],
        baseFallbackUrl: '',
        offers: [
          { id: 317, state: 'active', pending: false, pinned: false },
          { id: 508, state: 'active', pending: false, pinned: false },
        ],
      },
    ],
  },
]

function normalizeGeoList(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value?.split(/[\s,;]+/) ?? []
  return [...new Set(values.map((item) => item.trim().toUpperCase()).filter(Boolean))]
}

function normalizeOfferItems(items: LegacyCampaignOffer[] | undefined): CampaignOffer[] {
  return (items ?? []).map((item): CampaignOffer => {
    const legacyItem = typeof item === 'number' ? undefined : item
    const id = typeof item === 'number' ? item : item.id
    const state: OfferState = legacyItem?.state ?? 'active'
    const pinned = legacyItem?.pinned ?? false
    const savedPercentage = legacyItem?.savedPercentage ?? null

    return {
      id,
      state,
      pending: legacyItem?.pending ?? false,
      pinned,
      savedPercentage,
      baseState:
        legacyItem?.baseState ?? (state === 'removed' && !legacyItem?.pending ? 'removed' : 'active'),
      basePinned: legacyItem?.basePinned ?? pinned,
      basePercentage: legacyItem?.basePercentage ?? savedPercentage,
    }
  })
}

function normalizeCampaigns(source: LegacyCampaign[]): Campaign[] {
  return source.map((campaign) => ({
    ...campaign,
    geo: normalizeGeoList(campaign.geo).join(', '),
    streams: (campaign.streams?.length
      ? campaign.streams
      : [{
          id: campaign.id * 100 + 1,
          name: `${campaign.geo || 'GEO'} → офферы`,
          type: 'regular' as const,
          status: 'active' as const,
          position: 1,
          geo: normalizeGeoList(campaign.geo),
          fallbackUrl: '',
          pending: false,
          isNew: false,
          baseName: `${campaign.geo || 'GEO'} → офферы`,
          baseType: 'regular',
          baseStatus: 'active',
          baseGeo: normalizeGeoList(campaign.geo),
          baseFallbackUrl: '',
          offers: campaign.offers ?? [],
        }]
    ).map((stream, index): CampaignStream => ({
      id: stream.id,
      name: stream.name,
      type: stream.type ?? 'regular',
      status: stream.status ?? 'active',
      position: stream.position ?? index + 1,
      geo: normalizeGeoList(stream.geo),
      fallbackUrl: stream.fallbackUrl ?? '',
      pending: stream.pending ?? false,
      isNew: stream.isNew ?? false,
      baseName: stream.baseName ?? stream.name,
      baseType: (stream.baseType ?? stream.type ?? 'regular') as StreamType,
      baseStatus: (stream.baseStatus ?? stream.status ?? 'active') as BaseStreamStatus,
      baseGeo: normalizeGeoList(stream.baseGeo ?? stream.geo),
      baseFallbackUrl: stream.baseFallbackUrl ?? stream.fallbackUrl ?? '',
      offers: normalizeOfferItems(stream.offers),
    })),
  }))
}

function loadLocalCampaigns(): Campaign[] {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return normalizeCampaigns(saved ? JSON.parse(saved) : structuredClone(defaultCampaigns))
  } catch {
    return normalizeCampaigns(structuredClone(defaultCampaigns))
  }
}

function formatCreatedAt(value?: string): string {
  if (!value) return 'В Keitaro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || `campaign-${Date.now()}`
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Неизвестная ошибка API'
}

function findByName<T extends { name: string }>(items: T[], value: string): T | undefined {
  const normalized = value.trim().toLowerCase()
  return items.find((item) => item.name.trim().toLowerCase() === normalized)
}

function makeCampaignOffer(id: number, values: Partial<CampaignOffer> = {}): CampaignOffer {
  return {
    id,
    state: values.state ?? 'active',
    pending: values.pending ?? false,
    pinned: values.pinned ?? false,
    savedPercentage: values.savedPercentage ?? null,
    baseState: values.baseState ?? 'active',
    basePinned: values.basePinned ?? false,
    basePercentage: values.basePercentage ?? null,
  }
}

function mergeRemoteOffers(
  remoteOffers: { offer_id: number; share: number }[],
  cachedOffers: CampaignOffer[],
): CampaignOffer[] {
  const cachedById = new Map(cachedOffers.map((offer) => [offer.id, offer]))
  const remoteIds = new Set(remoteOffers.map((offer) => offer.offer_id))
  const activeOffers = remoteOffers.map((remoteOffer) => {
    const cached = cachedById.get(remoteOffer.offer_id)

    if (cached?.pending) return cached

    const pinned = cached?.basePinned ?? false
    const savedPercentage = pinned ? cached?.basePercentage ?? remoteOffer.share : null

    return makeCampaignOffer(remoteOffer.offer_id, {
      pinned,
      savedPercentage,
      basePinned: pinned,
      basePercentage: savedPercentage,
    })
  })

  const preservedOffers = cachedOffers.filter((offer) => !remoteIds.has(offer.id))
  return [...activeOffers, ...preservedOffers]
}

function getStreamGeo(stream: KeitaroStream): string[] {
  const countryFilter = (stream.filters ?? []).find((filter) => {
    if (!filter || typeof filter !== 'object') return false
    return 'name' in filter && filter.name === 'country'
  })

  if (!countryFilter || typeof countryFilter !== 'object' || !('payload' in countryFilter)) return []
  const payload = countryFilter.payload
  return Array.isArray(payload) ? normalizeGeoList(payload.map(String)) : []
}

function normalizeStreamType(value?: string): StreamType {
  return value === 'forced' || value === 'default' ? value : 'regular'
}

export function formatPercentage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function useCampaigns() {
  const keitaro = createKeitaroClient()
  const isApiMode = Boolean(keitaro)
  const campaigns = ref<Campaign[]>(isApiMode ? [] : loadLocalCampaigns())
  const offerCatalog = ref<OfferCatalogItem[]>(fallbackOfferCatalog)
  const selectedCampaignId = ref(1)
  const selectedStreamId = ref<number | null>(null)
  const search = ref('')
  const offerToAdd = ref('')
  const notice = ref('')
  const isLoading = ref(isApiMode)
  const isSaving = ref(false)
  const showSingleOfferWarning = ref(false)
  const lastRemovedOfferId = ref<number | null>(null)
  let noticeTimer: number | undefined

  const selectedCampaign = computed(() =>
    campaigns.value.find((campaign) => campaign.id === selectedCampaignId.value),
  )
  const selectedStream = computed(() =>
    selectedCampaign.value?.streams.find((stream) => stream.id === selectedStreamId.value) ??
      selectedCampaign.value?.streams[0],
  )

  const filteredCampaigns = computed(() => {
    const query = search.value.trim().toLowerCase()

    if (!query) return campaigns.value

    return campaigns.value.filter((campaign) =>
      [campaign.name, campaign.geo, campaign.source, campaign.group]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  })

  const selectedOffers = computed<OfferRow[]>(() => {
    const rows = (selectedStream.value?.offers ?? [])
      .map((item): OfferRow | null => {
        const offer = offerCatalog.value.find((candidate) => candidate.id === item.id)

        return offer
          ? {
              ...offer,
              state: item.state,
              pending: item.pending,
              pinned: item.pinned,
              savedPercentage: item.savedPercentage,
              percentage: 0,
            }
          : null
      })
      .filter((row): row is OfferRow => row !== null)

    const activeRows = rows.filter((row) => row.state !== 'removed')
    if (activeRows.length === 1) {
      return rows.map((row) => ({
        ...row,
        percentage: row.state === 'removed' ? 0 : 100,
      }))
    }

    const pinnedTotal = activeRows
      .filter((row) => row.pinned)
      .reduce((total, row) => total + (row.savedPercentage ?? 0), 0)
    const unpinnedRows = activeRows.filter((row) => !row.pinned)
    const unpinnedPercentage = unpinnedRows.length
      ? Math.max(0, 100 - pinnedTotal) / unpinnedRows.length
      : 0

    return rows.map((row) => ({
      ...row,
      percentage:
        row.state === 'removed'
          ? 0
          : row.pinned
            ? row.savedPercentage ?? 0
            : unpinnedPercentage,
    }))
  })

  const activeOffers = computed(() => selectedOffers.value.filter((offer) => offer.state !== 'removed'))
  const availableOffers = computed(() => {
    const selected = new Set((selectedStream.value?.offers ?? []).map((item) => item.id))
    return offerCatalog.value.filter((offer) => !selected.has(offer.id))
  })
  const hasPendingChanges = computed(
    () => Boolean(selectedCampaign.value?.streams.some((stream) => stream.pending)) || selectedOffers.value.some((offer) => offer.pending),
  )
  const pendingChangeCount = computed(
    () => selectedOffers.value.filter((offer) => offer.pending).length + (selectedCampaign.value?.streams.filter((stream) => stream.pending).length ?? 0),
  )
  const totalPercentage = computed(() => {
    const total = activeOffers.value.reduce((sum, offer) => sum + offer.percentage, 0)
    return Math.round(total * 10) / 10
  })
  const hasInvalidPercentageTotal = computed(() => {
    const activeRows = activeOffers.value
    if (activeRows.length <= 1) return false

    const pinnedTotal = activeRows
      .filter((offer) => offer.pinned)
      .reduce((total, offer) => total + (offer.savedPercentage ?? 0), 0)
    const hasUnpinnedOffers = activeRows.some((offer) => !offer.pinned)

    return pinnedTotal > 100 || (!hasUnpinnedOffers && pinnedTotal !== 100)
  })

  function showNotice(message: string): void {
    notice.value = message
    if (noticeTimer) window.clearTimeout(noticeTimer)
    noticeTimer = window.setTimeout(() => {
      notice.value = ''
    }, 3200)
  }

  function persistCampaigns(): void {
    window.localStorage.setItem(storageKey, JSON.stringify(campaigns.value))
  }

  function refreshPending(item: CampaignOffer): void {
    const stateMatches = item.state === item.baseState
    const pinMatches = item.pinned === item.basePinned
    const percentageMatches = item.pinned
      ? item.savedPercentage === item.basePercentage
      : item.basePinned === false

    item.pending = !(stateMatches && pinMatches && percentageMatches)
  }

  function getOffer(id: number): OfferCatalogItem | undefined {
    return offerCatalog.value.find((offer) => offer.id === id)
  }

  function getCampaignOfferCount(campaign: Campaign): number {
    return campaign.streams.reduce(
      (total, stream) => stream.status === 'removed'
        ? total
        : total + stream.offers.filter((item) => item.state !== 'removed').length,
      0,
    )
  }

  function selectCampaign(id: number): void {
    selectedCampaignId.value = id
    selectedStreamId.value = campaigns.value.find((campaign) => campaign.id === id)?.streams[0]?.id ?? null
  }

  function selectStream(id: number): void {
    if (selectedCampaign.value?.streams.some((stream) => stream.id === id)) {
      selectedStreamId.value = id
    }
  }

  function addStream(): void {
    const campaign = selectedCampaign.value
    if (!campaign) return

    const nextPosition = campaign.streams.length + 1
    const id = Date.now()
    const stream: CampaignStream = {
      id,
      name: `Поток ${nextPosition}`,
      type: 'regular',
      status: 'active',
      position: nextPosition,
      geo: [],
      fallbackUrl: '',
      pending: true,
      isNew: true,
      baseName: '',
      baseType: 'regular',
      baseStatus: 'none',
      baseGeo: [],
      baseFallbackUrl: '',
      offers: [],
    }
    campaign.streams.push(stream)
    selectedStreamId.value = id
    persistCampaigns()
    showNotice('Новый поток добавлен в черновик')
  }

  function updateStream(id: number, patch: Partial<Pick<CampaignStream, 'name' | 'type' | 'status' | 'geo' | 'fallbackUrl'>>): void {
    const stream = selectedCampaign.value?.streams.find((item) => item.id === id)
    if (!stream) return

    Object.assign(stream, patch)
    stream.geo = normalizeGeoList(stream.geo)
    stream.pending = true
    selectedCampaign.value!.geo = [...new Set(
      selectedCampaign.value!.streams
        .filter((item) => item.type !== 'default' && item.status !== 'removed')
        .flatMap((item) => item.geo),
    )].join(', ') || '—'
    persistCampaigns()
  }

  function removeStream(id: number): void {
    const campaign = selectedCampaign.value
    if (!campaign || campaign.streams.length <= 1) {
      showNotice('В кампании должен остаться хотя бы один поток')
      return
    }

    const stream = campaign.streams.find((item) => item.id === id)
    if (!stream) return

    stream.status = 'removed'
    stream.pending = true
    const nextStream = campaign.streams.find((item) => item.status !== 'removed')
    selectedStreamId.value = nextStream?.id ?? null
    persistCampaigns()
    showNotice('Поток помечен на удаление')
  }

  function mapRemoteCampaign(
    remote: KeitaroCampaign,
    streams: KeitaroStream[],
    cached?: Campaign,
  ): Campaign {
    const group = cached?.group ?? ''
    const source = cached?.source ?? ''
    const domain = cached?.domain ?? ''
    const cachedStreams = cached?.streams ?? []
    const mappedStreams = streams.map((stream, index): CampaignStream => {
      const cachedStream = cachedStreams.find((candidate) => candidate.id === stream.id)
      const geo = getStreamGeo(stream)

      return {
        id: stream.id,
        name: stream.name || `Поток ${index + 1}`,
        type: normalizeStreamType(stream.type),
        status: stream.state === 'disabled' ? 'paused' : 'active',
        position: stream.position ?? index + 1,
        geo: cachedStream?.geo.length ? cachedStream.geo : geo,
        fallbackUrl:
          cachedStream?.fallbackUrl ??
          (typeof stream.action_options?.url === 'string' ? stream.action_options.url : ''),
        pending: false,
        isNew: false,
        baseName: cachedStream?.baseName ?? stream.name,
        baseType: cachedStream?.baseType ?? normalizeStreamType(stream.type),
        baseStatus: cachedStream?.baseStatus ?? (stream.state === 'disabled' ? 'paused' : 'active'),
        baseGeo: cachedStream?.baseGeo ?? geo,
        baseFallbackUrl:
          cachedStream?.baseFallbackUrl ??
          (typeof stream.action_options?.url === 'string' ? stream.action_options.url : ''),
        offers: mergeRemoteOffers(
          stream.offers?.filter((offer) => offer.state !== 'disabled') ?? [],
          cachedStream?.offers ?? [],
        ),
      }
    })

    return {
      id: remote.id,
      alias: remote.alias,
      name: remote.name,
      geo: cached?.geo ?? (mappedStreams.flatMap((stream) => stream.geo).join(', ') || '—'),
      status: remote.state === 'active' ? 'active' : 'paused',
      domain,
      group,
      source,
      createdAt: formatCreatedAt(remote.created_at),
      streams: mappedStreams,
    }
  }

  async function loadRemoteData(): Promise<void> {
    if (!keitaro) return

    try {
      const [remoteCampaigns, remoteOffers, deletedOffers, groups, domains, trafficSources] = await Promise.all([
        keitaro.getCampaigns(),
        keitaro.getOffers(),
        keitaro.getDeletedOffers().catch(() => []),
        keitaro.getGroups(),
        keitaro.getDomains(),
        keitaro.getTrafficSources(),
      ])
      const streams = await Promise.all(
        remoteCampaigns.map((campaign) => keitaro.getCampaignStreams(campaign.id)),
      )
      const localCampaigns = loadLocalCampaigns()
      const localById = new Map(localCampaigns.map((campaign) => [campaign.id, campaign]))
      const groupById = new Map(groups.map((group) => [group.id, group]))
      const domainById = new Map(domains.map((domain) => [domain.id, domain]))
      const sourceById = new Map(trafficSources.map((source) => [source.id, source]))

      campaigns.value = remoteCampaigns.map((remoteCampaign, index) => {
        const mapped = mapRemoteCampaign(
          remoteCampaign,
          streams[index],
          localById.get(remoteCampaign.id),
        )

        return {
          ...mapped,
          group: (groupById.get(remoteCampaign.group_id ?? -1)?.name ?? mapped.group) || '—',
          domain: (domainById.get(remoteCampaign.domain_id ?? -1)?.name ?? mapped.domain) || '—',
          source:
            (sourceById.get(remoteCampaign.traffic_source_id ?? -1)?.name ?? mapped.source) || '—',
        }
      })

      const remoteCatalog = remoteOffers.map((offer): OfferCatalogItem => ({
        id: offer.id,
        name: offer.name,
        vertical: offer.affiliate_network ?? 'Offer',
        geo: offer.country?.join(', ') || '—',
      }))
      const deletedCatalog = deletedOffers.map((offer): OfferCatalogItem => ({
        id: offer.id,
        name: offer.name,
        vertical: offer.affiliate_network ?? 'Offer',
        geo: offer.country?.join(', ') || '—',
        archived: true,
      }))
      const knownIds = new Set([...remoteCatalog, ...deletedCatalog].map((offer) => offer.id))
      const preservedCatalog = localCampaigns
        .flatMap((campaign) => campaign.streams.flatMap((stream) => stream.offers))
        .filter((offer) => !knownIds.has(offer.id))
        .map((offer) => ({
          id: offer.id,
          name: `Offer #${offer.id}`,
          vertical: 'Offer',
          geo: '—',
        }))

      offerCatalog.value = [...remoteCatalog, ...deletedCatalog, ...preservedCatalog]
      selectedCampaignId.value = campaigns.value[0]?.id ?? 1
      selectedStreamId.value = campaigns.value[0]?.streams[0]?.id ?? null
      persistCampaigns()
  } catch (error) {
    campaigns.value = loadLocalCampaigns()
    selectedCampaignId.value = campaigns.value[0]?.id ?? 1
    selectedStreamId.value = campaigns.value[0]?.streams[0]?.id ?? null
    showNotice(`Не удалось загрузить Keitaro: ${getErrorMessage(error)}`)
    } finally {
      isLoading.value = false
    }
  }

  function createMockCampaign(form: CampaignForm, offerId: number): boolean {
    const geoList = normalizeGeoList(form.geo)
    const campaign: Campaign = {
      id: Date.now(),
      name: form.name.trim(),
      geo: geoList.join(', '),
      status: 'active',
      domain: form.domain,
      group: form.group,
      source: form.source,
      createdAt: 'Только что',
      streams: [
        {
          id: Date.now() + 1,
          name: `${geoList.join(', ')} → офферы`,
          type: 'regular',
          status: 'active',
          position: 1,
          geo: geoList,
          fallbackUrl: '',
          pending: false,
          isNew: false,
          baseName: `${geoList.join(', ')} → офферы`,
          baseType: 'regular',
          baseStatus: 'active',
          baseGeo: geoList,
          baseFallbackUrl: '',
          offers: [makeCampaignOffer(offerId)],
        },
      ],
    }

    campaigns.value.unshift(campaign)
    selectedCampaignId.value = campaign.id
    selectedStreamId.value = campaign.streams[0].id
    persistCampaigns()
    showNotice('Кампания создана в mock-режиме')
    return true
  }

  async function createCampaign(form: CampaignForm): Promise<boolean> {
    const name = form.name.trim()
    const geoList = normalizeGeoList(form.geo)
    const offerId = Number(form.offer)

    if (!name || geoList.length === 0 || !offerId) {
      showNotice('Заполни название, GEO и оффер')
      return false
    }

    if (!keitaro) return createMockCampaign(form, offerId)

    isSaving.value = true
    try {
      const [groups, domains, trafficSources] = await Promise.all([
        keitaro.getGroups(),
        keitaro.getDomains(),
        keitaro.getTrafficSources(),
      ])
      const group = findByName(groups, form.group)
      const domain = findByName(domains, form.domain)
      const source = findByName(trafficSources, form.source)
      const payload: KeitaroCampaignRequest = {
        alias: slugify(name),
        name,
        type: 'weight',
        state: 'active',
      }

      if (group) payload.group_id = group.id
      if (domain) payload.domain_id = domain.id
      if (source) payload.traffic_source_id = source.id

      const remoteCampaign = await keitaro.createCampaign(payload)
      await restoreArchivedOffers([offerId])
      const stream = await keitaro.createStream({
        campaign_id: remoteCampaign.id,
        type: 'regular',
        name: 'Офферы кампании',
        schema: 'redirect',
        action_type: 'http',
        filters: [{ name: 'country', mode: 'accept', payload: geoList }],
        offers: [{ offer_id: offerId, share: 100, state: 'active' }],
      })
      const campaign = mapRemoteCampaign(remoteCampaign, [stream])

      campaign.geo = geoList.join(', ')
      campaign.domain = form.domain
      campaign.group = form.group
      campaign.source = form.source
      campaigns.value.unshift(campaign)
      selectedCampaignId.value = campaign.id
      selectedStreamId.value = campaign.streams[0]?.id ?? null
      persistCampaigns()
      showNotice('Кампания создана и отправлена в Keitaro')
      return true
    } catch (error) {
      showNotice(`Не удалось создать кампанию: ${getErrorMessage(error)}`)
      return false
    } finally {
      isSaving.value = false
    }
  }

  function addOffer(id: string | number): void {
    const offerId = Number(id)
    if (!offerId || !selectedStream.value) return

    selectedStream.value.offers.push(
      makeCampaignOffer(offerId, {
        state: 'added',
        pending: true,
        baseState: 'none',
      }),
    )
    offerToAdd.value = ''
    persistCampaigns()
    showNotice('Оффер добавлен в черновик')
  }

  function removeOffer(id: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    if (!item || !selectedStream.value) return

    item.state = 'removed'
    item.pinned = false
    item.savedPercentage = null
    lastRemovedOfferId.value = id
    refreshPending(item)
    persistCampaigns()
    showNotice('Оффер помечен на удаление')
  }

  function bringBackOffer(id: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    if (!item) return

    item.state = item.baseState === 'removed' ? 'restored' : item.baseState === 'none' ? 'added' : 'active'
    item.pinned = item.basePinned
    item.savedPercentage = item.basePercentage
    if (lastRemovedOfferId.value === id) lastRemovedOfferId.value = null
    refreshPending(item)
    persistCampaigns()
    showNotice(item.pending ? 'Оффер возвращён в черновик' : 'Удаление отменено')
  }

  function togglePin(id: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    const row = selectedOffers.value.find((offer) => offer.id === id)
    if (!item || !row || row.state === 'removed') return

    item.pinned = !item.pinned
    item.savedPercentage = item.pinned
      ? item.basePinned && item.basePercentage !== null
        ? item.basePercentage
        : row.percentage
      : null
    refreshPending(item)
    persistCampaigns()
    showNotice(
      item.pinned
        ? `Процент закреплён: ${formatPercentage(item.savedPercentage ?? 0)}%`
        : item.pending
          ? 'Процент откреплён в черновике'
          : 'Процент откреплён',
    )
  }

  function setOfferPercentage(id: number, value: number): void {
    const item = selectedStream.value?.offers.find((offer) => offer.id === id)
    if (!item || item.state === 'removed' || !Number.isFinite(value)) return

    item.pinned = true
    item.savedPercentage = Math.min(100, Math.max(0, Math.round(value)))
    refreshPending(item)
    persistCampaigns()
    showNotice(`Процент оффера изменён: ${item.savedPercentage}%`)
  }

  function buildIntegerShares(rows: OfferRow[]): number[] {
    const rawShares = rows.map((row) => row.percentage)
    const shares = rawShares.map((share) => Math.max(0, Math.floor(share)))
    let remainder = 100 - shares.reduce((sum, share) => sum + share, 0)
    const order = rawShares
      .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
      .sort((left, right) => right.fraction - left.fraction)

    let cursor = 0
    while (remainder > 0 && order.length > 0) {
      shares[order[cursor % order.length].index] += 1
      remainder -= 1
      cursor += 1
    }

    return shares
  }

  async function restoreArchivedOffers(offerIds: number[]): Promise<void> {
    if (!keitaro) return

    const archivedIds = new Set(
      offerCatalog.value.filter((offer) => offer.archived).map((offer) => offer.id),
    )
    const idsToRestore = offerIds.filter((id) => archivedIds.has(id))
    if (idsToRestore.length === 0) return

    await Promise.all(idsToRestore.map((id) => keitaro.restoreOffer(id)))
    offerCatalog.value.forEach((offer) => {
      if (idsToRestore.includes(offer.id)) offer.archived = false
    })
  }

  function commitOfferChanges(stream: CampaignStream): void {
    stream.offers.forEach((item) => {
      if (item.state === 'removed') {
        item.baseState = 'removed'
        item.basePinned = item.pinned
        item.basePercentage = item.savedPercentage
        item.pending = false
        return
      }
      item.state = 'active'
      item.baseState = 'active'
      item.basePinned = item.pinned
      item.basePercentage = item.pinned ? item.savedPercentage : null
      item.pending = false
    })
  }

  function commitStreamChanges(stream: CampaignStream): void {
    stream.baseName = stream.name
    stream.baseType = stream.type
    stream.baseStatus = stream.status === 'removed' ? 'paused' : stream.status
    stream.baseGeo = [...stream.geo]
    stream.baseFallbackUrl = stream.fallbackUrl
    stream.pending = false
    stream.isNew = false
  }

  function restoreStreamDraft(stream: CampaignStream): void {
    stream.name = stream.baseName
    stream.type = stream.baseType
    stream.status = stream.baseStatus === 'none' ? 'removed' : stream.baseStatus
    stream.geo = [...stream.baseGeo]
    stream.fallbackUrl = stream.baseFallbackUrl
    stream.pending = false
  }

  function buildStreamRequest(stream: CampaignStream, offers: { offer_id: number; share: number; state: 'active' }[]) {
    return {
      type: stream.type,
      name: stream.name,
      schema: 'redirect' as const,
      action_type: 'http',
      state: stream.status === 'paused' || stream.status === 'removed' ? 'disabled' as const : 'active' as const,
      filters: stream.geo.length
        ? [{ name: 'country', mode: 'accept', payload: stream.geo }]
        : [],
      action_options: stream.fallbackUrl ? { url: stream.fallbackUrl } : undefined,
      offers,
    }
  }

  function shouldWarnAboutSingleOffer(): boolean {
    return (
      lastRemovedOfferId.value !== null &&
      activeOffers.value.length === 1 &&
      activeOffers.value[0].pinned
    )
  }

  async function saveOfferChanges(force = false): Promise<void> {
    const campaign = selectedCampaign.value
    const stream = selectedStream.value
    if (!campaign || !stream || !hasPendingChanges.value || isSaving.value) return
    if (hasInvalidPercentageTotal.value) {
      const pinnedOffers = activeOffers.value.filter((offer) => offer.pinned)
      const pinnedTotal = pinnedOffers.reduce((total, offer) => total + (offer.savedPercentage ?? 0), 0)
      showNotice(
        activeOffers.value.some((offer) => !offer.pinned)
          ? 'Сумма закреплённых процентов не должна превышать 100%'
          : `Для всех закреплённых офферов нужна сумма 100% (сейчас ${pinnedTotal}%)`,
      )
      return
    }
    if (!force && shouldWarnAboutSingleOffer()) {
      showSingleOfferWarning.value = true
      return
    }

    isSaving.value = true
    try {
      const removedStreams = campaign.streams.filter((item) => item.pending && item.status === 'removed')
      const activeRows = selectedOffers.value.filter((offer) => offer.state !== 'removed')
      const shares = buildIntegerShares(activeRows)
      const offerPayload = activeRows.map((offer, index) => ({
        offer_id: offer.id,
        share: shares[index],
        state: 'active' as const,
      }))

      if (activeRows.length === 0 && stream.type !== 'default') {
        stream.status = 'paused'
      }

      if (keitaro) {
        for (const removedStream of removedStreams) {
          if (!removedStream.isNew) {
            await keitaro.updateStream(removedStream.id, buildStreamRequest(removedStream, []))
          }
        }

        if (activeRows.length === 0) {
          if (stream.id > 0 && !stream.isNew) {
            await keitaro.updateStream(stream.id, buildStreamRequest(stream, []))
          }
        } else {
          await restoreArchivedOffers(activeRows.map((offer) => offer.id))

          if (stream.isNew) {
            const remoteStream = await keitaro.createStream({
              campaign_id: campaign.id,
              ...buildStreamRequest(stream, offerPayload),
            })
            stream.id = remoteStream.id
            stream.isNew = false
          } else {
            await keitaro.updateStream(stream.id, buildStreamRequest(stream, offerPayload))
          }
        }
      }

      if (activeRows.length === 1 && activeOffers.value[0].pinned) {
        const soleOffer = stream.offers.find((offer) => offer.id === activeOffers.value[0].id)
        if (soleOffer) soleOffer.savedPercentage = 100
      }

      if (stream.status === 'removed') {
        stream.status = 'paused'
      }
      commitOfferChanges(stream)
      commitStreamChanges(stream)
      removedStreams.forEach(commitStreamChanges)
      campaign.streams = campaign.streams.filter((item) => item.status !== 'removed')
      if (getCampaignOfferCount(campaign) === 0) {
        if (keitaro && campaign.status === 'active') {
          await keitaro.updateCampaignState(campaign.id, 'disabled')
        }
        campaign.status = 'paused'
      }
      showSingleOfferWarning.value = false
      lastRemovedOfferId.value = null
      persistCampaigns()
      showNotice(
        getCampaignOfferCount(campaign) === 0
          ? keitaro
            ? 'Офферы удалены, кампания поставлена на паузу в Keitaro'
            : 'Офферы удалены, кампания поставлена на паузу'
          : keitaro
            ? 'Изменения отправлены в Keitaro'
            : 'Изменения сохранены в mock Keitaro',
      )
    } catch (error) {
      showNotice(`Не удалось сохранить изменения: ${getErrorMessage(error)}`)
    } finally {
      isSaving.value = false
    }
  }

  async function confirmSingleOfferSave(): Promise<void> {
    await saveOfferChanges(true)
  }

  function cancelSingleOfferSave(): void {
    showSingleOfferWarning.value = false
    if (lastRemovedOfferId.value !== null) bringBackOffer(lastRemovedOfferId.value)
  }

  function discardOfferChanges(): void {
    const stream = selectedStream.value
    if (!selectedCampaign.value || !stream || !hasPendingChanges.value) return

    stream.offers = stream.offers
      .filter((item) => item.baseState !== 'none')
      .map((item) => {
        item.state = item.baseState === 'removed' ? 'removed' : 'active'
        item.pinned = item.basePinned
        item.savedPercentage = item.basePercentage
        item.pending = false
        return item
      })
    if (stream.isNew) {
      selectedCampaign.value.streams = selectedCampaign.value.streams.filter((item) => item.id !== stream.id)
      selectedStreamId.value = selectedCampaign.value.streams[0]?.id ?? null
    } else {
      restoreStreamDraft(stream)
    }
    selectedCampaign.value.streams = selectedCampaign.value.streams.filter((item) => {
      if (item.status !== 'removed') return true
      if (item.isNew) return false
      restoreStreamDraft(item)
      return true
    })
    lastRemovedOfferId.value = null
    showSingleOfferWarning.value = false
    persistCampaigns()
    showNotice('Черновые изменения отменены')
  }

  async function toggleStatus(campaign: Campaign): Promise<void> {
    if (isSaving.value) return
    const nextStatus: CampaignStatus = campaign.status === 'active' ? 'paused' : 'active'

    if (nextStatus === 'active' && getCampaignOfferCount(campaign) === 0) {
      showNotice('Нельзя запустить кампанию без активных офферов')
      return
    }

    isSaving.value = true
    try {
      if (keitaro) {
        await keitaro.updateCampaignState(campaign.id, nextStatus === 'active' ? 'active' : 'disabled')
      }
      campaign.status = nextStatus
      persistCampaigns()
      showNotice(
        keitaro
          ? nextStatus === 'active'
            ? 'Кампания запущена в Keitaro'
            : 'Кампания приостановлена в Keitaro'
          : nextStatus === 'active'
            ? 'Кампания запущена'
            : 'Кампания приостановлена',
      )
    } catch (error) {
      showNotice(`Не удалось изменить статус: ${getErrorMessage(error)}`)
    } finally {
      isSaving.value = false
    }
  }

  if (keitaro) void loadRemoteData()

  return {
    activeOffers,
    availableOffers,
    addStream,
    campaigns,
    connectionLabel: isApiMode ? 'Keitaro API' : 'Mock API',
    createCampaign,
    discardOfferChanges,
    filteredCampaigns,
    formatPercentage,
    getCampaignOfferCount,
    getOffer,
    hasPendingChanges,
    hasInvalidPercentageTotal,
    isApiMode,
    isLoading,
    isSaving,
    showSingleOfferWarning,
    confirmSingleOfferSave,
    cancelSingleOfferSave,
    notice,
    offerCatalog,
    offerToAdd,
    pendingChangeCount,
    removeOffer,
    removeStream,
    addOffer,
    bringBackOffer,
    saveOfferChanges,
    setOfferPercentage,
    search,
    selectedCampaign,
    selectedCampaignId,
    selectedOffers,
    selectedStream,
    selectedStreamId,
    selectCampaign,
    selectStream,
    showNotice,
    updateStream,
    togglePin,
    toggleStatus,
    totalPercentage,
  }
}
