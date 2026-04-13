'use client';

import { useState, useRef, useEffect } from 'react';
import { useDateFormat } from '@/lib/DateFormatContext';
import { applyDateFormat, parseDateWithFormat, dateFormatToPlaceholder } from '@/lib/utils';

interface DateInputProps {
  name?: string;
  value: string; // ISO yyyy-MM-dd
  onChange: (isoDate: string) => void;
  required?: boolean;
  className?: string;
}

/**
 * Date input that respects the configured date format.
 *
 * Shows a text input with the app's date format as placeholder.
 * Includes a calendar button that opens the native date picker as fallback.
 * Stores and emits ISO yyyy-MM-dd values.
 */
export default function DateInput({ name, value, onChange, required, className = '' }: DateInputProps) {
  const { dateFormat } = useDateFormat();
  const [textValue, setTextValue] = useState('');
  const [error, setError] = useState(false);
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Sync display text when the ISO value changes externally
  useEffect(() => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-').map(Number);
      const formatted = applyDateFormat(new Date(y, m - 1, d), dateFormat);
      setTextValue(formatted);
      setError(false);
    } else if (!value) {
      setTextValue('');
      setError(false);
    }
  }, [value, dateFormat]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);

    if (!raw.trim()) {
      onChange('');
      setError(false);
      return;
    }

    const parsed = parseDateWithFormat(raw, dateFormat);
    if (parsed) {
      onChange(parsed);
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleBlur = () => {
    // On blur, re-format the display if we have a valid ISO value
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-').map(Number);
      setTextValue(applyDateFormat(new Date(y, m - 1, d), dateFormat));
      setError(false);
    } else if (textValue.trim()) {
      setError(true);
    }
  };

  const handleCalendarClick = () => {
    hiddenDateRef.current?.showPicker?.();
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value; // yyyy-MM-dd
    if (isoVal) {
      onChange(isoVal);
    }
  };

  const borderColor = error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-emerald-500';

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        value={textValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        required={required}
        placeholder={dateFormatToPlaceholder(dateFormat)}
        className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:border-transparent transition ${borderColor} ${className}`}
      />
      {/* Calendar icon button */}
      <button
        type="button"
        onClick={handleCalendarClick}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
        aria-label="Open calendar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      {/* Hidden native date input for the calendar picker */}
      <input
        ref={hiddenDateRef}
        type="date"
        value={value}
        onChange={handleNativeDateChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
