'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';
import { GeneralEventQuestion, GeneralEventQuestionType } from '@/lib/generalEventApi';

interface RegistrationQuestionsBuilderProps {
  questions: GeneralEventQuestion[];
  onChange: (questions: GeneralEventQuestion[]) => void;
}

const QUESTION_TYPES: GeneralEventQuestionType[] = ['SINGLE_CHOICE', 'MULTI_CHOICE', 'FREE_TEXT'];

/**
 * Admin editor for the optional registration questions of a general event.
 * Lets the organizer add questions (single/multi choice or free text) with their options.
 */
export default function RegistrationQuestionsBuilder({ questions, onChange }: RegistrationQuestionsBuilderProps) {
  const { t } = useTranslation();

  const addQuestion = () => {
    onChange([
      ...questions,
      { label: '', inputType: 'SINGLE_CHOICE', required: false, sortOrder: questions.length, options: [] },
    ]);
  };

  const updateQuestion = (index: number, patch: Partial<GeneralEventQuestion>) => {
    const prev = questions[index];
    const typeChanged = !!patch.inputType && patch.inputType !== prev.inputType;
    const next = [...questions];
    // Switching answer type clears any previously configured options
    next[index] = { ...next[index], ...patch, options: typeChanged ? [] : next[index].options };
    onChange(next);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const addOption = (qIndex: number) => {
    const next = [...questions];
    const question = next[qIndex];
    next[qIndex] = {
      ...question,
      options: [...question.options, { label: '', sortOrder: question.options.length }],
    };
    onChange(next);
  };

  const updateOption = (qIndex: number, oIndex: number, label: string) => {
    const next = [...questions];
    const options = [...next[qIndex].options];
    options[oIndex] = { ...options[oIndex], label };
    next[qIndex] = { ...next[qIndex], options };
    onChange(next);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const next = [...questions];
    next[qIndex] = {
      ...next[qIndex],
      options: next[qIndex].options.filter((_, i) => i !== oIndex),
    };
    onChange(next);
  };

  const inputClass =
    'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const labelClass = 'text-sm font-medium text-stone-600 mb-1 block';

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wide">{t('general_events.questions.title')}</h2>
          <p className="text-xs text-stone-400 mt-1">{t('general_events.questions.hint')}</p>
        </div>
        <button
          type="button"
          onClick={addQuestion}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('general_events.questions.add_question')}
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-sm italic text-stone-400">{t('general_events.questions.empty_hint')}</p>
      )}

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div key={q.id ?? `question-${qIndex}`} className="border border-stone-200 rounded-lg p-4 bg-stone-50/50">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              <div className="md:col-span-6">
                <label className={labelClass}>{t('general_events.questions.label')} *</label>
                <input
                  type="text"
                  value={q.label}
                  onChange={e => updateQuestion(qIndex, { label: e.target.value })}
                  placeholder={t('general_events.questions.label_placeholder')}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>{t('general_events.questions.type')}</label>
                <select
                  value={q.inputType}
                  onChange={e => updateQuestion(qIndex, { inputType: e.target.value as GeneralEventQuestionType })}
                  className={inputClass}
                >
                  {QUESTION_TYPES.map(type => (
                    <option key={type} value={type}>{t(`general_events.questions.type_${type}`)}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id={`question-required-${qIndex}`}
                  checked={q.required}
                  onChange={e => updateQuestion(qIndex, { required: e.target.checked })}
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor={`question-required-${qIndex}`} className="text-sm text-stone-700 whitespace-nowrap">
                  {t('general_events.questions.required')}
                </label>
              </div>
              <div className="md:col-span-1 flex justify-end mt-5">
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  title={t('common.remove')}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {q.inputType !== 'FREE_TEXT' && (
              <div className="mt-4 pl-1">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">{t('general_events.questions.options')}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={opt.id ?? `option-${qIndex}-${oIndex}`} className="flex items-center gap-2">
                      <span className="text-stone-400 text-sm w-5 text-right">{oIndex + 1}.</span>
                      <input
                        type="text"
                        value={opt.label}
                        onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={t('general_events.questions.option_placeholder', { n: String(oIndex + 1) })}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        title={t('common.remove')}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {t('general_events.questions.add_option')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
