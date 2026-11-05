import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  Delete,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Quote as QuoteIcon,
  Calendar,
  Layers,
  Zap,
  Building2,
  Shuffle,
  Keyboard,
  CornerDownLeft,
  Sun,
  Moon,
} from 'lucide-react';

interface DailyQuote {
  quote: string;
  author: string;
  role: string;
  tag: string;
}

const DAILY_QUOTES: DailyQuote[] = [
  {
    quote: 'El diseño no es solo lo que se ve y se siente. El diseño es cómo funciona.',
    author: 'Steve Jobs',
    role: 'Co-fundador de Apple',
    tag: 'Innovación & Función',
  },
  {
    quote: 'Si no vende, no es creativo. La verdadera creatividad resuelve problemas comerciales con elegancia.',
    author: 'David Ogilvy',
    role: 'Padre de la Publicidad Moderna',
    tag: 'Estrategia Publicitaria',
  },
  {
    quote: 'El buen diseño es lo más poco diseño posible. Menos, pero con mejor ejecución.',
    author: 'Dieter Rams',
    role: 'Maestro del Diseño Funcionalista',
    tag: 'Minimalismo & Pureza',
  },
  {
    quote: 'El diseño es el embajador silencioso de tu marca. Habla antes de que tú digas una palabra.',
    author: 'Paul Rand',
    role: 'Diseñador de Identidades Legendarias (IBM, ABC, UPS)',
    tag: 'Identidad de Marca',
  },
  {
    quote: 'La creatividad es la inteligencia divirtiéndose y descubriendo nuevos horizontes.',
    author: 'Albert Einstein',
    role: 'Físico & Pensador',
    tag: 'Ingenio & Pasión',
  },
  {
    quote: 'La simplicidad no es la falta de pistas; es la claridad del propósito.',
    author: 'Jony Ive',
    role: 'Ex-Director de Diseño de Apple',
    tag: 'Claridad & Propósito',
  },
  {
    quote: 'Hazlo simple, hazlo memorable, hazlo tentador para mirar y divertido para explorar.',
    author: 'Leo Burnett',
    role: 'Pionero de la Publicidad',
    tag: 'Comunicación Visual',
  },
  {
    quote: 'Cometer errores es parte natural del proceso creativo. Lo esencial es iterar rápido y refinar.',
    author: 'Paula Scher',
    role: 'Socia de Pentagram Design',
    tag: 'Maestría & Iteración',
  },
  {
    quote: 'El estilo cambia con las modas. El buen diseño es un lenguaje universal que perdura en el tiempo.',
    author: 'Massimo Vignelli',
    role: 'Diseñador Gráfico & Arquitecto Visual',
    tag: 'Arquitectura de Marca',
  },
  {
    quote: 'Si crees que el buen diseño es caro, deberías considerar el costo silencioso del mal diseño.',
    author: 'Ralf Speth',
    role: 'Líder Ejecutivo de la Industria Automotriz',
    tag: 'Valor de Negocio',
  },
  {
    quote: 'Las mejores ideas nacen cuando el pensamiento estratégico se une con la audacia creativa.',
    author: 'Bill Bernbach',
    role: 'Revolución Creativa de Madison Avenue',
    tag: 'Audacia Creativa',
  },
  {
    quote: 'La consistencia construye confianza; la emoción construye lealtad duradera.',
    author: 'Milton Glaser',
    role: 'Creador de la Identidad Visual de NY',
    tag: 'Lealtad de Marca',
  },
  {
    quote: 'El diseño es el puente que transforma una visión intangible en una experiencia real y memorable.',
    author: 'Alina Wheeler',
    role: 'Especialista Global en Branding',
    tag: 'Experiencia de Usuario',
  },
  {
    quote: 'Una marca no es lo que decimos a los clientes, es la promesa que cumplimos en cada entrega.',
    author: 'Marty Neumeier',
    role: 'Autor de The Brand Gap',
    tag: 'Cultura de Agencia',
  },
];

