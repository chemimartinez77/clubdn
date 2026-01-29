// client/src/pages/Login.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { loginSchema, type LoginFormData } from '../lib/validations';

// Interfaz para las partículas
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { themeMode } = useTheme();
  const { success, error: showError } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setLoading(true);

    try {
      await login(data.email, data.password);
      success('Sesión iniciada correctamente');
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al iniciar sesión';
      setError(errorMessage);
      showError(errorMessage);
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

    // Ajustar tamaño del canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Crear partículas iniciales
    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      targetX: Math.random() * canvas.width,
      targetY: Math.random() * canvas.height
    }));

    // Seguir el ratón
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animación
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach((particle, i) => {
        // Calcular distancia al ratón
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Si está cerca del ratón, alejarse; si está lejos, moverse aleatoriamente
        if (distance < 150) {
          particle.vx -= dx * 0.00005;
          particle.vy -= dy * 0.00005;
        } else {
          // Movimiento hacia el target con suavidad
          particle.vx += (particle.targetX - particle.x) * 0.0001;
          particle.vy += (particle.targetY - particle.y) * 0.0001;

          // Cambiar target aleatoriamente
          if (Math.random() < 0.01) {
            particle.targetX = Math.random() * canvas.width;
            particle.targetY = Math.random() * canvas.height;
          }
        }

        // Aplicar fricción
        particle.vx *= 0.95;
        particle.vy *= 0.95;

        // Actualizar posición
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Mantener dentro de los límites
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));

        // Dibujar partícula
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        // Conectar con partículas cercanas
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx2 = other.x - particle.x;
          const dy2 = other.y - particle.y;
          const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (distance2 < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - distance2 / 120)})`;
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
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Canvas de fondo con animación */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
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
            Bienvenido al Club DN
          </h1>
          <p className="text-[var(--color-textSecondary)]">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-shake">
              {error}
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
              type="email"
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

          <button
            type="submit"
            disabled={loading}
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

