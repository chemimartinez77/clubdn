// client/src/pages/JoinViaShareLink.tsx
import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { api } from '../api/axios';
import type { ApiResponse } from '../types/auth';

const PHONE_PREFIXES = [
  { code: 'ES', prefix: '+34', label: 'España (+34)' },
  { code: 'PT', prefix: '+351', label: 'Portugal (+351)' },
  { code: 'FR', prefix: '+33', label: 'Francia (+33)' },
  { code: 'DE', prefix: '+49', label: 'Alemania (+49)' },
  { code: 'IT', prefix: '+39', label: 'Italia (+39)' },
  { code: 'GB', prefix: '+44', label: 'UK (+44)' },
  { code: 'NL', prefix: '+31', label: 'Países Bajos (+31)' },
  { code: 'BE', prefix: '+32', label: 'Bélgica (+32)' },
  { code: 'AR', prefix: '+54', label: 'Argentina (+54)' },
  { code: 'MX', prefix: '+52', label: 'México (+52)' },
];

interface ShareLinkData {
  event: {
    id: string;
    title: string;
    description?: string;
    date: string;
    startHour?: number;
    startMinute?: number;
    durationHours?: number;
    durationMinutes?: number;
    gameName?: string;
    gameImage?: string | null;
    location: string;
    isFull: boolean;
    isActive: boolean;
    requiresApproval: boolean;
  };
  invitedBy: { id: string; name: string };
}

interface RegistrationResult {
  qrUrl: string;
  requiresApproval: boolean;
  eventTitle: string;
  eventDate: string;
}

type Screen = 'info' | 'form' | 'qr';

const LOPD_TEXT = `De conformidad con el RGPD y la LOPDGDD, le informamos de que los datos personales facilitados (nombre, apellidos y teléfono) serán tratados por el "Club Dreadnought" con la finalidad de gestionar el acceso de invitados, el control de asistencia y posibilitar la comunicación necesaria ante posibles incidencias o accidentes durante la actividad.

La base jurídica del tratamiento es el consentimiento del interesado al facilitar sus datos y el interés legítimo de la asociación en garantizar la seguridad y el control de acceso a sus instalaciones.

Los datos se conservarán durante el tiempo imprescindible para gestionar la asistencia y, posteriormente, durante los plazos legales para atender posibles responsabilidades. No se realizarán cesiones a terceros, salvo obligación legal o necesidad de comunicación a la entidad aseguradora en caso de siniestro.

Puede ejercer sus derechos de acceso, rectificación, supresión, oposición y limitación del tratamiento dirigiéndose a clubdreadnought.vlc@gmail.com. Asimismo, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).`;

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(hour?: number, minute?: number) {
  if (hour == null) return null;
  const h = String(hour).padStart(2, '0');
  const m = String(minute ?? 0).padStart(2, '0');
  return `${h}:${m}`;
}

