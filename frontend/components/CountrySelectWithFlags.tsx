'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, SVGProps } from 'react';
import { getCountryCallingCode } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

export interface CountrySelectOption {
  value?: string;
  label: string;
  divider?: boolean;
}

export interface CountrySelectWithFlagsProps {
  name?: string;
  value?: string;
  options: CountrySelectOption[];
  onChange: (country?: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  iconComponent?: ComponentType<{ country?: string }>;
  'aria-label'?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
}

type FlagComponent = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>;

const FLAGS = flags as unknown as Record<string, FlagComponent | undefined>;

function dialCode(country?: string): string {
  if (!country) return '';
  try {
    return `+${getCountryCallingCode(country as Country)}`;
  } catch {
    return '';
  }
}

/**
 * Country selector for `react-phone-number-input` that shows a flag, the country
 * name and its dial code in the dropdown (the built-in native `<select/>` can only
 * render text, which left users staring at ISO codes like "NL" / "AC").
 *
 * Props are supplied by `PhoneInput` through the `countrySelectComponent` prop.
 */
export default function CountrySelectWithFlags({
  name,
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  disabled,
  readOnly,
  iconComponent: Icon,
  'aria-label': ariaLabel,
  searchPlaceholder,
  noResultsLabel,
}: CountrySelectWithFlagsProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectable = useMemo(() => options.filter((option) => !option.divider), [options]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return selectable;
    return selectable.filter((option) => {
      const code = dialCode(option.value);
      return (
        option.label.toLowerCase().includes(needle) ||
        (option.value ?? '').toLowerCase().includes(needle) ||
        code.includes(needle)
      );
    });
  }, [selectable, query]);

  const selectedLabel = selectable.find((option) => (option.value ?? '') === (value ?? ''))?.label;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // Reset the cursor whenever the list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  // Keep the highlighted row visible
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  // Move focus into the search box as soon as the dropdown opens
  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  const selectOption = (option: CountrySelectOption) => {
    onChange(option.value);
    setQuery('');
    setOpen(false);
    // Let PhoneInput move focus into the number input (focusInputOnCountrySelection)
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) selectOption(option);
    }
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const TriggerFlag = value ? FLAGS[value] : undefined;

  return (
    <div ref={rootRef} className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={selectedLabel}
        disabled={disabled || readOnly}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={handleTriggerKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        className="mr-1 flex items-center gap-1.5 rounded-md px-1 py-1 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="inline-flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-black/10">
          {TriggerFlag ? <TriggerFlag className="h-full w-full" /> : Icon ? <Icon country={value} /> : null}
        </span>
        <svg className="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          role="presentation"
        >
          <div className="border-b border-gray-100 p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-charcoal focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <ul ref={listRef} role="listbox" aria-label={ariaLabel} className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">{noResultsLabel}</li>
            )}
            {filtered.map((option, index) => {
              const isSelected = (option.value ?? '') === (value ?? '');
              const Flag = option.value ? FLAGS[option.value] : undefined;
              return (
                <li key={option.value ?? 'ZZ'} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                    tabIndex={-1}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? 'bg-emerald-50 font-medium text-emerald-800'
                        : index === activeIndex
                          ? 'bg-gray-50 text-charcoal'
                          : 'text-charcoal'
                    }`}
                  >
                    <span className="inline-flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-black/10">
                      {Flag ? <Flag className="h-full w-full" /> : Icon ? <Icon country={option.value} /> : null}
                    </span>
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="shrink-0 text-xs tabular-nums text-gray-400">{dialCode(option.value)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
