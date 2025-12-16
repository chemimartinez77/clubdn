/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primaryDark)',
          light: 'var(--color-primaryLight)',
          50: 'color-mix(in srgb, var(--color-primary) 5%, white)',
          100: 'color-mix(in srgb, var(--color-primary) 10%, white)',
          200: 'color-mix(in srgb, var(--color-primary) 20%, white)',
          300: 'color-mix(in srgb, var(--color-primary) 30%, white)',
          400: 'color-mix(in srgb, var(--color-primary) 50%, white)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary)',
          700: 'var(--color-primaryDark)',
          800: 'color-mix(in srgb, var(--color-primaryDark) 80%, black)',
          900: 'color-mix(in srgb, var(--color-primaryDark) 60%, black)',
        },
        // Map purple to primary for backward compatibility
        purple: {
          50: 'color-mix(in srgb, var(--color-primary) 5%, white)',
          100: 'color-mix(in srgb, var(--color-primary) 10%, white)',
          200: 'color-mix(in srgb, var(--color-primary) 20%, white)',
          300: 'color-mix(in srgb, var(--color-primary) 30%, white)',
          400: 'color-mix(in srgb, var(--color-primary) 50%, white)',
          500: 'var(--color-primaryLight)',
          600: 'var(--color-primary)',
          700: 'var(--color-primaryDark)',
          800: 'color-mix(in srgb, var(--color-primaryDark) 80%, black)',
          900: 'color-mix(in srgb, var(--color-primaryDark) 60%, black)',
        },
        // Map indigo to primary variations
        indigo: {
          50: 'color-mix(in srgb, var(--color-primary) 5%, white)',
          100: 'color-mix(in srgb, var(--color-primary) 10%, white)',
          200: 'color-mix(in srgb, var(--color-primary) 20%, white)',
          300: 'color-mix(in srgb, var(--color-primary) 30%, white)',
          400: 'color-mix(in srgb, var(--color-primary) 50%, white)',
          500: 'var(--color-primary)',
          600: 'var(--color-primaryDark)',
          700: 'color-mix(in srgb, var(--color-primaryDark) 80%, black)',
          800: 'color-mix(in srgb, var(--color-primaryDark) 70%, black)',
          900: 'color-mix(in srgb, var(--color-primaryDark) 50%, black)',
        },
        surface: 'var(--color-surface)',
        'theme-text': 'var(--color-text)',
        'theme-text-secondary': 'var(--color-textSecondary)',
        'theme-border': 'var(--color-border)',
        'theme-hover': 'var(--color-hover)',
        accent: 'var(--color-accent)',
      },
      backgroundColor: {
        'theme-bg': 'var(--color-background)',
      },
    },
  },
}
