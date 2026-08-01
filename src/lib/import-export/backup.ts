import { z } from 'zod'

export const BACKUP_SCHEMA_VERSION = 1
export const MAX_BACKUP_CARDS = 5000

export const backupReviewSchema = z
  .object({
    due: z.string(),
    stability: z.number(),
    difficulty: z.number(),
    elapsed_days: z.number(),
    scheduled_days: z.number(),
    reps: z.number().int().min(0),
    lapses: z.number().int().min(0),
    state: z.number().int().min(0),
    last_review: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

export const backupCardSchema = z.object({
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(2000),
  card_type: z.enum(['basic', 'cloze']).default('basic'),
  cloze_text: z.string().max(2000).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  review: backupReviewSchema,
})

export const backupSchema = z.object({
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string(),
  deck: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable().optional(),
    genre: z.string().max(50).nullable().optional(),
    difficulty: z.number().int().min(1).max(5).optional(),
  }),
  cards: z.array(backupCardSchema).max(MAX_BACKUP_CARDS),
})

export type DeckBackup = z.infer<typeof backupSchema>
export type BackupCard = z.infer<typeof backupCardSchema>

export function downloadJsonBackup(deckName: string, backup: DeckBackup) {
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${deckName}-backup.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
