/**
 * RLS越権アクセステスト
 *
 * ユーザーA(自分)が作成したデータに、ユーザーB(別アカウント)がアクセスできないことを確認する。
 * anon keyのみを使い、実際のクライアントと同じ経路(RLS適用状態)でテストする。
 *
 * 実行方法:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   TEST_USER_A_EMAIL=a@example.com TEST_USER_A_PASSWORD=xxxxxxxx \
 *   TEST_USER_B_EMAIL=b@example.com TEST_USER_B_PASSWORD=xxxxxxxx \
 *   node scripts/rls-check.mjs
 *
 * TEST_USER_A / TEST_USER_B は事前にSupabase Authへ登録済みの、
 * 本番データに影響しない検証専用アカウントを指定すること。
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const emailA = process.env.TEST_USER_A_EMAIL
const passwordA = process.env.TEST_USER_A_PASSWORD
const emailB = process.env.TEST_USER_B_EMAIL
const passwordB = process.env.TEST_USER_B_PASSWORD

if (!url || !anonKey || !emailA || !passwordA || !emailB || !passwordB) {
  console.error(
    'エラー: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD / TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD を全て設定してください。'
  )
  process.exit(1)
}

let passCount = 0
let failCount = 0

function report(label, ok, detail) {
  if (ok) {
    passCount++
    console.log(`OK   ${label}`)
  } else {
    failCount++
    console.log(`FAIL ${label}${detail ? ' — ' + detail : ''}`)
  }
}

async function signIn(email, password) {
  const client = createClient(url, anonKey)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`ログイン失敗(${email}): ${error?.message ?? '不明なエラー'}`)
  }
  return client
}

async function main() {
  console.log('--- RLS越権アクセステスト開始 ---\n')

  const clientA = await signIn(emailA, passwordA)
  const clientB = await signIn(emailB, passwordB)

  // 1. ユーザーAでテスト用デッキ・カードを作成
  const { data: deck, error: deckError } = await clientA
    .from('decks')
    .insert({ name: '[RLSテスト用] 削除してください', new_cards_per_day: 20 })
    .select('id')
    .single()
  if (deckError || !deck) {
    console.error('セットアップ失敗: デッキの作成に失敗しました', deckError?.message)
    process.exit(1)
  }
  const deckId = deck.id

  const { data: card, error: cardError } = await clientA
    .from('cards')
    .insert({ deck_id: deckId, front: 'RLSテスト表', back: 'RLSテスト裏', position: 1 })
    .select('id')
    .single()
  if (cardError || !card) {
    console.error('セットアップ失敗: カードの作成に失敗しました', cardError?.message)
    process.exit(1)
  }
  const cardId = card.id

  await clientA.from('card_reviews').insert({
    user_id: (await clientA.auth.getUser()).data.user.id,
    card_id: cardId,
    due: new Date().toISOString(),
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 1,
    lapses: 0,
    state: 1,
  })

  console.log(`セットアップ完了: deckId=${deckId}, cardId=${cardId}\n`)

  // 2. ユーザーBが、ユーザーAのデータへアクセスできないことを確認
  const { data: readDeck } = await clientB.from('decks').select('*').eq('id', deckId)
  report('B: Aのdeckをselectして0件であること', (readDeck ?? []).length === 0)

  const { data: readCard } = await clientB.from('cards').select('*').eq('id', cardId)
  report('B: Aのcardをselectして0件であること', (readCard ?? []).length === 0)

  const { data: readReview } = await clientB.from('card_reviews').select('*').eq('card_id', cardId)
  report('B: Aのcard_reviewsをselectして0件であること', (readReview ?? []).length === 0)

  const { error: updateError, count: updateCount } = await clientB
    .from('decks')
    .update({ name: '乗っ取り成功' })
    .eq('id', deckId)
    .select('*', { count: 'exact' })
  report(
    'B: Aのdeckをupdateできない(0件更新)こと',
    !updateError && (updateCount ?? 0) === 0,
    updateError?.message
  )

  const { error: insertCardError } = await clientB
    .from('cards')
    .insert({ deck_id: deckId, front: '不正挿入', back: '不正挿入', position: 99 })
  report('B: Aのdeckへcardをinsertできないこと', !!insertCardError, insertCardError ? undefined : '挿入が成功してしまった')

  const { error: deleteError, count: deleteCount } = await clientB
    .from('cards')
    .delete()
    .eq('id', cardId)
    .select('*', { count: 'exact' })
  report(
    'B: Aのcardをdeleteできない(0件削除)こと',
    !deleteError && (deleteCount ?? 0) === 0,
    deleteError?.message
  )

  // 3. 後片付け(ユーザーA自身で削除)
  await clientA.from('decks').delete().eq('id', deckId)

  console.log(`\n--- 結果: ${passCount} OK / ${failCount} FAIL ---`)
  if (failCount > 0) {
    console.log('FAILがある場合、該当テーブルのRLSポリシーを至急確認してください。')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('テスト実行中にエラーが発生しました:', e.message)
  process.exit(1)
})
