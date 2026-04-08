// client/src/pages/Onboarding.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { useTheme } from '../hooks/useTheme';

interface OnboardingForm {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  iban: string;
  imageConsentActivities: boolean;
  imageConsentSocial: boolean;
}

const EMPTY: OnboardingForm = {
  firstName: '',
  lastName: '',
  dni: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  iban: '',
  imageConsentActivities: false,
  imageConsentSocial: false,
};

export default function Onboarding() {
  const { theme, themeMode } = useTheme();
  const colors = theme.colors[themeMode];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OnboardingForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingForm, string>>>({});

  const mutation = useMutation({
    mutationFn: (data: OnboardingForm) =>
      api.patch('/api/profile/me/onboarding', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      navigate('/', { replace: true });
    },
  });

  function validate(): boolean {
    const e: Partial<Record<keyof OnboardingForm, string>> = {};
    if (!form.firstName.trim()) e.firstName = 'Campo obligatorio';
    if (!form.lastName.trim()) e.lastName = 'Campo obligatorio';
    if (!form.dni.trim()) e.dni = 'Campo obligatorio';
    if (!form.phone.trim()) e.phone = 'Campo obligatorio';
    if (!form.address.trim()) e.address = 'Campo obligatorio';
    if (!form.city.trim()) e.city = 'Campo obligatorio';
    if (!form.province.trim()) e.province = 'Campo obligatorio';
    if (!form.postalCode.trim()) e.postalCode = 'Campo obligatorio';
    if (!form.iban.trim()) e.iban = 'Campo obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  function field(
    name: keyof OnboardingForm,
    label: string,
    opts?: { type?: string; half?: boolean }
  ) {
    return (
      <div className={opts?.half ? 'col-span-1' : 'col-span-2'}>
        <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
          {label} <span style={{ color: colors.accent }}>*</span>
        </label>
        <input
          type={opts?.type ?? 'text'}
          value={form[name] as string}
          onChange={ev => setForm(f => ({ ...f, [name]: ev.target.value }))}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{
            backgroundColor: colors.cardBackground,
            borderColor: errors[name] ? colors.accent : colors.cardBorder,
            color: colors.text,
          }}
        />
        {errors[name] && (
          <p className="text-xs mt-1" style={{ color: colors.accent }}>{errors[name]}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: colors.background }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-lg p-8"
        style={{ backgroundColor: colors.cardBackground, border: `1px solid ${colors.cardBorder}` }}
      >
        {/* Cabecera */}
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: colors.accent }}>
            Club Dreadnought
          </div>
          <h1 className="text-xl font-semibold" style={{ color: colors.text }}>
            Bienvenido al club
          </h1>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
            Antes de continuar necesitamos que completes tu ficha de socio. Solo tendrás que hacerlo una vez.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4">
            {field('firstName', 'Nombre', { half: true })}
            {field('lastName', 'Apellidos', { half: true })}
            {field('dni', 'DNI / NIE', { half: true })}
            {field('phone', 'Teléfono', { half: true })}
            {field('address', 'Dirección')}
            {field('city', 'Ciudad', { half: true })}
            {field('province', 'Provincia', { half: true })}
            {field('postalCode', 'Código Postal', { half: true })}
            {field('iban', 'IBAN')}
          </div>

          {/* Consentimientos */}
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              Consentimientos de imagen
            </p>

            {[
              {
                key: 'imageConsentActivities' as const,
                text: 'Autorización expresa para la captación y publicación de la imagen del colaborador en fotografías y videos tomados durante las actividades organizadas por la asociación.',
              },
              {
                key: 'imageConsentSocial' as const,
                text: 'Autorización expresa para la publicación de la imagen del colaborador en las redes sociales de la asociación.',
              },
            ].map(({ key, text }) => (
              <label
                key={key}
                className="flex items-start gap-3 cursor-pointer rounded-lg p-3"
                style={{ backgroundColor: colors.hover }}
              >
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={ev => setForm(f => ({ ...f, [key]: ev.target.checked }))}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--color-primary)]"
                />
                <span className="text-sm" style={{ color: colors.textSecondary }}>{text}</span>
              </label>
            ))}
          </div>

          {mutation.isError && (
            <p className="text-sm mt-4 text-center" style={{ color: colors.accent }}>
              Ha ocurrido un error. Por favor inténtalo de nuevo.
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-6 w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: colors.primary }}
          >
            {mutation.isPending ? 'Guardando...' : 'Completar registro'}
          </button>
        </form>
      </div>
    </div>
  );
}
