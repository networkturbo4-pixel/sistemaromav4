import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { LoginSlide } from '../../shared/types';
import {
  Delete,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
} from 'lucide-react';

const FALLBACK_SLIDES: LoginSlide[] = [
  {
    id: 'slide-1',
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop',
    badgeText: 'ROMA SaaS',
    title: 'Sistema Corporativo de Operaciones & Creatividad',
    description: 'Gestión integral de proyectos, redes y finanzas.',
  },
  {
    id: 'slide-2',
    imageUrl: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?q=80&w=1200&auto=format&fit=crop',
    badgeText: 'Creatividad',
    title: 'Flujos de Trabajo Dinámicos y Entregables',
    description: 'Conexión en tiempo real entre colaboradores y clientes.',
  },
  {
    id: 'slide-3',
    imageUrl: '/backgrounds/planet-vertical.png',
    badgeText: 'Workspace PRO',
    title: 'Innovación, Diseño e Impacto Real',
    description: 'Plataforma corporativa de alto rendimiento.',
  },
];

export const PinLoginScreen: React.FC = () => {
  const { tenant, loginWithPin, resolvedTheme, toggleQuickTheme } = useApp();
  const [digits, setDigits] = useState<string[]>(Array(8).fill(''));
  const [showDigits, setShowDigits] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePressedKey, setActivePressedKey] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'personal' | 'cliente'>('personal');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isDark = resolvedTheme === 'dark';
  const commercialName =
    tenant?.companyInfo?.commercialName || tenant?.name || 'ROMA';

  // Configuración personalizada de Login desde el Tenant
  const loginSettings = tenant?.customization?.loginSettings;
  const loginTitle = loginSettings?.title || 'Accede a tu Espacio Corporativo';
  const loginSubtitle =
    loginSettings?.subtitle ||
    'Ingresa con tu PIN asignado de 8 dígitos para iniciar tu jornada.';
  const clientLoginTitle = loginSettings?.clientTitle || 'Portal de Clientes';
  const clientLoginSubtitle =
    loginSettings?.clientSubtitle ||
    'Ingresa con tu PIN o código de acceso de 8 dígitos para consultar tus marcas y proyectos.';

  const slides: LoginSlide[] = useMemo(() => {
    if (loginSettings?.slides && loginSettings.slides.length > 0) {
      return loginSettings.slides;
    }
    return FALLBACK_SLIDES;
  }, [loginSettings?.slides]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const sliderIntervalSeconds = loginSettings?.sliderIntervalSeconds || 5;

  // Rotación automática del slider
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, Math.max(3, sliderIntervalSeconds) * 1000);
    return () => clearInterval(interval);
  }, [slides.length, sliderIntervalSeconds]);

  const goToPrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const triggerHaptic = (ms: number = 15) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {}
  };

  // Función de inicio de sesión con PIN
  const triggerLogin = useCallback(
    async (pinCode: string) => {
      if (pinCode.length !== 8 || submitting) return;
      setErrorMsg(null);
      setSubmitting(true);
      triggerHaptic(20);
      try {
        await loginWithPin(pinCode, tenant?.slug, loginMode);
      } catch (err) {
        setErrorMsg((err as Error).message);
        setDigits(Array(8).fill(''));
        triggerHaptic(45);
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithPin, submitting, tenant?.slug, loginMode]
  );

  // Agregar dígito (teclado táctil y físico)
  const addDigit = useCallback(
    (digit: string) => {
      if (submitting) return;
      triggerHaptic(12);

      setActivePressedKey(digit);
      setTimeout(() => setActivePressedKey(null), 120);

      setDigits((prev) => {
        const emptyIdx = prev.findIndex((d) => d === '');
        if (emptyIdx === -1) return prev;
        const next = [...prev];
        next[emptyIdx] = digit;
        setErrorMsg(null);

        if (emptyIdx === 7) {
          triggerLogin(next.join(''));
        }
        return next;
      });
    },
    [submitting, triggerLogin]
  );

  // Borrar último dígito (Backspace)
  const removeLastDigit = useCallback(() => {
    if (submitting) return;
    triggerHaptic(15);
    setActivePressedKey('backspace');
    setTimeout(() => setActivePressedKey(null), 120);

    setDigits((prev) => {
      const next = [...prev];
      for (let i = 7; i >= 0; i--) {
        if (next[i] !== '') {
          next[i] = '';
          break;
        }
      }
      setErrorMsg(null);
      return next;
    });
  }, [submitting]);

  // Limpiar todo el PIN
  const clearDigits = useCallback(() => {
    if (submitting) return;
    triggerHaptic(20);
    setActivePressedKey('clear');
    setTimeout(() => setActivePressedKey(null), 120);
    setDigits(Array(8).fill(''));
    setErrorMsg(null);
  }, [submitting]);

  // Soporte global de teclado físico (0-9, Backspace, Esc, Enter) y pegado (Ctrl+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        addDigit(e.key);
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        removeLastDigit();
        return;
      }

      if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        clearDigits();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const currentPin = digits.join('');
        if (currentPin.length === 8) {
          triggerLogin(currentPin);
        }
        return;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      const clean = text.replace(/\D/g, '').slice(0, 8);
      if (clean) {
        e.preventDefault();
        const newDigits = Array(8)
          .fill('')
          .map((_, i) => clean[i] || '');
        setDigits(newDigits);
        setErrorMsg(null);
        if (clean.length === 8) {
          triggerLogin(clean);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [addDigit, removeLastDigit, clearDigits, digits, triggerLogin]);

  const filledCount = digits.filter((d) => d !== '').length;
  const activeSlide = slides[currentSlideIndex] || slides[0];

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative min-h-dvh w-full overflow-hidden flex flex-col lg:flex-row bg-[#0b0b0e] text-zinc-100 font-sans outline-none selection:bg-white selection:text-black"
    >
      {/* ======================================================== */}
      {/* COLUMNA IZQUIERDA: SLIDER COMPLETO A PANTALLA            */}
      {/* Ocupa el 100% de la altura y la mitad izquierda completa */}
      {/* ======================================================== */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 xl:w-[53%] min-h-dvh h-screen overflow-hidden bg-black group select-none">
        
        {/* Slides con Transición Suave */}
        {slides.map((s, idx) => {
          const isCurrent = idx === currentSlideIndex;
          return (
            <div
              key={s.id || idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={s.imageUrl}
                alt={s.title || 'Slide'}
                className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/backgrounds/planet-vertical.png';
                }}
              />

              {/* Gradiente sutil inferior para legibilidad óptima de textos */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />

              {/* Insignia superior izquierda flotante */}
              <div className="absolute top-8 left-8 xl:top-10 xl:left-10 z-20">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-bold shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  <span className="tracking-tight uppercase">{commercialName}</span>
                  {s.badgeText && (
                    <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-black uppercase text-zinc-100">
                      {s.badgeText}
                    </span>
                  )}
                </div>
              </div>

              {/* Textos y Leyendas del Slide en la parte inferior */}
              <div className="absolute bottom-12 left-8 right-8 xl:left-12 xl:right-12 z-20 space-y-2 text-left">
                {s.title && (
                  <h3 className="text-2xl xl:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight max-w-xl">
                    {s.title}
                  </h3>
                )}
                {s.description && (
                  <p className="text-xs xl:text-sm text-zinc-300 font-medium max-w-lg leading-relaxed drop-shadow-sm">
                    {s.description}
                  </p>
                )}

                {/* Barras Indicadoras / Paginación */}
                {slides.length > 1 && (
                  <div className="flex items-center gap-2 pt-3">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentSlideIndex(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === currentSlideIndex
                            ? 'w-8 bg-white'
                            : 'w-2 bg-white/30 hover:bg-white/60'
                        }`}
                        aria-label={`Ir al slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Flechas de navegación en hover */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/45 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xl"
              aria-label="Anterior slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={goToNextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/45 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xl"
              aria-label="Siguiente slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* COLUMNA DERECHA: PESTAÑAS (PERSONAL / CLIENTE) Y KEYPAD  */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 xl:w-[47%] min-h-dvh flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 overflow-y-auto">
        
        {/* Barra superior con Brand en móvil y Switch de Tema */}
        <div className="w-full flex items-center justify-between">
          <div className="flex lg:hidden items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">
              {commercialName}
            </span>
          </div>
          <div className="hidden lg:block" />

          <button
            type="button"
            onClick={toggleQuickTheme}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-auto"
            aria-label="Conmutar tema"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        {/* Contenedor Central del Teclado y Pestañas */}
        <div className="max-w-[360px] sm:max-w-[380px] mx-auto w-full space-y-4 my-auto py-2">
          
          {/* Pestañas Modernas: Personal vs Cliente */}
          <div className="flex items-center p-1 bg-[#151518] rounded-2xl border border-white/10 w-full shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (loginMode !== 'personal') {
                  setLoginMode('personal');
                  setDigits(Array(8).fill(''));
                  setErrorMsg(null);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                loginMode === 'personal'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (loginMode !== 'cliente') {
                  setLoginMode('cliente');
                  setDigits(Array(8).fill(''));
                  setErrorMsg(null);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                loginMode === 'cliente'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cliente</span>
            </button>
          </div>

          {/* Título y Subtítulo Dinámicos */}
          <div className="space-y-1.5 text-left pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {loginMode === 'personal' ? loginTitle : clientLoginTitle}
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {loginMode === 'personal' ? loginSubtitle : clientLoginSubtitle}
            </p>
          </div>

          {/* Visor de los 8 Dígitos del PIN */}
          <div className="space-y-2 select-none">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-zinc-400">
                {loginMode === 'personal' ? 'Código PIN de Personal' : 'PIN o Acceso de Cliente'} ({filledCount} de 8)
              </span>

              <button
                type="button"
                onClick={() => setShowDigits((prev) => !prev)}
                className="text-[11px] font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                {showDigits ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ocultar</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Mostrar</span>
                  </>
                )}
              </button>
            </div>

            {/* Cápsula oscura compacta */}
            <div className="p-2.5 bg-[#151518] rounded-2xl border border-white/10 shadow-inner flex items-center justify-between gap-1 sm:gap-1.5">
              
              {/* Dígitos 1 al 4 */}
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5 flex-1">
                {digits.slice(0, 4).map((d, i) => {
                  const isFilled = d !== '';
                  const isCurrent = !isFilled && (i === 0 || digits[i - 1] !== '');

                  return (
                    <div
                      key={i}
                      className={`h-11 sm:h-12 rounded-xl flex items-center justify-center font-mono text-lg sm:text-xl font-bold transition-all border ${
                        errorMsg
                          ? 'border-rose-500/60 bg-rose-500/10 text-rose-400'
                          : isFilled
                          ? 'border-white/30 bg-white/10 text-white shadow-xs'
                          : isCurrent
                          ? 'border-white/20 bg-white/[0.04] text-white ring-1 ring-white/20'
                          : 'border-white/5 bg-transparent text-zinc-600'
                      }`}
                    >
                      {isFilled ? (
                        showDigits ? (
                          d
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                        )
                      ) : isCurrent ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <span className="text-zinc-600 font-bold text-xs select-none px-0.5">
                -
              </span>

              {/* Dígitos 5 al 8 */}
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5 flex-1">
                {digits.slice(4, 8).map((d, idx) => {
                  const i = idx + 4;
                  const isFilled = d !== '';
                  const isCurrent = !isFilled && digits[i - 1] !== '';

                  return (
                    <div
                      key={i}
                      className={`h-11 sm:h-12 rounded-xl flex items-center justify-center font-mono text-lg sm:text-xl font-bold transition-all border ${
                        errorMsg
                          ? 'border-rose-500/60 bg-rose-500/10 text-rose-400'
                          : isFilled
                          ? 'border-white/30 bg-white/10 text-white shadow-xs'
                          : isCurrent
                          ? 'border-white/20 bg-white/[0.04] text-white ring-1 ring-white/20'
                          : 'border-white/5 bg-transparent text-zinc-600'
                      }`}
                    >
                      {isFilled ? (
                        showDigits ? (
                          d
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                        )
                      ) : isCurrent ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold text-center pt-0.5 animate-fadeIn">
                {errorMsg}
              </p>
            )}
          </div>

          {/* ==================================================== */}
          {/* BOTONES DEL TECLADO: COMPACTOS Y CÓMODOS            */}
          {/* ==================================================== */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => {
              const isKeyPressed = activePressedKey === num;
              return (
                <button
                  key={num}
                  type="button"
                  disabled={submitting}
                  onClick={() => addDigit(num)}
                  className={`h-12 sm:h-14 rounded-2xl border transition-all flex items-center justify-center cursor-pointer active:scale-95 text-xl sm:text-2xl font-bold ${
                    isKeyPressed
                      ? 'bg-white text-black border-white scale-95 shadow-md'
                      : 'bg-[#151518] hover:bg-[#1f1f24] text-white border-white/10 hover:border-white/20'
                  }`}
                >
                  <span>{num}</span>
                </button>
              );
            })}

            {/* Botón Limpiar */}
            <button
              type="button"
              disabled={submitting || filledCount === 0}
              onClick={clearDigits}
              title="Limpiar todo (Esc)"
              className={`h-12 sm:h-14 rounded-2xl border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 disabled:opacity-20 disabled:pointer-events-none ${
                activePressedKey === 'clear'
                  ? 'bg-rose-500 text-white border-rose-500 scale-95'
                  : 'bg-[#151518] hover:bg-rose-500/15 border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400'
              }`}
            >
              <span>Limpiar</span>
              <span className="text-[8px] opacity-60 font-mono">ESC</span>
            </button>

            {/* Botón Dígito Cero */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => addDigit('0')}
              className={`h-12 sm:h-14 rounded-2xl border transition-all flex items-center justify-center cursor-pointer active:scale-95 text-xl sm:text-2xl font-bold ${
                activePressedKey === '0'
                  ? 'bg-white text-black border-white scale-95 shadow-md'
                  : 'bg-[#151518] hover:bg-[#1f1f24] text-white border-white/10 hover:border-white/20'
              }`}
            >
              <span>0</span>
            </button>

            {/* Botón Borrar (Backspace) */}
            <button
              type="button"
              disabled={submitting || filledCount === 0}
              onClick={removeLastDigit}
              title="Borrar último dígito (Backspace)"
              className={`h-12 sm:h-14 rounded-2xl border transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 disabled:opacity-20 disabled:pointer-events-none ${
                activePressedKey === 'backspace'
                  ? 'bg-amber-500 text-white border-amber-500 scale-95'
                  : 'bg-[#151518] hover:bg-amber-500/15 border-white/10 hover:border-amber-500/30 text-zinc-400 hover:text-amber-400'
              }`}
            >
              <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[8px] opacity-60 font-mono">⌫</span>
            </button>
          </div>

          {/* ==================================================== */}
          {/* BOTÓN PRINCIPAL DE ACCESO                            */}
          {/* ==================================================== */}
          <button
            type="button"
            disabled={filledCount < 8 || submitting}
            onClick={() => triggerLogin(digits.join(''))}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-zinc-100 hover:bg-white text-zinc-950 shadow-xl disabled:opacity-30 disabled:pointer-events-none flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer"
          >
            {submitting ? (
              <div className="flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
                <span>Verificando código...</span>
              </div>
            ) : (
              <>
                <span className="tracking-tight">
                  {loginMode === 'personal' ? 'Iniciar Sesión' : 'Acceder al Portal'}
                </span>
                <span className="w-7 h-7 rounded-full bg-zinc-900/10 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-950" />
                </span>
              </>
            )}
          </button>

          {/* Pequeña nota de teclado físico */}
          <p className="text-[10px] text-zinc-500 text-center leading-tight">
            Escribe tus 8 números con tu teclado físico o usa la pantalla.
          </p>

        </div>

        {/* Footer inferior */}
        <footer className="w-full flex items-center justify-between text-[11px] text-zinc-500 pt-4">
          <span>{commercialName} • SaaS</span>
          <span>Sesiones Limitadas a 3 Dispositivos</span>
        </footer>

      </div>
    </div>
  );
};
