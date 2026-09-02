'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  GeneralEventQuestion,
  GeneralEventQuestionAnswer,
  GeneralEventRegistrationAnswer,
} from '@/lib/generalEventApi';

export interface RegistrationQuestionAnswersProps {
  questions: GeneralEventQuestion[];
  answers: GeneralEventQuestionAnswer[];
  onChange: (answers: GeneralEventQuestionAnswer[]) => void;
}

const inputClass =
  'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

/** One empty entry per question, used to seed the answers form. */
export function createAnswersForQuestions(questions: GeneralEventQuestion[]): GeneralEventQuestionAnswer[] {
  return questions.map(q => ({ questionId: q.id!, optionIds: [], freeText: '', numericValue: undefined }));
}

/** Convert read-model registration answers back into editable answer entries (admin edit). */
export function answersFromRegistration(
  questions: GeneralEventQuestion[],
  regAnswers: GeneralEventRegistrationAnswer[],
): GeneralEventQuestionAnswer[] {
  return questions.map(q => {
    const found = (regAnswers || []).find(a => a.questionId === q.id);
    if (!found) {
      return { questionId: q.id!, optionIds: [], freeText: '', numericValue: undefined };
    }
    return {
      questionId: q.id!,
      optionIds: found.optionIds || [],
      freeText: found.freeText || '',
      numericValue: found.numericValue ?? undefined,
    };
  });
}

/** Labels of required questions that have no answer yet. */
export function missingRequiredAnswers(
  questions: GeneralEventQuestion[],
  answers: GeneralEventQuestionAnswer[],
): string[] {
  const answered = new Map<number, GeneralEventQuestionAnswer>();
  for (const a of answers || []) {
    answered.set(a.questionId, a);
  }
  const missing: string[] = [];
  for (const q of questions) {
    if (!q.required) continue;
    const a = answered.get(q.id!);
    const hasOption = (a?.optionIds?.length ?? 0) > 0;
    const hasText = !!a?.freeText && a.freeText.trim().length > 0;
    const hasNumber = a?.numericValue !== undefined && a?.numericValue !== null;
    if (!hasOption && !hasText && !hasNumber) {
      missing.push(q.label);
    }
  }
  return missing;
}

/**
 * Controlled inputs for a list of registration questions. The parent owns the
 * {@code answers} array (only questions with a real answer are kept).
 */
export default function RegistrationQuestionAnswers({
  questions,
  answers,
  onChange,
}: RegistrationQuestionAnswersProps) {
  const { t } = useTranslation();

  const current = (q: GeneralEventQuestion): GeneralEventQuestionAnswer =>
    (answers || []).find(a => a.questionId === q.id) ?? {
      questionId: q.id!,
      optionIds: [],
      freeText: '',
      numericValue: undefined,
    };

  const setAnswer = (q: GeneralEventQuestion, patch: Partial<GeneralEventQuestionAnswer>) => {
    const prev = current(q);
    const nextEntry: GeneralEventQuestionAnswer = {
      questionId: q.id!,
      optionIds: patch.optionIds ?? prev.optionIds ?? [],
      freeText: patch.freeText !== undefined ? patch.freeText : prev.freeText ?? '',
      numericValue: patch.numericValue !== undefined ? patch.numericValue : prev.numericValue,
    };
    let list = (answers || []).filter(a => a.questionId !== q.id);
    const hasContent =
      (nextEntry.optionIds?.length ?? 0) > 0 ||
      (nextEntry.freeText ?? '').trim().length > 0 ||
      (nextEntry.numericValue !== undefined && nextEntry.numericValue !== null);
    if (hasContent) {
      list = [...list, nextEntry];
    }
    onChange(list);
  };

  const toggleOption = (q: GeneralEventQuestion, optionId: number) => {
    const prev = current(q);
    if (q.inputType === 'SINGLE_CHOICE') {
      setAnswer(q, { optionIds: [optionId] });
      return;
    }
    const currentIds = prev.optionIds ?? [];
    const has = currentIds.includes(optionId);
    setAnswer(q, { optionIds: has ? currentIds.filter(id => id !== optionId) : [...currentIds, optionId] });
  };

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {questions.map(q => {
        const value = current(q);
        return (
          <div key={q.id ?? q.label}>
            <p className="text-sm font-medium text-stone-700 mb-2">
              {q.label}
              {q.required && <span className="text-red-500 ml-0.5">*</span>}
            </p>

            {q.inputType === 'FREE_TEXT' && (
              <input
                type="text"
                value={value.freeText ?? ''}
                onChange={e => setAnswer(q, { freeText: e.target.value })}
                placeholder={t('general_events.questions.answer_placeholder')}
                className={inputClass}
              />
            )}

            {q.inputType === 'NUMBER' && (
              <input
                type="number"
                step="any"
                value={value.numericValue === undefined || value.numericValue === null ? '' : String(value.numericValue)}
                onChange={e => {
                  const raw = e.target.value.trim();
                  setAnswer(q, { numericValue: raw === '' ? undefined : Number(raw) });
                }}
                placeholder={t('general_events.questions.answer_placeholder')}
                className={inputClass}
              />
            )}

            {(q.inputType === 'SINGLE_CHOICE' || q.inputType === 'MULTI_CHOICE') && (
              <div className="space-y-2">
                {q.options.map(opt => {
                  const checked = (value.optionIds ?? []).includes(opt.id!);
                  if (q.inputType === 'SINGLE_CHOICE') {
                    return (
                      <label key={opt.id ?? opt.label} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          checked={checked}
                          onChange={() => opt.id && toggleOption(q, opt.id)}
                          className="rounded-full border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-stone-700">{opt.label}</span>
                      </label>
                    );
                  }
                  return (
                    <label key={opt.id ?? opt.label} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => opt.id && toggleOption(q, opt.id)}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-stone-700">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
