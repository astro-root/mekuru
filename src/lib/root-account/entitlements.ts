// るーとの研究室 Root Account の entitlements 判定ロジック。
// QuizNaviと同一内容(root-accountリポジトリの packages/sdk/src/entitlements.ts と同期させること)。
// @rootlab/account-sdk をnpm配布するまでの暫定コピー。

export type PlanTier = 'bachelor' | 'master' | 'doctor'
export type PlanStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'none'

export interface Entitlements {
  plan: PlanTier
  planStatus: PlanStatus
  userId: string
}

const PLAN_RANK: Record<PlanTier, number> = {
  bachelor: 0,
  master: 1,
  doctor: 2,
}

export function decodeEntitlements(accessToken: string): Entitlements | null {
  const parts = accessToken.split('.')
  if (parts.length !== 3) return null

  try {
    const payloadJson = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf-8')
    const payload = JSON.parse(payloadJson) as {
      sub: string
      plan?: PlanTier
      plan_status?: PlanStatus
    }

    return {
      userId: payload.sub,
      plan: payload.plan ?? 'bachelor',
      planStatus: payload.plan_status ?? 'none',
    }
  } catch {
    return null
  }
}

/** 「博士プランなら修士限定機能も使える」の判定。mekuru固有の機能ゲート(保存容量/AI機能等)に使う。 */
export function hasPlan(entitlements: Entitlements | null, required: PlanTier): boolean {
  if (!entitlements) return false
  if (entitlements.planStatus !== 'active' && entitlements.planStatus !== 'trialing') {
    return required === 'bachelor'
  }
  return PLAN_RANK[entitlements.plan] >= PLAN_RANK[required]
}
