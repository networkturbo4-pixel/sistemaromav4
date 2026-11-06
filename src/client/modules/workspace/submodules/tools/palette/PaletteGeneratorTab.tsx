import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Sliders,
  Eye,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  CreditCard,
  PieChart as PieChartIcon,
  Laptop,
  BookOpen,
  Smartphone,
  ExternalLink,
  ChevronDown,
  X,
  Plus,
  Trash2,
  Bookmark,
} from 'lucide-react';
import {
  ColorShade,
  generateTailwindRamp,
  getColorName,
  getContrastRatio,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  rgbToCmyk,
  PRESET_PALETTES,
} from './colorUtils';
import { useApp } from '../../../../../context/AppContext';

export const PaletteGeneratorTab: React.FC = () => {
  const { toast, apiFetch } = useApp();

  // Color base principal y rampa de 11 tonalidades
  const [baseHex, setBaseHex] = useState<string>('#3E49ED');
  const [paletteName, setPaletteName] = useState<string>('Persian Blue');
  const [primaryShade, setPrimaryShade] = useState<number>(700);
  const [shades, setShades] = useState<ColorShade[]>(() => generateTailwindRamp('#3E49ED'));
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Pestaña de showcase activa (Cards, Website, Branding, Dashboard, Components, Shadcn/ui, Apps, Charts, Gradients, Logos, Headings)
  const [activeCategory, setActiveCategory] = useState<
    | 'cards'
    | 'website'
    | 'branding'
    | 'dashboard'
    | 'components'
    | 'shadcn'
    | 'apps'
    | 'charts'
    | 'gradients'
    | 'logos'
    | 'headings'
  >('cards');

  // Solo modal de Color Info
  const [isColorInfoOpen, setIsColorInfoOpen] = useState(false);

  // Actualizar la rampa cuando cambie el baseHex
  const updateBaseColor = (newHex: string, newName?: string) => {
    setBaseHex(newHex);
    const newShades = generateTailwindRamp(newHex);
    setShades(newShades);
    setPaletteName(newName || getColorName(newHex));
  };

  // Generar color aleatorio
  const handleRandomize = () => {
    const randomHue = Math.floor(Math.random() * 360);
    const randomSat = Math.floor(Math.random() * 40) + 60; // 60-100%
    const randomLum = Math.floor(Math.random() * 20) + 40; // 40-60%
    const rgb = hslToRgb(randomHue, randomSat, randomLum);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    updateBaseColor(hex);
    toast(`Nueva paleta generada con color base ${hex}`, 'success');
  };

  // Atajo con barra espaciadora para generar paletas aleatorias
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        handleRandomize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Copiar HEX al portapapeles
  const handleCopyHex = (hex: string, label?: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast(`Color ${label || hex} copiado al portapapeles`, 'success');
    setTimeout(() => setCopiedHex(null), 2000);
  };

  // Obtener color por shade
  const getShadeHex = (shadeNum: number): string => {
    const found = shades.find((s) => s.shade === shadeNum);
    return found ? found.hex : baseHex;
  };

  const primaryHex = getShadeHex(primaryShade);

  // Armonías de color
  const generateHarmony = (type: 'complementary' | 'analogous' | 'triadic') => {
    const rgb = hexToRgb(baseHex);
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    let targetHue = h;
    if (type === 'complementary') targetHue = (h + 180) % 360;
    if (type === 'analogous') targetHue = (h + 30) % 360;
    if (type === 'triadic') targetHue = (h + 120) % 360;

    const newRgb = hslToRgb(targetHue, s, l);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    updateBaseColor(newHex);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===================================================================== */}
      {/* 1. BARRA SUPERIOR: NOMBRE, COLOR PRINCIPAL Y ACCIONES */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                title="Haz clic para renombrar la paleta"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {paletteName}
              </span>
              <span
                className="text-[11px] font-extrabold px-2 py-0.5 rounded-md text-white shadow-2xs"
                style={{ backgroundColor: primaryHex }}
              >
                Primary ({primaryShade})
              </span>
            </div>
          </div>

          {/* Botones de acción derecha: Campo directo para editar color base, Aleatorio y Color info */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Campo directo para editar color (sin modal) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
              <label htmlFor="baseColorInput" className="text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
                Color Base:
              </label>
              <div className="relative flex items-center">
                <input
                  id="baseColorInput"
                  type="color"
                  value={baseHex}
                  onChange={(e) => updateBaseColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                  title="Seleccionar color"
                />
              </div>
              <input
                type="text"
                value={baseHex}
                onChange={(e) => {
                  const val = e.target.value;
                  setBaseHex(val);
                  if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
                    updateBaseColor(val);
                  }
                }}
                className="w-20 px-2 py-1 rounded-lg text-xs font-mono font-bold uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                placeholder="#3E49ED"
              />
            </div>

            <button
              type="button"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aleatorio</span>
            </button>

            <button
              type="button"
              onClick={() => setIsColorInfoOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-800"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Color info</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 2. TIRA DE TONALIDADES (50 -> 950) EXACTA A LA IMAGEN 1 */}
        {/* ===================================================================== */}
        <div className="mt-6 grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
          {shades.map((shadeItem) => {
            const isSelectedPrimary = shadeItem.shade === primaryShade;
            return (
              <div
                key={shadeItem.shade}
                onClick={() => setPrimaryShade(shadeItem.shade)}
                className={`relative rounded-xl p-2 sm:p-2.5 h-20 sm:h-22 flex flex-col justify-between cursor-pointer transition-transform hover:scale-105 select-none ${
                  isSelectedPrimary ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: shadeItem.hex }}
              >
                {/* Punto blanco indicador del color primario (como en la imagen 1 en el 700) */}
                {isSelectedPrimary && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow-sm ring-1 ring-black/20" />
                )}

                <div>
                  <span
                    className={`block text-[11px] sm:text-xs font-extrabold ${
                      shadeItem.isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {shadeItem.shade}
                  </span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyHex(shadeItem.hex, `Tono ${shadeItem.shade}`);
                  }}
                  className="flex items-center justify-between group/hex"
                  title="Haz clic para copiar HEX"
                >
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono font-bold tracking-tight uppercase ${
                      shadeItem.isLight ? 'text-slate-700' : 'text-slate-200'
                    }`}
                  >
                    {shadeItem.hex.replace('#', '')}
                  </span>
                  {copiedHex === shadeItem.hex ? (
                    <Check
                      className={`w-3 h-3 ${
                        shadeItem.isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  ) : (
                    <Copy
                      className={`w-2.5 h-2.5 opacity-0 group-hover/hex:opacity-100 transition-opacity ${
                        shadeItem.isLight ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Presets Rápidos */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Inspiración:</span>
          {PRESET_PALETTES.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                setPrimaryShade(preset.primaryShade);
                updateBaseColor(preset.baseHex, preset.name);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.baseHex }} />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. PESTAÑAS DE CATEGORÍA DEL SHOWCASE (CARDS, WEBSITE, BRANDING, ETC.) */}
      {/* ===================================================================== */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2 min-w-max pb-2">
          {[
            { id: 'cards', label: 'Cards' },
            { id: 'website', label: 'Website' },
            { id: 'branding', label: 'Branding' },
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'components', label: 'Components' },
            { id: 'shadcn', label: 'Shadcn/ui' },
            { id: 'apps', label: 'Apps' },
            { id: 'charts', label: 'Charts' },
            { id: 'gradients', label: 'Gradients' },
            { id: 'logos', label: 'Logos' },
            { id: 'headings', label: 'Headings' },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. CONTENIDO INTERACTIVO DEL SHOWCASE SEGÚN CATEGORÍA */}
      {/* ===================================================================== */}

      {/* SHOWCASE: CARDS (EXACTO A LA IMAGEN 1 DEL USUARIO) */}
      {activeCategory === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          {/* Card 1: Track your expenses (con foto y acento azul claro) */}
          <div
            className="rounded-3xl p-5 border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between relative min-h-[320px]"
            style={{ backgroundColor: getShadeHex(100) }}
          >
            <div className="relative z-10">
              <div className="w-full h-44 rounded-2xl overflow-hidden shadow-xs mb-4">
                <img
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80"
                  alt="Track your expenses"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3
                className="text-2xl font-black leading-tight tracking-tight"
                style={{ color: getShadeHex(950) }}
              >
                Track your <br /> expenses
              </h3>
            </div>
            {/* Círculo decorativo en el fondo */}
            <div
              className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full opacity-30 border-8"
              style={{ borderColor: getShadeHex(300) }}
            />
          </div>

          {/* Card 2: Expenses $12,543 con gráfico de barras mensual */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[320px]">
            <div>
              <span className="text-xs font-bold text-slate-400">Expenses</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                $12,543
              </h4>
            </div>

            {/* Gráfico de barras mensual Jan -> Jun con colores de la paleta */}
            <div className="my-auto pt-6 pb-2">
              <div className="flex items-end justify-between h-40 gap-2 px-1">
                {[
                  { month: 'Jan', height: '65%', shade: 400 },
                  { month: 'Feb', height: '80%', shade: 500 },
                  { month: 'Mar', height: '40%', shade: 300 },
                  { month: 'Apr', height: '90%', shade: 600 },
                  { month: 'May', height: '70%', shade: 500 },
                  { month: 'Jun', height: '55%', shade: 400 },
                ].map((bar) => (
                  <div key={bar.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div
                      className="w-full rounded-full transition-all duration-300 hover:opacity-80"
                      style={{
                        height: bar.height,
                        backgroundColor: getShadeHex(bar.shade),
                      }}
                    />
                    <span className="text-[10px] font-bold text-slate-400">{bar.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Gain control (VR headset person con acento de color 600) */}
          <div
            className="rounded-3xl p-5 border border-transparent shadow-xs overflow-hidden flex flex-col justify-between relative min-h-[320px]"
            style={{ backgroundColor: getShadeHex(500) }}
          >
            <div className="relative z-10">
              <div className="w-full h-44 rounded-2xl overflow-hidden shadow-xs mb-4">
                <img
                  src="https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=600&q=80"
                  alt="Gain control"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-black text-white leading-tight tracking-tight">
                Gain <br /> control
              </h3>
            </div>
            {/* Diseños de órbita decorativa */}
            <div
              className="absolute -bottom-8 -left-8 w-44 h-44 rounded-full border border-white/20"
            />
            <div
              className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full border border-white/30"
            />
          </div>

          {/* Card 4: Expenses $14,919 Donut Chart Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[320px]">
            <div>
              <span className="text-xs font-bold text-slate-400">Expenses</span>
            </div>

            {/* Donut Chart SVG con el total en el centro */}
            <div className="relative flex items-center justify-center my-3">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={getShadeHex(100)}
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={getShadeHex(500)}
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset="75"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-slate-900 dark:text-white">$ 14,919</span>
              </div>
            </div>

            {/* Leyenda de categorías */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getShadeHex(700) }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Groceries</span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">$ 4,973</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getShadeHex(400) }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Household</span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">$ 4,973</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getShadeHex(200) }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Travel</span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">$ 4,973</span>
              </div>
            </div>
          </div>

          {/* Card 5: Blog List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-400">Blog</span>

            <div className="space-y-3">
              {/* Item 1 */}
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&q=80"
                  alt="Post"
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-2">
                    Productivity Hacks for Life on the Road
                  </h5>
                  <span
                    className="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black"
                    style={{ backgroundColor: getShadeHex(100), color: getShadeHex(800) }}
                  >
                    Work
                  </span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt="Post"
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-2">
                    The Ultimate Digital Nomad Toolkit
                  </h5>
                  <span
                    className="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black"
                    style={{ backgroundColor: getShadeHex(100), color: getShadeHex(800) }}
                  >
                    Travel
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 6: Create Hero (Person at computer) */}
          <div
            className="rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between relative overflow-hidden"
            style={{ backgroundColor: getShadeHex(200) }}
          >
            <div>
              <div className="w-full h-36 rounded-2xl overflow-hidden mb-3">
                <img
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80"
                  alt="Create"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-black" style={{ color: getShadeHex(950) }}>
                Create
              </h3>
            </div>
          </div>

          {/* Card 7: Income / Expenses Sparklines */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
            {/* Income */}
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400">Income</span>
              <div className="flex items-center justify-between mt-1">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">$15,989</h4>
                  <span className="text-[10px] text-slate-400">$18,871 last period</span>
                </div>
                {/* SVG sparkline */}
                <svg className="w-20 h-8" viewBox="0 0 100 40" fill="none">
                  <path
                    d="M0 30 Q25 10 50 25 T100 5"
                    stroke={getShadeHex(500)}
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            {/* Expenses */}
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400">Expenses</span>
              <div className="flex items-center justify-between mt-1">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">$12,543</h4>
                  <span className="text-[10px] text-slate-400">$10,221 last period</span>
                </div>
                <svg className="w-20 h-8" viewBox="0 0 100 40" fill="none">
                  <path
                    d="M0 10 Q30 35 60 15 T100 25"
                    stroke={getShadeHex(600)}
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 8: MacBook Pro 14 inch con fondo del tono 300/400 */}
          <div
            className="rounded-3xl p-5 shadow-xs flex flex-col justify-between text-center overflow-hidden relative"
            style={{ backgroundColor: getShadeHex(300) }}
          >
            <div className="pt-2">
              <img
                src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80"
                alt="MacBook"
                className="w-48 h-32 object-contain mx-auto drop-shadow-md rounded-xl"
              />
            </div>
            <div className="mt-4 pb-2">
              <h3 className="text-xl font-black leading-tight" style={{ color: getShadeHex(950) }}>
                MacBook Pro <br /> 14 inch
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: WEBSITE */}
      {activeCategory === 'website' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          {/* Mockup Browser Nav */}
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 ml-3">daromagency.com</span>
            </div>
            <div className="hidden sm:flex items-center gap-5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>Servicios</span>
              <span>Proyectos</span>
              <span>Nosotros</span>
              <button
                type="button"
                className="px-4 py-1.5 rounded-full text-white text-xs font-extrabold shadow-sm"
                style={{ backgroundColor: primaryHex }}
              >
                Cotizar Ahora
              </button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="p-8 sm:p-14 text-center max-w-3xl mx-auto space-y-6">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-extrabold border"
              style={{
                backgroundColor: getShadeHex(50),
                color: getShadeHex(700),
                borderColor: getShadeHex(200),
              }}
            >
              Potenciado con diseño de alto impacto
            </span>
            <h1
              className="text-3xl sm:text-5xl font-black tracking-tight"
              style={{ color: getShadeHex(950) }}
            >
              Creamos experiencias visuales que multiplican tus ventas
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Estrategia, diseño y producción audiovisual de nivel internacional para marcas audaces.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                className="px-6 py-3 rounded-2xl text-white font-extrabold text-sm shadow-md hover:opacity-95 transition-opacity"
                style={{ backgroundColor: primaryHex }}
              >
                Comenzar Proyecto
              </button>
              <button
                type="button"
                className="px-6 py-3 rounded-2xl font-bold text-sm border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                style={{
                  borderColor: getShadeHex(300),
                  color: getShadeHex(800),
                }}
              >
                Ver Portafolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: BRANDING */}
      {activeCategory === 'branding' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Guía de Identidad & Armonías de Marca
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Esquemas complementarios y proporciones 60-30-10 para diseño gráfico y campañas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                60% Base Dominante
              </span>
              <div className="h-16 rounded-xl shadow-xs" style={{ backgroundColor: getShadeHex(50) }} />
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold">{getShadeHex(50)}</span>
                <span className="text-slate-400">Fondos & Lienzos</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                30% Estructura de Marca
              </span>
              <div className="h-16 rounded-xl shadow-xs" style={{ backgroundColor: getShadeHex(600) }} />
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-white p-1 rounded" style={{ backgroundColor: getShadeHex(600) }}>
                  {getShadeHex(600)}
                </span>
                <span className="text-slate-400">Titulares & Botones</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                10% Acento & Contraste
              </span>
              <div className="h-16 rounded-xl shadow-xs" style={{ backgroundColor: getShadeHex(900) }} />
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-bold">{getShadeHex(900)}</span>
                <span className="text-slate-400">Énfasis & Profundidad</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: DASHBOARD */}
      {activeCategory === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Ventas Totales</span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryHex }}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">$ 48,250</h3>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-600">
                <span>+ 18.2%</span>
                <span className="text-slate-400 font-normal">vs mes anterior</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Nuevos Clientes</span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: getShadeHex(100), color: getShadeHex(700) }}
                >
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">+ 124</h3>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: '74%', backgroundColor: getShadeHex(500) }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Retención de Cartera</span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: getShadeHex(800) }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">96.8%</h3>
              <span className="text-xs text-slate-400 mt-2 block">Nivel óptimo para agencias</span>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: COMPONENTS */}
      {activeCategory === 'components' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Componentes del Design System
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Botones */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400">Variantes de Botón</span>
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-xs"
                  style={{ backgroundColor: primaryHex }}
                >
                  Botón Primario Sólido
                </button>
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl font-bold text-xs border"
                  style={{
                    backgroundColor: getShadeHex(50),
                    borderColor: getShadeHex(200),
                    color: getShadeHex(700),
                  }}
                >
                  Botón Secundario Suave
                </button>
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl font-bold text-xs border hover:bg-slate-50 transition-colors"
                  style={{
                    borderColor: getShadeHex(400),
                    color: getShadeHex(700),
                  }}
                >
                  Botón Borde / Outline
                </button>
              </div>
            </div>

            {/* Badges y Chips */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400">Badges & Etiquetas</span>
              <div className="flex flex-wrap gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: getShadeHex(100), color: getShadeHex(800) }}
                >
                  Proceso Activo
                </span>
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: primaryHex }}
                >
                  Destacado
                </span>
                <span
                  className="px-3 py-1 rounded-md text-xs font-bold border"
                  style={{ borderColor: getShadeHex(300), color: getShadeHex(700) }}
                >
                  Versión 4.0
                </span>
              </div>
            </div>

            {/* Alertas */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400">Alerta de Sistema</span>
              <div
                className="p-4 rounded-2xl border"
                style={{
                  backgroundColor: getShadeHex(50),
                  borderColor: getShadeHex(200),
                }}
              >
                <h5 className="text-xs font-bold" style={{ color: getShadeHex(900) }}>
                  Campaña aprobada por el cliente
                </h5>
                <p className="text-[11px] mt-1" style={{ color: getShadeHex(700) }}>
                  Las piezas se programaron para publicación automática en redes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: SHADCN/UI */}
      {activeCategory === 'shadcn' && (
        <div className="bg-slate-50/70 dark:bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-6">
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                shadcn/ui Dialog Card
              </h4>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: primaryHex }}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Integra componentes con soporte nativo de Tailwind CSS, tokens de accesibilidad y modo oscuro.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: primaryHex }}
              >
                Confirmar Acción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: APPS */}
      {activeCategory === 'apps' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* App Móvil de Finanzas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-center gap-5">
            <div
              className="w-20 h-36 rounded-2xl p-2 flex flex-col justify-between shrink-0 shadow-md"
              style={{ backgroundColor: getShadeHex(800) }}
            >
              <div className="w-4 h-1 rounded-full bg-white/40 mx-auto" />
              <div className="text-white text-[9px] font-bold text-center">
                <span>$2,450</span>
              </div>
              <div
                className="h-6 rounded-lg text-[8px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: primaryHex }}
              >
                Transfer
              </div>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Fintech & Banking UI
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Colores profundos en tonalidades 700 y 800 para transmitir solvencia, seguridad y confianza bancaria.
              </p>
            </div>
          </div>

          {/* App de Mensajería */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-center gap-5">
            <div className="w-20 h-36 rounded-2xl p-2 bg-slate-100 dark:bg-slate-800 flex flex-col justify-between shrink-0">
              <div className="space-y-1">
                <div
                  className="p-1 rounded-md text-[7px] text-white self-end ml-2"
                  style={{ backgroundColor: primaryHex }}
                >
                  Hola! Proyecto listo
                </div>
                <div className="p-1 rounded-md text-[7px] bg-slate-200 text-slate-800 self-start mr-2">
                  Excelente gracias!
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Chat & Team Workspace
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Burbujas de conversación y estados activos nítidos sin fatigar la vista del usuario.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: CHARTS */}
      {activeCategory === 'charts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Visualización de Métricas & Gráficos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 block mb-3">Distribución de Campañas</span>
              <div className="space-y-3">
                {[
                  { name: 'Redes Sociales', pct: 45, shade: 600 },
                  { name: 'Branding & Identidad', pct: 30, shade: 400 },
                  { name: 'Producción Audiovisual', pct: 25, shade: 200 },
                ].map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                      <span>{item.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.pct}%`, backgroundColor: getShadeHex(item.shade) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400">Rendimiento Operativo</span>
              <div className="h-28 flex items-end gap-3 justify-center pt-4">
                {[35, 60, 45, 90, 75, 100].map((h, i) => (
                  <div
                    key={i}
                    className="w-8 rounded-t-lg transition-all"
                    style={{
                      height: `${h}%`,
                      backgroundColor: getShadeHex((i + 3) * 100),
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-center text-slate-400 mt-2">
                Escalado de tonos progresivos (300 -&gt; 800)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: GRADIENTS */}
      {activeCategory === 'gradients' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'Vibrant Aura',
              css: `linear-gradient(135deg, ${getShadeHex(500)} 0%, ${getShadeHex(800)} 100%)`,
            },
            {
              name: 'Soft Glow',
              css: `linear-gradient(180deg, ${getShadeHex(50)} 0%, ${getShadeHex(300)} 100%)`,
            },
            {
              name: 'Deep Eclipse',
              css: `radial-gradient(circle at top right, ${getShadeHex(400)}, ${getShadeHex(950)})`,
            },
          ].map((grad) => (
            <div
              key={grad.name}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs"
            >
              <div
                className="w-full h-32 rounded-2xl shadow-xs"
                style={{ background: grad.css }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {grad.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyHex(grad.css, 'Gradiente CSS')}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs text-slate-500 cursor-pointer"
                  title="Copiar CSS"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SHOWCASE: LOGOS */}
      {activeCategory === 'logos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Aplicaciones de Isotipos & Logomarcas
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              className="h-32 rounded-2xl flex items-center justify-center font-black text-2xl tracking-tighter"
              style={{ backgroundColor: getShadeHex(50), color: getShadeHex(900) }}
            >
              ROMA
            </div>
            <div
              className="h-32 rounded-2xl flex items-center justify-center font-black text-2xl tracking-tighter text-white"
              style={{ backgroundColor: primaryHex }}
            >
              ROMA
            </div>
            <div
              className="h-32 rounded-2xl flex items-center justify-center font-black text-2xl tracking-tighter text-white"
              style={{ backgroundColor: getShadeHex(950) }}
            >
              ROMA
            </div>
            <div
              className="h-32 rounded-2xl flex items-center justify-center font-black text-2xl tracking-tighter border-2"
              style={{ borderColor: primaryHex, color: primaryHex }}
            >
              ROMA
            </div>
          </div>
        </div>
      )}

      {/* SHOWCASE: HEADINGS */}
      {activeCategory === 'headings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Escala Tipográfica & Ratios de Contraste
          </h3>

          <div className="space-y-4">
            {[
              { tag: 'H1', size: 'text-3xl font-black', text: 'Titular Principal de Impacto', shade: 900 },
              { tag: 'H2', size: 'text-2xl font-extrabold', text: 'Subtítulo de Sección Hero', shade: 800 },
              { tag: 'H3', size: 'text-xl font-bold', text: 'Encabezado de Módulo Operativo', shade: 700 },
              { tag: 'H4', size: 'text-base font-bold', text: 'Etiqueta de Bloque Destacado', shade: 600 },
              { tag: 'P', size: 'text-sm font-normal', text: 'Texto de párrafo legible para cuerpos editoriales extensos.', shade: 700 },
            ].map((head) => (
              <div
                key={head.tag}
                className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-8">{head.tag}</span>
                  <span className={head.size} style={{ color: getShadeHex(head.shade) }}>
                    {head.text}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {getShadeHex(head.shade)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL: COLOR INFO */}
      {/* ===================================================================== */}
      {isColorInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Ficha Técnica de Color
              </h3>
              <button
                type="button"
                onClick={() => setIsColorInfoOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-20 rounded-2xl shadow-xs" style={{ backgroundColor: primaryHex }} />

            {(() => {
              const rgb = hexToRgb(primaryHex);
              const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
              const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

              return (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-bold text-slate-500">HEX</span>
                    <span className="font-mono font-extrabold">{primaryHex}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-bold text-slate-500">RGB</span>
                    <span className="font-mono font-extrabold">
                      rgb({rgb.r}, {rgb.g}, {rgb.b})
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-bold text-slate-500">HSL</span>
                    <span className="font-mono font-extrabold">
                      hsl({hsl.h}, {hsl.s}%, {hsl.l}%)
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-bold text-slate-500">CMYK (Imprenta)</span>
                    <span className="font-mono font-extrabold">
                      cmyk({cmyk.c}%, {cmyk.m}%, {cmyk.y}%, {cmyk.k}%)
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
