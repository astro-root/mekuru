const CLOZE_PATTERN = /\{\{c\d+::(.+?)\}\}/g

export function renderClozeQuestion(text: string): string {
  return text.replace(CLOZE_PATTERN, '【   】')
}

export function renderClozeAnswer(text: string): string {
  return text.replace(CLOZE_PATTERN, (_, word: string) => word)
}
