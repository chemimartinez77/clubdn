import { useTheme } from '../hooks/useTheme';
import { themes } from '../config/themes';
import type { ThemeName } from '../config/themes';

export default function ThemeSelector() {
  const { themeName, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300">Tema:</span>
      <div className="flex gap-2">
        {(Object.keys(themes) as ThemeName[]).map((name) => {
          const theme = themes[name];
          const isActive = themeName === name;

          return (
            <button
              key={name}
              onClick={() => setTheme(name)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
              style={
                isActive
                  ? {
                      backgroundColor: theme.colors.primary,
                      boxShadow: `0 10px 25px -5px ${theme.colors.primary}50`,
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
