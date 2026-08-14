import { ArrowsRotateRight, CircleInfo } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import {
  COLOR_THEMES,
  ColorTheme,
  Theme,
  useTheme,
} from '@/app/providers/theme';

const THEME_LABELS: Record<ColorTheme, string> = {
  aero: 'Aero',
  amoled: 'Amoled',
  aura: 'Aura',
  ayu: 'Ayu',
  carbonfox: 'Carbonfox',
  catppuccin: 'Catppuccin',
  cursor: 'Cursor',
  dracula: 'Dracula',
  'fields-of-the-shire': 'Fields of the Shire',
  flexoki: 'Flexoki',
  github: 'GitHub',
  gruvbox: 'Gruvbox',
  jetbrains: 'JetBrains',
  kanagawa: 'Kanagawa',
  'lucent-orng': 'Lucent Orng',
  mono: 'Mono',
  'mono-plus': 'Mono Plus',
  monokai: 'Monokai',
  nightowl: 'Night Owl',
  nord: 'Nord',
  'oc-2': 'OC-2',
  onedarkpro: 'OneDark Pro',
  orng: 'Orng',
  rosepine: 'Rosé Pine',
  shadesofpurple: 'Shades of Purple',
  solarized: 'Solarized',
  tokyonight: 'Tokyo Night',
  vercel: 'Vercel',
  vesper: 'Vesper',
  vitesse: 'Vitesse',
  zenburn: 'Zenburn',
};

const MODE_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function AppearanceView() {
  const { theme, resolvedTheme, colorTheme, setTheme, setColorTheme } =
    useTheme();

  return (
    <div className='flex-1 scrollbar-thin space-y-8 overflow-y-auto p-8'>
      <div>
        <h2 className='text-foreground text-xl font-medium'>Appearance</h2>
        <p className='text-muted mt-1 text-xs'>
          Customize how Aero looks and feels.
        </p>
      </div>

      {/* Color Mode & Theme */}
      <section className='space-y-4'>
        <h3 className='text-foreground text-xs font-semibold'>
          Color mode & Theme
        </h3>

        <div className='grid grid-cols-2 gap-8'>
          {/* Color mode */}
          <div className='space-y-2'>
            {MODE_OPTIONS.map((mode) => (
              <label
                key={mode.value}
                className='text-foreground flex cursor-pointer items-center gap-2.5 text-xs'
              >
                <input
                  type='radio'
                  name='color-mode'
                  value={mode.value}
                  checked={theme === mode.value}
                  onChange={() => setTheme(mode.value)}
                  className='accent-accent'
                />

                {mode.label}

                {mode.value === 'system' && (
                  <span className='text-muted'>({resolvedTheme})</span>
                )}
              </label>
            ))}
          </div>

          {/* Color themes */}
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='light-theme'
                className='text-muted mb-1.5 block text-xs'
              >
                Light Theme
              </label>

              <select
                id='light-theme'
                value={colorTheme}
                onChange={(event) =>
                  setColorTheme(event.target.value as ColorTheme)
                }
                className='border-border bg-field-background text-field-foreground w-full rounded-md border px-3 py-1.5 text-xs'
              >
                {COLOR_THEMES.map((theme) => (
                  <option key={theme} value={theme}>
                    {THEME_LABELS[theme]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor='dark-theme'
                className='text-muted mb-1.5 block text-xs'
              >
                Dark Theme
              </label>

              <select
                id='dark-theme'
                value={colorTheme}
                onChange={(event) =>
                  setColorTheme(event.target.value as ColorTheme)
                }
                className='border-border bg-field-background text-field-foreground w-full rounded-md border px-3 py-1.5 text-xs'
              >
                {COLOR_THEMES.map((theme) => (
                  <option key={theme} value={theme}>
                    {THEME_LABELS[theme]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type='button'
              className='text-accent flex items-center gap-1.5 text-xs hover:opacity-80'
              onClick={() => {
                // Placeholder for theme reloading.
                // The generated themes are currently bundled,
                // so there is nothing to reload yet.
              }}
            >
              <Icon data={ArrowsRotateRight} className='size-3.5' />

              <span>Reload themes</span>

              <Icon data={CircleInfo} className='text-muted ml-0.5 size-3.5' />
            </button>
          </div>
        </div>
      </section>

      <hr className='border-separator' />

      {/* Window Controls */}
      <section className='space-y-4'>
        <div className='flex items-center gap-1.5'>
          <h3 className='text-foreground text-xs font-semibold'>
            Window controls
          </h3>

          <Icon data={CircleInfo} className='text-muted size-3.5' />
        </div>

        <div className='grid grid-cols-2 gap-8'>
          <div>
            <label className='text-muted mb-2 block text-xs'>
              Window controls position
            </label>

            <div className='border-border bg-surface-secondary inline-flex gap-1 rounded-md border p-1'>
              <button
                type='button'
                className='text-muted hover:text-foreground rounded px-3 py-1 text-xs'
              >
                left
              </button>

              <button
                type='button'
                className='bg-accent text-accent-foreground rounded px-3 py-1 text-xs font-medium'
              >
                right
              </button>
            </div>
          </div>

          <div>
            <label className='text-muted mb-2 block text-xs'>Style</label>

            <div className='border-border bg-surface-secondary inline-flex gap-1 rounded-md border p-1'>
              <button
                type='button'
                className='bg-accent text-accent-foreground rounded px-3 py-1 text-xs font-medium'
              >
                classic
              </button>

              <button
                type='button'
                className='text-muted hover:text-foreground rounded px-3 py-1 text-xs'
              >
                traffic lights
              </button>
            </div>
          </div>
        </div>
      </section>

      <hr className='border-separator' />

      {/* Localization */}
      <section className='space-y-4'>
        <h3 className='text-foreground text-xs font-semibold'>Localization</h3>

        <div className='grid grid-cols-2 gap-8'>
          <div>
            <label className='text-muted mb-1.5 block text-xs'>Language</label>

            <select className='border-border bg-field-background text-field-foreground w-full rounded-md border px-3 py-1.5 text-xs'>
              <option>English</option>
            </select>
          </div>

          <div className='space-y-4'>
            <div>
              <label className='text-muted mb-1.5 block text-xs'>
                Time Format
              </label>

              <select className='border-border bg-field-background text-field-foreground w-full rounded-md border px-3 py-1.5 text-xs'>
                <option>Auto</option>
              </select>
            </div>

            <div>
              <label className='text-muted mb-1.5 block text-xs'>
                Week Starts On
              </label>

              <select className='border-border bg-field-background text-field-foreground w-full rounded-md border px-3 py-1.5 text-xs'>
                <option>Auto</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
