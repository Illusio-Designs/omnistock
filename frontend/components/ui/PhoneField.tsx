'use client';

import { ReactNode } from 'react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { cn } from '@/lib/utils';

interface PhoneFieldProps {
  label?: ReactNode;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Phone input with country flag selector. Wraps react-international-phone
 * to match the look-and-feel of the existing <Input> component.
 *
 * Returns the value in E.164 format (e.g. "+919876543210"). An empty input
 * still emits the dial code prefix (e.g. "+91"); treat that as "no value"
 * by checking `value.length <= 4` if the field is optional.
 *
 * Use isPhoneValid() in this same file to validate on submit.
 */
export function PhoneField({
  label,
  hint,
  error,
  value,
  onChange,
  defaultCountry = 'in',
  disabled,
  required,
  placeholder,
  className,
}: PhoneFieldProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      <PhoneInput
        defaultCountry={defaultCountry}
        value={value}
        onChange={(phone) => onChange(phone)}
        disabled={disabled}
        placeholder={placeholder ?? 'Phone number'}
        // Keep the dial code inline with the digits ("+91 98765 43210") and
        // lock it so the user can't accidentally delete it. Matches the
        // reference design and modern intl phone-input UX.
        forceDialCode
        className={cn('phone-field', error && 'phone-field--error')}
        inputClassName="phone-field__input"
        countrySelectorStyleProps={{
          buttonClassName: 'phone-field__country-button',
          dropdownStyleProps: {
            className: 'phone-field__dropdown',
            listItemClassName: 'phone-field__dropdown-item',
            listItemSelectedClassName: 'phone-field__dropdown-item--selected',
            listItemFocusedClassName: 'phone-field__dropdown-item--focused',
            listItemCountryNameClassName: 'phone-field__dropdown-name',
            listItemDialCodeClassName: 'phone-field__dropdown-dial',
          },
        }}
      />
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
    </div>
  );
}

/**
 * Returns true if the value is an empty E.164 stub (just a dial code,
 * no actual subscriber digits). Useful for treating an unfilled optional
 * phone field as absent.
 */
export function isPhoneEmpty(value: string): boolean {
  if (!value) return true;
  const digits = value.replace(/\D/g, '');
  // E.164 numbers are at least 4 digits beyond the dial code; if we have
  // only the country code (1-4 digits), consider it empty.
  return digits.length <= 4;
}

/**
 * Validate an E.164 phone string. Empty input is allowed unless `required`.
 * Format check only (no carrier-specific length lookup) to keep the
 * bundle small. Returns null on success, or an error message string.
 */
export function validatePhone(value: string, opts: { required?: boolean } = {}): string | null {
  if (isPhoneEmpty(value)) {
    return opts.required ? 'Phone number is required' : null;
  }
  // E.164 format: leading "+", 8-15 digits total
  if (!/^\+\d{8,15}$/.test(value.replace(/[\s()-]/g, ''))) {
    return 'Enter a valid phone number with country code';
  }
  return null;
}
