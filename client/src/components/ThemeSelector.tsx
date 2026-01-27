import { useTheme } from '../hooks/useTheme';
import { themes } from '../config/themes';
import type { ThemeName } from '../config/themes';

export default function ThemeSelector() {
  const { themeName, setTheme, themeMode, setThemeMode } = useTheme();

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-textSecondary)]">
        <span>Tema:</span>
        <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-1">
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              themeMode === 'light'
                ? 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Claro
          </button>
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              themeMode === 'dark'
                ? 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Oscuro
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full">
        {(Object.keys(themes) as ThemeName[]).map((name) => {
          const theme = themes[name];
          const isActive = themeName === name;
          const activePrimary = theme.colors[themeMode].primary;

          return (
            <button
              key={name}
              onClick={() => setTheme(name)}
              className={`
                w-full px-4 py-2 rounded-lg text-left text-sm font-medium transition-all
                ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-500/50'
                    : 'bg-[var(--color-cardBackground)] text-[var(--color-textSecondary)] border border-[var(--color-cardBorder)] hover:bg-[var(--color-tableRowHover)]'
                }
              `}
              style={
                isActive
                  ? {
                      backgroundColor: activePrimary,
                      boxShadow: `0 10px 25px -5px ${activePrimary}50`,
                    }
                  : undefined
              }
            >
              {theme.displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
