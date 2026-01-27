// client/src/components/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const inputClasses = `
      w-full px-4 py-2 rounded-lg border bg-[var(--color-inputBackground)] text-[var(--color-inputText)] transition-colors
      ${error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-[var(--color-inputBorder)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
      }
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-[var(--color-tableRowHover)] disabled:cursor-not-allowed
      ${className}
    `.trim();

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />

        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-[var(--color-textSecondary)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