export const PinLoginScreen: React.FC = () => {
  const { tenant, loginWithPin, resolvedTheme, toggleQuickTheme } = useApp();
  const [digits, setDigits] = useState<string[]>(Array(8).fill(''));
  const [showDigits, setShowDigits] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePressedKey, setActivePressedKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cálculo de la frase diaria según el día del año
  const dailyIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % DAILY_QUOTES.length;
  }, []);

  const [activeQuoteIndex, setActiveQuoteIndex] = useState<number>(dailyIndex);

  const formattedToday = useMemo(() => {
    try {
      const dateStr = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date());
      return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    } catch {
      return 'Pensamiento Creativo';
    }
  }, []);

  const currentQuote = DAILY_QUOTES[activeQuoteIndex] || DAILY_QUOTES[0];

  const triggerHaptic = (ms: number = 15) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {}
  };

  const handleNextQuote = () => {
    triggerHaptic(10);
    setActiveQuoteIndex((prev) => (prev + 1) % DAILY_QUOTES.length);
  };

  // Función de inicio de sesión
  const triggerLogin = useCallback(
    async (pinCode: string) => {
      if (pinCode.length !== 8 || submitting) return;
      setErrorMsg(null);
      setSubmitting(true);
      triggerHaptic(20);
      try {
        await loginWithPin(pinCode);
      } catch (err) {
        setErrorMsg((err as Error).message);
        setDigits(Array(8).fill(''));
        triggerHaptic(45);
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithPin, submitting]
  );

  // Agregar dígito (compartido entre teclado táctil y teclado físico)
  const addDigit = useCallback(
    (digit: string) => {
      if (submitting) return;
      triggerHaptic(12);

      setActivePressedKey(digit);
      setTimeout(() => setActivePressedKey(null), 140);

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
    setTimeout(() => setActivePressedKey(null), 140);

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
    setTimeout(() => setActivePressedKey(null), 140);
    setDigits(Array(8).fill(''));
    setErrorMsg(null);
  }, [submitting]);

  // SOPORTE GLOBAL DE TECLADO FÍSICO
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

  const commercialName =
    tenant?.companyInfo?.commercialName || tenant?.name || 'ROMA Agencia';

  // LOGO EXACTO SEGÚN MODO CLARO U OSCURO CONFIGURADO EN EL SISTEMA
  const isDark = resolvedTheme === 'dark';
  const logoUrl = isDark
    ? tenant?.customization?.logoDarkUrl || tenant?.customization?.logoLightUrl
    : tenant?.customization?.logoLightUrl || tenant?.customization?.logoDarkUrl;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative min-h-dvh w-full overflow-x-hidden flex flex-col justify-between bg-[var(--app-bg)] text-[var(--app-text)] font-sans selection:bg-[var(--app-primary)] selection:text-white outline-none transition-colors duration-200"
    >
      {/* ======================================================== */}
      {/* HEADER SUPERIOR: LOGO DEL MODO ACTIVO & STATUS           */}
      {/* ======================================================== */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-5 sm:pt-7 pb-2 flex items-center justify-between">
        {/* Identidad del Tenant / Logo oficial configurado */}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={commercialName}
              className="h-8 sm:h-9 max-w-[180px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[var(--app-primary)] flex items-center justify-center font-black text-white text-base shadow-sm">
                R
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-tight leading-none text-[var(--app-text)]">
                  {commercialName}
                </span>
                <span className="text-[10px] font-bold text-[var(--app-primary)] tracking-wider uppercase mt-0.5">
                  Workspace
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Acciones del Header: Toggle Tema Claro/Oscuro + Insignia SSL */}
        <div className="flex items-center gap-2.5">
          {/* Conmutador rápido de tema según configuración del sistema */}
          <button
            type="button"
            onClick={toggleQuickTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Insignia de seguridad */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-muted)] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Acceso Seguro</span>
            <span className="opacity-40 hidden sm:inline">•</span>
            <span className="font-mono text-emerald-500">SSL 256-bit</span>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* CONTENEDOR PRINCIPAL: SPLIT (FRASE + TECLADO NUMÉRICO)   */}
      {/* ======================================================== */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 my-auto py-3 sm:py-8 flex flex-col justify-center">
        
        {/* ==================================================== */}
        {/* ENCABEZADO RESPONSIVE MÓVIL: POCO TEXTO Y CENTRADO   */}
        {/* ==================================================== */}
        <div className="lg:hidden text-center mb-3 sm:mb-4 max-w-sm mx-auto px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-muted)] mb-1.5 shadow-xs">
            <Sparkles className="w-3 h-3 text-[var(--app-primary)]" />
            <span>{formattedToday}</span>
          </div>
          <p className="text-xs text-[var(--app-muted)] italic leading-tight line-clamp-2">
            "{currentQuote.quote}"
          </p>
          <span className="text-[10px] font-bold text-[var(--app-primary)] block mt-0.5">
            — {currentQuote.author}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ==================================================== */}
          {/* COLUMNA IZQUIERDA DESKTOP: FRASE COMPLETA Y VALOR    */}
          {/* ==================================================== */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-6 sm:space-y-8 pr-0 lg:pr-4">
            
            {/* Tag / Badge de Bienvenida */}
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--app-primary)]/10 border border-[var(--app-primary)]/20 text-[var(--app-primary)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plataforma Creativa SaaS</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-muted)]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedToday}</span>
              </span>
            </div>

            {/* Titular Limpio y Sólido (Sin degradados multicolores) */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--app-text)] tracking-tight leading-[1.15]">
                Donde las grandes ideas se convierten en{' '}
                <span className="text-[var(--app-primary)]">
                  impacto real.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[var(--app-muted)] max-w-xl leading-relaxed">
                Gestión operativa, entregables creativos, cotizaciones y flujos de trabajo en un solo ecosistema conectado.
              </p>
            </div>

            {/* TARJETA DE LA FRASE DIARIA */}
            <div className="relative group bg-[var(--app-surface)] border border-[var(--app-border)] rounded-3xl p-6 sm:p-7 transition-all duration-200 shadow-sm overflow-hidden">
              <QuoteIcon className="absolute -bottom-4 -right-4 w-28 h-28 text-[var(--app-text)]/[0.03] pointer-events-none" />

              <div className="relative z-10 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[var(--app-primary)]/10 text-[var(--app-primary)] flex items-center justify-center">
                      <QuoteIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-primary)]">
                      Inspiración de Hoy
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextQuote}
                    title="Ver otra frase inspiradora"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--app-bg)] hover:bg-[var(--app-primary)]/10 text-[var(--app-muted)] hover:text-[var(--app-primary)] text-[11px] font-semibold transition-all border border-[var(--app-border)] cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span className="hidden xs:inline">Otra frase</span>
                  </button>
                </div>

                <p className="text-base sm:text-lg font-medium text-[var(--app-text)] leading-relaxed italic">
                  "{currentQuote.quote}"
                </p>

                <div className="pt-2 border-t border-[var(--app-border)] flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-[var(--app-text)]">
                      {currentQuote.author}
                    </p>
                    <p className="text-xs text-[var(--app-muted)]">
                      {currentQuote.role}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[var(--app-bg)] text-[var(--app-muted)] border border-[var(--app-border)]">
                    {currentQuote.tag}
                  </span>
                </div>
              </div>
            </div>

            {/* Píldoras de Valor Rápido */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[var(--app-primary)]">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-bold text-[var(--app-text)]">Órdenes (OS)</span>
                </div>
                <span className="text-[11px] text-[var(--app-muted)]">Hojas de ruta & entregables</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-amber-500">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold text-[var(--app-text)]">Google Drive</span>
                </div>
                <span className="text-[11px] text-[var(--app-muted)]">Subidas directas de 500MB+</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold text-[var(--app-text)]">PIN 8 Dígitos</span>
                </div>
                <span className="text-[11px] text-[var(--app-muted)]">Acceso rápido y seguro</span>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* COLUMNA DERECHA / CENTRADA EN MÓVIL: TECLADO         */}
          {/* ==================================================== */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="w-full max-w-[390px] sm:max-w-[420px] bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[28px] sm:rounded-[32px] shadow-2xl p-5 sm:p-7 transition-colors flex flex-col space-y-4 sm:space-y-5">
              
              {/* Encabezado del Teclado */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--app-primary)]/10 text-[var(--app-primary)] flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[var(--app-text)] leading-tight">
                      Acceso por PIN
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-[var(--app-muted)]">
                      Tipea en tu teclado físico o usa los botones
                    </p>
                  </div>
                </div>

                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] text-[10px] font-semibold text-[var(--app-muted)]"
                  title="Puedes escribir directamente con los números de tu teclado físico"
                >
                  <Keyboard className="w-3.5 h-3.5 text-[var(--app-primary)]" />
                  <span className="hidden xs:inline">Teclado Físico</span>
                </div>
              </div>

              {/* ==================================================== */}
              {/* NUEVO DISEÑO LIMPIO DEL VISOR DEL PIN                */}
              {/* (Sin la caja oscura pesada, limpio, minimalista)     */}
              {/* ==================================================== */}
              <div className="space-y-3 select-none">
                
                {/* Cabecera del visor: Contador + Botón Mostrar/Ocultar */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--app-text)]">
                      Código PIN
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
                      {filledCount} de 8
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDigits((prev) => !prev)}
                    className="text-xs font-semibold flex items-center gap-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] transition px-2 py-0.5 rounded-lg hover:bg-[var(--app-bg)] cursor-pointer"
                  >
                    {showDigits ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[var(--app-primary)]" />
                        <span>Ocultar</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[var(--app-primary)]" />
                        <span>Mostrar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Track de 8 Cápsulas Minimalistas (4 + 4) */}
                <div className="py-2.5 px-3 bg-[var(--app-bg)] rounded-2xl border border-[var(--app-border)] flex items-center justify-between">
                  {/* Bloque 1 (Dígitos 1 al 4) */}
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    {digits.slice(0, 4).map((d, i) => {
                      const isFilled = d !== '';
                      const isCurrent = !isFilled && (i === 0 || digits[i - 1] !== '');

                      return (
                        <div
                          key={i}
                          className={`h-11 rounded-xl flex items-center justify-center font-mono text-lg font-black transition-all border ${
                            errorMsg
                              ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                              : isFilled
                              ? 'border-[var(--app-primary)] bg-[var(--app-primary)]/15 text-[var(--app-primary)]'
                              : isCurrent
                              ? 'border-[var(--app-primary)] bg-[var(--app-surface)] text-[var(--app-text)] ring-2 ring-[var(--app-primary)]/20'
                              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]'
                          }`}
                        >
                          {isFilled ? (
                            showDigits ? (
                              d
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-[var(--app-primary)]" />
                            )
                          ) : isCurrent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-primary)] animate-pulse" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Divisor estético central */}
                  <div className="w-3 text-center text-[var(--app-muted)] font-black text-sm select-none">
                    -
                  </div>

                  {/* Bloque 2 (Dígitos 5 al 8) */}
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    {digits.slice(4, 8).map((d, idx) => {
                      const i = idx + 4;
                      const isFilled = d !== '';
                      const isCurrent = !isFilled && digits[i - 1] !== '';

                      return (
                        <div
                          key={i}
                          className={`h-11 rounded-xl flex items-center justify-center font-mono text-lg font-black transition-all border ${
                            errorMsg
                              ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                              : isFilled
                              ? 'border-[var(--app-primary)] bg-[var(--app-primary)]/15 text-[var(--app-primary)]'
                              : isCurrent
                              ? 'border-[var(--app-primary)] bg-[var(--app-surface)] text-[var(--app-text)] ring-2 ring-[var(--app-primary)]/20'
                              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]'
                          }`}
                        >
                          {isFilled ? (
                            showDigits ? (
                              d
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-[var(--app-primary)]" />
                            )
                          ) : isCurrent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-primary)] animate-pulse" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Línea de progreso sutil y sólida */}
                <div className="w-full bg-[var(--app-border)] h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--app-primary)] h-1 rounded-full transition-all duration-200"
                    style={{ width: `${(filledCount / 8) * 100}%` }}
                  />
                </div>

                {/* Alerta de Error si el PIN es incorrecto */}
                {errorMsg && (
                  <p className="text-xs text-rose-500 font-bold text-center pt-1 animate-in fade-in">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* ==================================================== */}
              {/* BOTONES DEL TECLADO (SÓLIDOS, SIN DEGRADADOS)        */}
              {/* ==================================================== */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 select-none">
                {[
                  { num: '1', sub: '' },
                  { num: '2', sub: 'ABC' },
                  { num: '3', sub: 'DEF' },
                  { num: '4', sub: 'GHI' },
                  { num: '5', sub: 'JKL' },
                  { num: '6', sub: 'MNO' },
                  { num: '7', sub: 'PQRS' },
                  { num: '8', sub: 'TUV' },
                  { num: '9', sub: 'WXYZ' },
                ].map(({ num, sub }) => {
                  const isKeyPressed = activePressedKey === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={submitting}
                      onClick={() => addDigit(num)}
                      className={`h-11 sm:h-13 rounded-2xl border transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                        isKeyPressed
                          ? 'bg-[var(--app-primary)] text-white border-[var(--app-primary)] scale-95'
                          : 'bg-[var(--app-bg)] hover:bg-[var(--app-primary)]/10 text-[var(--app-text)] border-[var(--app-border)] hover:border-[var(--app-primary)]/40'
                      }`}
                    >
                      <span className="text-lg sm:text-xl font-black leading-none">{num}</span>
                      {sub && (
                        <span className="text-[8px] font-bold text-[var(--app-muted)] tracking-widest mt-0.5 leading-none uppercase">
                          {sub}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Botón Limpiar */}
                <button
                  type="button"
                  disabled={submitting || filledCount === 0}
                  onClick={clearDigits}
                  title="Limpiar todo (Esc)"
                  className={`h-11 sm:h-13 rounded-2xl border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
                    activePressedKey === 'clear'
                      ? 'bg-rose-500 text-white border-rose-500 scale-95'
                      : 'bg-[var(--app-bg)] hover:bg-rose-500/10 border-[var(--app-border)] hover:border-rose-500/30 text-[var(--app-muted)] hover:text-rose-500'
                  }`}
                >
                  <span>Limpiar</span>
                  <span className="text-[8px] text-[var(--app-muted)] font-mono tracking-normal opacity-70">ESC</span>
                </button>

                {/* Botón Dígito Cero */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => addDigit('0')}
                  className={`h-11 sm:h-13 rounded-2xl border transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                    activePressedKey === '0'
                      ? 'bg-[var(--app-primary)] text-white border-[var(--app-primary)] scale-95'
                      : 'bg-[var(--app-bg)] hover:bg-[var(--app-primary)]/10 text-[var(--app-text)] border-[var(--app-border)] hover:border-[var(--app-primary)]/40'
                  }`}
                >
                  <span className="text-lg sm:text-xl font-black leading-none">0</span>
                  <span className="text-[8px] font-bold text-[var(--app-muted)] tracking-widest mt-0.5 leading-none">
                    +
                  </span>
                </button>

                {/* Botón Borrar (Backspace) */}
                <button
                  type="button"
                  disabled={submitting || filledCount === 0}
                  onClick={removeLastDigit}
                  title="Borrar último dígito (Backspace)"
                  className={`h-11 sm:h-13 rounded-2xl border transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
                    activePressedKey === 'backspace'
                      ? 'bg-amber-500 text-white border-amber-500 scale-95'
                      : 'bg-[var(--app-bg)] hover:bg-amber-500/10 border-[var(--app-border)] hover:border-amber-500/30 text-[var(--app-muted)] hover:text-amber-500'
                  }`}
                >
                  <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-[8px] text-[var(--app-muted)] font-mono tracking-normal opacity-70">⌫</span>
                </button>
              </div>

              {/* ==================================================== */}
              {/* BOTÓN DE ACCESO AL WORKSPACE (COLOR SÓLIDO)          */}
              {/* ==================================================== */}
              <button
                type="button"
                disabled={filledCount < 8 || submitting}
                onClick={() => triggerLogin(digits.join(''))}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-[var(--app-primary)] hover:opacity-90 text-white shadow-md disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Verificando PIN...</span>
                  </>
                ) : (
                  <>
                    <span>Acceder al Workspace</span>
                    <CornerDownLeft className="w-4 h-4 text-white" />
                  </>
                )}
              </button>

              {/* Tip de uso con teclado físico */}
              <div className="pt-1 text-center">
                <p className="text-[11px] text-[var(--app-muted)] flex items-center justify-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-[var(--app-primary)]" />
                  <span>
                    Puedes teclear tus <strong className="text-[var(--app-text)]">8 dígitos</strong> directamente y presionar{' '}
                    <strong className="text-[var(--app-text)]">Enter ↵</strong>
                  </span>
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ======================================================== */}
      {/* FOOTER INFERIOR                                          */}
      {/* ======================================================== */}
      <footer className="relative z-20 text-center text-xs text-[var(--app-muted)] py-4 px-4 border-t border-[var(--app-border)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--app-text)]">{commercialName}</span>
            <span className="opacity-40">•</span>
            <span>Sistema SaaS Multitenant para Agencia de Publicidad y Diseño</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Conexión Segura Activa</span>
            </span>
            <span className="opacity-40">•</span>
            <span className="font-mono text-[var(--app-muted)]">v4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
