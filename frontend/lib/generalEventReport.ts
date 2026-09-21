import type { GeneralEventRegistration } from './generalEventApi';

/**
 * A question as printed in the event report. Built from the event's
 * `registrationQuestions` + `GET /general-events/{id}/registration-questions/summary`,
 * plus any question that only survives on registrations (removed from the event later).
 */
export interface EventReportQuestion {
  questionId: number;
  label: string;
  inputType: string;
  /** Localized answer type shown in the export (falls back to the raw `inputType`). */
  typeLabel?: string;
  answeredCount: number;
  totals: { optionId: number; optionLabel: string; count: number }[];
  numericSum: number | string | null;
  numericAverage: number | string | null;
}

/** Localized values injected by the page (i18n stays out of this module). */
export interface EventReportLabels {
  member: string;
  nonMember: string;
  sum: string;
  average: string;
}

/** Share of the respondents that gave this answer, e.g. `"67%"` (empty when nobody answered). */
export function answerShare(count: number, answered: number): string {
  return answered > 0 ? `${Math.round((count / answered) * 100)}%` : '';
}

/**
 * Builds the body of the event's answers CSV: **one row per registrant answer**, so the
 * export shows who answered what next to how many people gave the same answer and what
 * share of the respondents that is.
 *
 * Row shape (headers come from {@link answerReportHeaders}):
 * `name, email, phone, registrant type, party size, question, answer type, answer, count, answered, share`
 *
 * - `MULTI_CHOICE` → one row per selected option (matches how the counts are tallied)
 * - `SINGLE_CHOICE` → one row with the chosen option
 * - `FREE_TEXT` / `NUMBER` → one row with the registrant's own answer
 * - `NUMBER` questions additionally get a trailing total/average row (registrant columns blank)
 * - a question nobody answered still gets a placeholder row so it stays visible
 */
export function buildAnswerReportRows(
  questions: EventReportQuestion[],
  registrations: GeneralEventRegistration[],
  labels: EventReportLabels
): string[][] {
  const rows: string[][] = [];

  for (const question of questions) {
    // Branch on the raw enum, print the localized label
    const inputType = question.inputType;
    const type = question.typeLabel || inputType;
    const answered = String(question.answeredCount);
    const optionCounts = new Map(question.totals.map(total => [total.optionId, total.count]));
    const occurrenceCounts = new Map(collectAnswerOccurrences(registrations, question.questionId));
    const start = rows.length;

    for (const reg of registrations) {
      const answer = (reg.answers ?? []).find(a => a.questionId === question.questionId);
      const values = answer?.values ?? [];
      const optionIds = answer?.optionIds ?? [];
      if (!answer || values.length === 0) continue;

      const registrant = [
        reg.name || '',
        reg.email || '',
        reg.phoneNumber || '',
        reg.registrantType === 'MEMBER' ? labels.member : labels.nonMember,
        String(reg.partySize ?? 1),
      ];

      if (inputType === 'MULTI_CHOICE' && optionIds.length > 0) {
        optionIds.forEach((optionId, index) => {
          const count = optionCounts.get(optionId) ?? 0;
          rows.push([
            ...registrant,
            question.label,
            type,
            values[index] ?? '',
            String(count),
            answered,
            answerShare(count, question.answeredCount),
          ]);
        });
        continue;
      }

      if (optionIds.length > 0) {
        const count = optionCounts.get(optionIds[0]) ?? 0;
        rows.push([
          ...registrant,
          question.label,
          type,
          values.join(', '),
          String(count),
          answered,
          answerShare(count, question.answeredCount),
        ]);
        continue;
      }

      // Free text / numeric answer — count how often the same value was given
      const value = values.join(', ');
      const count = occurrenceCounts.get(value.trim()) ?? 1;
      rows.push([
        ...registrant,
        question.label,
        type,
        value,
        String(count),
        answered,
        answerShare(count, question.answeredCount),
      ]);
    }

    if (inputType === 'NUMBER') {
      if (question.numericSum != null) {
        rows.push(['', '', '', '', '', question.label, type, labels.sum, String(question.numericSum), answered, '']);
      }
      if (question.numericAverage != null) {
        rows.push(['', '', '', '', '', question.label, type, labels.average, String(question.numericAverage), answered, '']);
      }
    }

    if (rows.length === start) {
      rows.push(['', '', '', '', '', question.label, type, '', '0', '0', '']);
    }
  }

  return rows;
}

/** Distinct answers of a question with how often each was given, most frequent first. */
export function collectAnswerOccurrences(
  registrations: GeneralEventRegistration[],
  questionId: number
): [string, number][] {
  const counts = new Map<string, number>();
  for (const reg of registrations) {
    const answer = (reg.answers ?? []).find(a => a.questionId === questionId);
    if (!answer) continue;
    for (const value of answer.values) {
      const key = (value ?? '').trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}