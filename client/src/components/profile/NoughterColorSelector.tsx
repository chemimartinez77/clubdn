// client/src/components/profile/NoughterColorSelector.tsx
import { useTheme } from '../../hooks/useTheme';
import type { ThemeName } from '../../config/themes';

interface NoughterColorSelectorProps {
  selectedColor: string | null;
  onChange: (color: string | null) => void;
}

const colorOptions: Array<{ value: ThemeName | null; label: string; preview: string }> = [
  { value: null, label: 'Automático (según tema)', preview: 'auto' },
  { value: 'purple', label: 'Púrpura', preview: '#9333ea' },
  { value: 'blue', label: 'Azul', preview: '#1e40af' },
  { value: 'green', label: 'Verde', preview: '#047857' },
  { value: 'red', label: 'Rojo', preview: '#b91c1c' },
  { value: 'brown', label: 'Marrón', preview: '#92400e' },
  { value: 'black', label: 'Negro', preview: '#18181b' }
];

export default function NoughterColorSelector({ selectedColor, onChange }: NoughterColorSelectorProps) {
  const { themeName } = useTheme();

  // Determinar el color real que se mostrará: preferencia del usuario o tema actual
  const effectiveColor = selectedColor || themeName;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-3">
          Color de Noughter
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {colorOptions.map((option) => {
            const isSelected = (selectedColor === null && option.value === null) ||
                             (selectedColor === option.value);

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onChange(option.value)}
                className={`
                  relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                  ${isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-cardBorder)] hover:border-[var(--color-inputBorder)] bg-[var(--color-cardBackground)]'
                  }
                `}
              >
                {/* Preview */}
                <div className="flex-shrink-0">
                  {option.preview === 'auto' ? (
                    <div className="w-10 h-10 rounded-full border-2 border-[var(--color-inputBorder)] flex items-center justify-center bg-gradient-to-br from-purple-400 via-blue-400 to-green-400">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full border-2 border-[var(--color-cardBorder)]"
                      style={{ backgroundColor: option.preview }}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                    {option.label}
                  </p>
                </div>

                {/* Checkmark */}
                {isSelected && (
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview del Noughter */}
      <div className="bg-[var(--color-tableRowHover)] rounded-lg p-4 border border-[var(--color-cardBorder)]">
        <p className="text-xs font-medium text-[var(--color-textSecondary)] mb-3">Vista previa</p>
        <div className="flex items-center justify-center">
          <img
            src={`/noughter.${effectiveColor}.png`}
            alt="Vista previa de Noughter"
            className="w-24 h-24 object-contain"
          />
        </div>
        <p className="text-xs text-[var(--color-textSecondary)] text-center mt-2">
          {selectedColor === null
            ? `Se usará el color de tu tema actual (${colorOptions.find(o => o.value === themeName)?.label})`
            : `Noughter ${colorOptions.find(o => o.value === selectedColor)?.label}`}
        </p>
      </div>
    </div>
  );
}

