// client/src/pages/Login.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { loginSchema, type LoginFormData } from '../lib/validations';
import type { PublicConfig, LoginParticleStyle } from '../types/config';

// Interfaz para las partículas
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  color: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/';
  const { themeMode } = useTheme();
  const { success, error: showError } = useToast();
  const [error, setError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [freezeSeconds, setFreezeSeconds] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const { data: publicConfig } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PublicConfig }>('/api/config/public');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  const particleStyle = useMemo((): LoginParticleStyle => {
    const s = publicConfig?.loginParticleStyle ?? 'white';
    if (s === 'random') {
      const options: LoginParticleStyle[] = ['white', 'neon', 'theme'];
      return options[Math.floor(Math.random() * options.length)];
    }
    return s;
  }, [publicConfig?.loginParticleStyle]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // Cuenta atrás del freeze
  useEffect(() => {
    if (freezeSeconds <= 0) return;
    const timer = setInterval(() => {
      setFreezeSeconds((s) => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [freezeSeconds]);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    if (!captchaToken) {
      setError('Por favor, completa la verificación de seguridad.');
      return;
    }
    setError('');
    setWarningMessage('');
    setLoading(true);

    try {
      console.log('[LOGIN DEBUG] email enviado:', JSON.stringify(data.email));
      await login(data.email, data.password, captchaToken);
      success('Sesión iniciada correctamente');
      navigate(redirectTo);
    } catch (err: any) {
      const responseData = err.response?.data;
      const errorMessage = responseData?.message || 'Error al iniciar sesión';

      if (err.response?.status === 429 && responseData?.retryAfterSeconds) {
        setFreezeSeconds(responseData.retryAfterSeconds);
      }

      if (responseData?.warningMessage) {
        setWarningMessage(responseData.warningMessage);
      }

      setError(errorMessage);
      showError(errorMessage);

      // Resetear captcha tras cada intento fallido
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Sistema de partículas interactivas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Paletas según estilo
    const neonColors = ['0, 255, 255', '255, 0, 255', '0, 150, 255', '180, 0, 255', '0, 255, 150'];

    const getThemeColors = (): string[] => {
      const root = document.documentElement;
      const primary = getComputedStyle(root).getPropertyValue('--color-primary').trim();
      const primaryDark = getComputedStyle(root).getPropertyValue('--color-primaryDark').trim();
      // Convertir hex a rgb
      const hexToRgb = (hex: string) => {
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
      };
      return [hexToRgb(primary), hexToRgb(primaryDark)];
    };

    const pickColor = (): string => {
      if (particleStyle === 'neon') return neonColors[Math.floor(Math.random() * neonColors.length)];
      if (particleStyle === 'theme') {
        const themeColors = getThemeColors();
        return themeColors[Math.floor(Math.random() * themeColors.length)];
      }
      return '255, 255, 255'; // white
    };

    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      targetX: Math.random() * canvas.width,
      targetY: Math.random() * canvas.height,
      color: pickColor()
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const isNeon = particleStyle === 'neon';
    const fadeBg = isNeon ? 'rgba(5, 0, 20, 0.15)' : 'rgba(0, 0, 0, 0.05)';

    const animate = () => {
      ctx.fillStyle = fadeBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach((particle, i) => {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          particle.vx -= dx * 0.00005;
          particle.vy -= dy * 0.00005;
        } else {
          particle.vx += (particle.targetX - particle.x) * 0.0001;
          particle.vy += (particle.targetY - particle.y) * 0.0001;
          if (Math.random() < 0.01) {
            particle.targetX = Math.random() * canvas.width;
            particle.targetY = Math.random() * canvas.height;
          }
        }

        particle.vx *= 0.95;
        particle.vy *= 0.95;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, isNeon ? 2.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particle.color}, ${isNeon ? 0.9 : 0.6})`;
        if (isNeon) {
          ctx.shadowColor = `rgba(${particle.color}, 1)`;
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        if (isNeon) ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx2 = other.x - particle.x;
          const dy2 = other.y - particle.y;
          const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (distance2 < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(${particle.color}, ${(isNeon ? 0.2 : 0.15) * (1 - distance2 / 120)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particleStyle]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Canvas de fondo con animación */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{
          background: particleStyle === 'neon'
            ? 'linear-gradient(to bottom right, #05001a, #0a0028, #000015)'
            : 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))'
        }}
      />

      {/* Contenido principal */}
      <div className="relative z-10 bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src={themeMode === 'dark' ? '/logowhite.png' : '/logo.png'}
              alt="Club Dreadnought"
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">
            Bienvenido al Club Dreadnought
          </h1>
          <p className="text-[var(--color-textSecondary)]">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-shake">
              {error}
              {freezeSeconds > 0 && (
                <p className="mt-1 text-sm font-semibold">
                  Podrás intentarlo de nuevo en {freezeSeconds}s
                </p>
              )}
            </div>
          )}
          {!error && warningMessage && (
            <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              {warningMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              {...register('email')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all ${
                errors.email ? 'border-red-500' : 'border-[var(--color-inputBorder)]'
              }`}
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all ${
                errors.password ? 'border-red-500' : 'border-[var(--color-inputBorder)]'
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primaryDark)] font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <HCaptcha
              ref={captchaRef}
              sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
              onVerify={handleCaptchaVerify}
              onExpire={handleCaptchaExpire}
              theme={themeMode === 'dark' ? 'dark' : 'light'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken || freezeSeconds > 0}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--color-primaryDark)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-inputBorder)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[var(--color-cardBackground)] text-[var(--color-textSecondary)]">¿Primera vez aquí?</span>
            </div>
          </div>

          <p className="text-center">
            <Link
              to="/register"
              className="text-[var(--color-primary)] hover:text-[var(--color-primaryDark)] font-semibold transition-colors inline-flex items-center gap-1 hover:gap-2"
            >
              Regístrate ahora
              <svg className="w-4 h-4 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </p>
        </form>
      </div>

      {/* Indicador de interactividad para escritorio */}
      <div className="hidden md:block absolute bottom-4 right-4 text-white/60 text-xs z-10">
        Mueve el ratón para interactuar
      </div>
    </div>
  );
}