export default function JoinViaShareLink() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('info');

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+34');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Result state
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [showLopdModal, setShowLopdModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shareLink', token],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ShareLinkData>>(`/api/share/${token}`);
      return res.data.data!;
    },
    enabled: !!token,
    retry: false
  });

  // Si el usuario está logueado y es el propio invitador, redirigir al evento
  const storedToken = localStorage.getItem('token');
  if (storedToken && data) {
    try {
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      if (payload.userId === data.invitedBy.id) {
        navigate(`/events/${data.event.id}`, { replace: true });
        return null;
      }
    } catch {
      // token malformado, ignorar
    }
  }

  const requestMutation = useMutation({
    mutationFn: async () => {
      const phone = `${phonePrefix}${phoneNumber.replace(/\s/g, '')}`;
      const res = await api.post<ApiResponse<RegistrationResult>>(`/api/share/${token}/request`, {
        guestFirstName: firstName.trim(),
        guestLastName: lastName.trim(),
        guestPhone: phone,
        honeypot: honeypotRef.current?.value ?? ''
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.data) {
        setResult(data.data);
        setScreen('qr');
      }
    }
  });

  const handleDownloadQr = () => {
    const svg = document.getElementById('guest-qr-svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const link = document.createElement('a');
      link.download = 'mi-invitacion-qr.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const containerClass = 'min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4';
  const cardClass = 'w-full max-w-sm bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-2xl shadow-lg p-6 space-y-5';

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={containerClass}>
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-red-600">Enlace no válido</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">Este enlace no existe o ha expirado.</p>
        </div>
      </div>
    );
  }

  if (!data.event.isActive) {
    return (
      <div className={containerClass}>
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-[var(--color-text)]">Evento no disponible</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">
            {data.event.isFull ? 'El evento está completo.' : 'El evento ya ha pasado o no está disponible.'}
          </p>
        </div>
      </div>
    );
  }

  // Pantalla 1: info del evento
  if (screen === 'info') {
    const timeStr = formatTime(data.event.startHour, data.event.startMinute);
    return (
      <div className={containerClass}>
        <div className={cardClass}>
          <div className="text-center space-y-1">
            <p className="text-sm text-[var(--color-textSecondary)]">Has sido invitado por</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{data.invitedBy.name}</p>
          </div>

          {data.event.gameImage && (
            <div className="flex justify-center">
              <img
                src={data.event.gameImage}
                alt={data.event.gameName || data.event.title}
                className="w-32 h-32 object-cover rounded-xl shadow"
              />
            </div>
          )}

          <div className="border-t border-[var(--color-cardBorder)] pt-4 space-y-2">
            <p className="text-base font-semibold text-[var(--color-text)]">{data.event.title}</p>
            {data.event.gameName && (
              <p className="text-sm text-[var(--color-textSecondary)]">{data.event.gameName}</p>
            )}
            <p className="text-sm text-[var(--color-textSecondary)] capitalize">
              {formatEventDate(data.event.date)}
              {timeStr && <span> · {timeStr}h</span>}
            </p>
            <p className="text-sm text-[var(--color-textSecondary)]">{data.event.location}</p>
          </div>

          {data.event.description && (
            <p className="text-sm text-[var(--color-textSecondary)] leading-relaxed border-t border-[var(--color-cardBorder)] pt-3">
              {data.event.description}
            </p>
          )}

          {data.event.isFull ? (
            <p className="text-sm text-red-600 font-medium text-center">El evento está completo.</p>
          ) : (
            <button
              onClick={() => setScreen('form')}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity"
            >
              Aceptar invitación
            </button>
          )}
        </div>
      </div>
    );
  }

  // Pantalla 2: formulario del invitado
  if (screen === 'form') {
    const isFormValid =
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      phoneNumber.trim().length >= 6 &&
      legalAccepted;

    const serverError = (requestMutation.error as any)?.response?.data?.message;

    return (
      <>
        <div className={containerClass}>
          <div className={cardClass}>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text)]">Confirma tu asistencia</h2>
              <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                Invitación a: <span className="font-medium">{data.event.title}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Nombre</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-background)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Apellidos</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Tus apellidos"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-background)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Teléfono móvil</label>
                <div className="flex gap-2">
                  <select
                    value={phonePrefix}
                    onChange={e => setPhonePrefix(e.target.value)}
                    className="px-2 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-background)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {PHONE_PREFIXES.map(p => (
                      <option key={p.code} value={p.prefix}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ''))}
                    placeholder="612 345 678"
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-background)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* Honeypot oculto */}
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{ display: 'none' }}
              />

              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setLegalAccepted(v => !v)}
                  className="flex-shrink-0 mt-0.5"
                  aria-pressed={legalAccepted}
                >
                  <div
                    className={`relative w-10 h-6 rounded-full transition-colors ${legalAccepted ? 'bg-[var(--color-primary)]' : 'bg-zinc-600'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${legalAccepted ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                </button>
                <span className="text-xs text-[var(--color-textSecondary)] leading-snug">
                  Acepto el tratamiento de mis datos personales para el control de acceso al club.{' '}
                  <button
                    type="button"
                    onClick={() => setShowLopdModal(true)}
                    className="underline text-[var(--color-primary)] hover:opacity-80"
                  >
                    Leer información sobre protección de datos
                  </button>
                </span>
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-red-600">{serverError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setScreen('info')}
                className="flex-1 py-2 px-4 rounded-xl font-medium text-[var(--color-textSecondary)] border border-[var(--color-cardBorder)] hover:bg-[var(--color-background)] transition-colors text-sm"
              >
                Volver
              </button>
              <button
                onClick={() => requestMutation.mutate()}
                disabled={!isFormValid || requestMutation.isPending}
                className="flex-1 py-2 px-4 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
              >
                {requestMutation.isPending ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>

        {showLopdModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setShowLopdModal(false)}
          >
            <div
              className="bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-base font-bold text-[var(--color-text)]">Información sobre protección de datos</h2>
              {LOPD_TEXT.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-xs text-[var(--color-textSecondary)] leading-relaxed">{paragraph}</p>
              ))}
              <button
                type="button"
                onClick={() => setShowLopdModal(false)}
                className="w-full py-2 px-4 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity text-sm mt-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Pantalla 3: QR del invitado
  if (screen === 'qr' && result) {
    return (
      <div className={containerClass}>
        <div className={cardClass}>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              {result.requiresApproval ? 'Solicitud enviada' : 'Plaza reservada'}
            </h2>
            <p className="text-sm text-[var(--color-textSecondary)] mt-1">
              {result.requiresApproval
                ? 'Tu plaza está pendiente de aprobación por el organizador.'
                : 'Muestra este QR al entrar al club.'}
            </p>
          </div>

          {!result.requiresApproval && (
            <>
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <QRCode
                  id="guest-qr-svg"
                  value={result.qrUrl}
                  size={220}
                  level="M"
                />
              </div>

              <p className="text-xs text-center text-[var(--color-textSecondary)]">
                Guarda esta pantalla o descarga la imagen. Muéstrala al entrar.
              </p>

              <button
                onClick={handleDownloadQr}
                className="w-full py-2 px-4 rounded-xl font-medium text-[var(--color-text)] border border-[var(--color-cardBorder)] hover:bg-[var(--color-background)] transition-colors text-sm"
              >
                Descargar imagen
              </button>
            </>
          )}

          <div className="border-t border-[var(--color-cardBorder)] pt-3 text-sm text-[var(--color-textSecondary)] space-y-1">
            <p><span className="font-medium text-[var(--color-text)]">{result.eventTitle}</span></p>
            <p className="capitalize">{formatEventDate(result.eventDate)}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
