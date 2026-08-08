// 「めくる」のオフラインシェル用Service Worker。
// Next.js(Turbopack)のビルド成果物はハッシュ付きファイル名がビルドごとに変わるため、
// ビルド時プリキャッシュ(マニフェスト方式)ではなく、実際にアクセスしたリソースを
// その都度キャッシュしていく「ランタイムキャッシュ」方式を採用する。
// これにより、一度でも開いたページ・アセットは次回オフラインでも表示できるようになる。
//
// ただし、認証必須ページ(ダッシュボード配下)はユーザー固有のデータを含むため、
// 共有端末での前ユーザーのデータ残留を防ぐ目的でキャッシュ対象から除外する
// (src/proxy.ts の保護対象パスと一致させること)。

const CACHE_VERSION = 'mekuru-runtime-v2'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json']
const PROTECTED_PREFIXES = ['/decks', '/history', '/search', '/settings', '/struggling', '/review', '/explore']

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 認証必須パスはユーザー固有データを含むため、キャッシュの読み書きを一切行わず
  // 常にネットワークへ流す（オフライン時はオフライン案内ページのみ表示）。
  if (isProtectedPath(url.pathname)) {
    if (request.mode === 'navigate') {
      event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL))))
    } else {
      event.respondWith(fetch(request))
    }
    return
  }

  // ページ遷移(ナビゲーション)は、まずネットワークを試し、
  // 失敗したら最後にキャッシュしたHTML、それも無ければオフライン案内ページを返す
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached ?? (await caches.match(OFFLINE_URL))
        })
    )
    return
  }

  // 静的アセット等は、キャッシュがあればそれを即返しつつ裏でネットワーク取得して更新する
  // (stale-while-revalidate)。初回アクセス時はネットワークから取得しキャッシュへ保存する。
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request)
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone())
          }
          return response
        })
        .catch(() => cached)
      return cached ?? networkFetch
    })
  )
})
