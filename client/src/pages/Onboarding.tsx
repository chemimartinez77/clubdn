// client/src/pages/Onboarding.tsx
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../config/themes';

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
  idPhoto: File | null;
  termsAccepted: boolean;
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
  idPhoto: null,
  termsAccepted: false,
};

const TERMS_TEXT = `FORMULARIO DE COLABORACIÓN
Club Dreadnought - Asociación de Juegos de Mesa, Estrategia y Miniaturas DN1984
CIF: G02953248
Inscrita en el Registro de la Generalitat Valenciana con número CV-01-061786-V
Domicilio: Calle Campos Crespo 90, Valencia

1. OBJETO

Mediante el presente se regula la relación entre la Asociación y el Colaborador, estableciendo los derechos y obligaciones de ambas partes. El Colaborador podrá acceder a las instalaciones y participar en actividades conforme a lo regulado en los Estatutos, la normativa interna de la Asociación y a los acuerdos adoptados según la normativa vigente.

2. CONDICIONES

• El Colaborador/a realizará una aportación voluntaria, por el importe establecido para el ejercicio correspondiente, en concepto de colaboración para el mantenimiento de la Asociación.
• El órgano de representación (Junta Directiva) valorará la admisión del Colaborador/a y tiene la potestad de revocar su condición en cualquier momento.
• El Colaborador/a tendrá libre acceso al local social cuando esté abierto y con un socio presente, dicho socio autorizará el acceso previa identificación si así lo considera.
• La colaboración no otorga derechos políticos ni decisorios dentro de la Asociación.

3. DURACIÓN Y EXTINCIÓN

• La colaboración entrará en vigor en la fecha de su firma, y se mantendrá vigente mientras el Colaborador cumpla con la reglamentación establecida en Estatutos, normativa interna y acuerdos adoptados según la normativa vigente.
• Cualquiera de las partes podrá dar por finalizada la colaboración mediante notificación escrita, a la otra parte, dando un preaviso de 15 días.

4. JURISDICCIÓN Y LEGISLACIÓN APLICABLE

Las partes se someten a la legislación española y valenciana vigente en materia de asociaciones, protección de datos y derechos de imagen. Cualquier controversia del presente contrato se someterá a los Juzgados y Tribunales de Valencia.

5. PROTECCIÓN DE DATOS

En cumplimiento del Reglamento General de Protección de Datos (Reglamento UE 2016/679) y la Ley Orgánica 3/2018, de Protección de Datos Personales y Garantía de los Derechos Digitales (LOPDGDD), la Asociación informa al Colaborador/a de que los datos facilitados serán incorporados a un fichero interno para uso exclusivo de la gestión administrativa de la asociación.

El responsable del tratamiento de los datos es la Asociación de Juegos de Mesa, Estrategia y Miniaturas DN1984, con domicilio en la calle Campos Crespo 90 de Valencia, y contacto en clubdreadnought.vlc@gmail.com.

El Colaborador/a puede ejercer sus derechos de acceso, rectificación, supresión, limitación y oposición enviando una solicitud a la dirección de correo electrónico indicada.

6. DERECHOS DE IMAGEN

La Asociación realiza actividades, eventos, partidas de juegos y torneos cuya difusión en redes sociales y página web es fundamental para la promoción y funcionamiento de la entidad.

La autorización de imagen es de carácter gratuito, sin límite temporal y exclusivamente para los fines de difusión de la Asociación. En caso de que el Colaborador desee revocar esta autorización, podrá comunicarlo por escrito a la Asociación, sin efectos retroactivos sobre las imágenes ya publicadas.

La Asociación se compromete a utilizar las imágenes con respeto a la dignidad y derechos de los colaboradores, evitando cualquier uso que pueda ser perjudicial para su imagen o reputación.

7. DURACIÓN Y EXTINCIÓN

El presente contrato entrará en vigor en la fecha de su firma y se mantendrá vigente mientras el Colaborador cumpla con sus obligaciones. Cualquiera de las partes podrá dar por finalizada la colaboración mediante notificación escrita, con un preaviso de 15 días.`;

interface TermsModalProps {
  colors: ThemeColors;
  onClose: () => void;
}

