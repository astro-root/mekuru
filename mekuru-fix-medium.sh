#!/usr/bin/env bash
# mekuru レビュー指摘 Medium優先度3件の自動修正パッチ
# 実行場所: リポジトリのルート (package.json がある場所)
set -euo pipefail

if [ ! -f package.json ] || [ ! -d src ]; then
  echo "エラー: リポジトリのルートで実行してください (package.json / src が見つかりません)" >&2
  exit 1
fi

echo "==> [1/3] next.config.ts の allowedOrigins から開発用ドメインを本番ビルドで除外"
CONFIG_FILE="next.config.ts"
if [ -f "$CONFIG_FILE" ] && grep -q '"\*.app.github.dev"' "$CONFIG_FILE" && ! grep -q "isDev" "$CONFIG_FILE"; then
  cat > "$CONFIG_FILE" <<'EOF'
import type { NextConfig } from "next";

// 本番ビルドではGitHub Codespaces等の開発用ワイルドカードドメインを
// Server Actionsのallowed origin(CSRF対策)に含めない。
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        ...(isDev ? ["*.app.github.dev"] : []),
      ],
    },
  },
};

export default nextConfig;
EOF
  echo "    修正完了: $CONFIG_FILE"
else
  echo "    スキップ（対象コードが見つからないか既に修正済み）"
fi

echo "==> [2/3] Service Workerが認証必須パスをキャッシュしないよう修正"
SW_FILE="public/sw.js"
if [ -f "$SW_FILE" ] && ! grep -q "PROTECTED_PREFIXES" "$SW_FILE"; then
  cp "$SW_FILE" "${SW_FILE}.bak"
  cat > "$SW_FILE" <<'EOF'
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
const PROTECTED_PREFIXES = ['/decks', '/history', '/search', '/settings', '/struggling', '/review']

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
EOF
  echo "    修正完了: $SW_FILE (元ファイルは ${SW_FILE}.bak に退避)"
  echo "    注意: CACHE_VERSION を v1->v2 に上げたので、デプロイ後クライアントの旧キャッシュは自動破棄されます"
else
  echo "    スキップ: $SW_FILE（対象コードが見つからないか既に修正済み）"
fi

echo "==> [3/3] xlsx パッケージの既知脆弱性を確認 (自動修正はしません)"
if [ -f package.json ] && grep -q '"xlsx"' package.json; then
  echo "    現在のバージョン指定:"
  grep '"xlsx"' package.json | sed 's/^/      /'
  echo "    npm audit (xlsx関連のみ抜粋):"
  npm audit --json 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print('      npm audit の実行/解析に失敗しました。手動で npm audit を確認してください。')
    sys.exit(0)
vulns = data.get('vulnerabilities', {})
xlsx = vulns.get('xlsx')
if xlsx:
    print(json.dumps(xlsx, ensure_ascii=False, indent=2))
else:
    print('      npm audit 上は xlsx 自体の既知CVEは検出されませんでした。')
    print('      ただし npm registry 配布版(0.18.5が最新)はSheetJS公式が')
    print('      「セキュリティ修正はCDN配布版(cdn.sheetjs.com)のみで行う」と明言しているため、')
    print('      npm audit の結果に関わらず、インポート機能の入力検証・サイズ制限は別途強化を推奨します。')
"
else
  echo "    スキップ（package.jsonにxlsxの記載が見つかりません）"
fi

echo ""
echo "==> 完了。差分を確認してください:"
echo "    git diff --stat"
echo "    npm run build  # 型エラー・構文エラーがないか確認"