function TermsModal({ colors, onClose }: TermsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh]"
        style={{ backgroundColor: colors.cardBackground, border: `1px solid ${colors.cardBorder}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            Condiciones de colaboración
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none hover:opacity-70 transition-opacity"
            style={{ color: colors.textSecondary }}
          >
            ✕
          </button>
        </div>
        <div
          className="overflow-y-auto px-6 pb-6 flex-1 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: colors.textSecondary }}
        >
          {TERMS_TEXT}
        </div>
        <div className="px-6 pb-5 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface OnboardingInnerProps {
  isPreview?: boolean;
}

export function OnboardingInner({ isPreview = false }: OnboardingInnerProps) {
  const { theme, themeMode } = useTheme();
  const colors = theme.colors[themeMode];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OnboardingForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingForm | 'idPhoto', string>>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (data: OnboardingForm) => {
      const fd = new FormData();
      fd.append('firstName', data.firstName);
      fd.append('lastName', data.lastName);
      fd.append('dni', data.dni);
      fd.append('phone', data.phone);
      fd.append('address', data.address);
      fd.append('city', data.city);
      fd.append('province', data.province);
      fd.append('postalCode', data.postalCode);
      fd.append('iban', data.iban);
      fd.append('imageConsentActivities', String(data.imageConsentActivities));
      fd.append('imageConsentSocial', String(data.imageConsentSocial));
      fd.append('termsAccepted', 'true');
      if (data.idPhoto) fd.append('idPhoto', data.idPhoto);
      return api.patch('/api/profile/me/onboarding', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      navigate('/', { replace: true });
    },
  });

  function validate(): boolean {
    const e: Partial<Record<keyof OnboardingForm | 'idPhoto', string>> = {};
    if (!form.firstName.trim()) e.firstName = 'Campo obligatorio';
    if (!form.lastName.trim()) e.lastName = 'Campo obligatorio';
    if (!form.dni.trim()) e.dni = 'Campo obligatorio';
    if (!form.phone.trim()) e.phone = 'Campo obligatorio';
    if (!form.address.trim()) e.address = 'Campo obligatorio';
    if (!form.city.trim()) e.city = 'Campo obligatorio';
    if (!form.province.trim()) e.province = 'Campo obligatorio';
    if (!form.postalCode.trim()) e.postalCode = 'Campo obligatorio';
    if (!form.iban.trim()) e.iban = 'Campo obligatorio';
    if (!form.idPhoto) e.idPhoto = 'La foto carnet es obligatoria';
    if (!form.termsAccepted) e.termsAccepted = 'Debes aceptar las condiciones para continuar';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) return;
    if (!validate()) return;
    mutation.mutate(form);
  }

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm(f => ({ ...f, idPhoto: file }));
    setErrors(prev => ({ ...prev, idPhoto: undefined }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }, []);

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
    <>
      {showTerms && <TermsModal colors={colors} onClose={() => setShowTerms(false)} />}

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
              Antes de continuar necesitamos que completes tu ficha de colaborador. Sólo tendrás que hacerlo una vez.
            </p>
            {isPreview && (
              <p className="text-xs mt-2 font-medium" style={{ color: colors.accent }}>
                [Modo previsualización — el formulario no se puede enviar]
              </p>
            )}
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

            {/* Consentimientos de imagen */}
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                Consentimientos de imagen
              </p>
              <p className="text-sm italic" style={{ color: colors.accent }}>
                Queremos que seas parte de nuestros recuerdos! En la asociación nos encanta capturar la energía y los buenos momentos de nuestras jornadas. ¿Nos das permiso para incluirte en nuestra historia?
              </p>

              {[
                {
                  key: 'imageConsentActivities' as const,
                  text: '¡Sí, quiero aparecer en las fotos! Autorizo a la asociación a tomar imágenes y vídeos durante las actividades para que no se pierda ningún buen momento.',
                },
                {
                  key: 'imageConsentSocial' as const,
                  text: '¡Me encanta compartir! Doy mi permiso para que estas imágenes se publiquen en nuestras redes sociales y así mostrar al mundo lo que hacemos juntos.',
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

            {/* Foto */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                Foto (reconocible) <span style={{ color: colors.accent }}>*</span>
              </p>
              <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
                Fotografía para uso administrativo interno de la asociación.
              </p>

              <div className="flex items-start gap-4">
                {/* Previsualización */}
                <div
                  className="w-24 h-28 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-dashed"
                  style={{ borderColor: errors.idPhoto ? colors.accent : colors.cardBorder, backgroundColor: colors.hover }}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Foto carnet" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-center px-1" style={{ color: colors.textSecondary }}>
                      Sin foto
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg text-sm font-medium border transition-opacity hover:opacity-80"
                    style={{ borderColor: colors.cardBorder, color: colors.text, backgroundColor: colors.hover }}
                  >
                    {form.idPhoto ? 'Cambiar foto' : 'Seleccionar foto'}
                  </button>
                  {form.idPhoto && (
                    <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
                      {form.idPhoto.name}
                    </p>
                  )}
                  {errors.idPhoto && (
                    <p className="text-xs mt-1" style={{ color: colors.accent }}>{errors.idPhoto}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Aceptación de condiciones */}
            <div className="mt-6">
              <label
                className="flex items-start gap-3 cursor-pointer rounded-lg p-3"
                style={{ backgroundColor: errors.termsAccepted ? `${colors.accent}15` : colors.hover }}
              >
                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.termsAccepted}
                  onClick={() => {
                    setForm(f => ({ ...f, termsAccepted: !f.termsAccepted }));
                    setErrors(prev => ({ ...prev, termsAccepted: undefined }));
                  }}
                  className="relative flex-shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none"
                  style={{ backgroundColor: form.termsAccepted ? colors.primary : 'rgba(255,255,255,0.2)' }}
                >
                  <span
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: form.termsAccepted ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  He leído y acepto las{' '}
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setShowTerms(true); }}
                    className="underline font-medium focus:outline-none"
                    style={{ color: colors.accent }}
                  >
                    condiciones del formulario de colaboración
                  </button>
                  , incluyendo las cláusulas de protección de datos y derechos de imagen.
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="text-xs mt-1 px-1" style={{ color: colors.accent }}>{errors.termsAccepted}</p>
              )}
            </div>

            {mutation.isError && (
              <p className="text-sm mt-4 text-center" style={{ color: colors.accent }}>
                Ha ocurrido un error. Por favor inténtalo de nuevo.
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending || isPreview}
              className="mt-6 w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: colors.primary }}
            >
              {mutation.isPending ? 'Guardando...' : 'Completar registro'}
            </button>
          </form>

          {!isPreview && (
            <button
              type="button"
              onClick={() => { localStorage.removeItem('token'); navigate('/login', { replace: true }); }}
              className="mt-4 w-full py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
              style={{ color: colors.textSecondary }}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function Onboarding() {
  return <OnboardingInner />;
}
