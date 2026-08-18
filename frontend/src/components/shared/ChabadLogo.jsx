import { useEffect, useState } from 'react';

const LOGO_LIGHT = '/chabad-bedford-logo-light.png';
const LOGO_DARK = '/chabad-bedford-logo-dark.png';
const MARK_LIGHT = '/chabad-bedford-mark-light.png';
const MARK_DARK = '/chabad-bedford-mark-dark.png';
const LOGO_SVG = '/chabad-bedford-logo.svg';

function readDocumentTheme() {
  if (typeof document === 'undefined') return 'dark';
  const root = document.documentElement;
  if (root.classList.contains('light-theme') || root.getAttribute('data-theme') === 'light') {
    return 'light';
  }
  return 'dark';
}

function useResolvedTheme(theme) {
  const [resolved, setResolved] = useState(() => {
    if (theme === 'light' || theme === 'dark') return theme;
    return readDocumentTheme();
  });

  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
      setResolved(theme);
      return undefined;
    }

    const sync = () => setResolved(readDocumentTheme());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, [theme]);

  return resolved;
}

function resolveLogoSrc({ useSvg, variant, theme }) {
  if (useSvg) return LOGO_SVG;
  const isLight = theme === 'light';
  if (variant === 'mark') return isLight ? MARK_LIGHT : MARK_DARK;
  return isLight ? LOGO_LIGHT : LOGO_DARK;
}

export default function ChabadLogo({
  className = '',
  size,
  width,
  height,
  theme,
  variant = 'full',
  useSvg = false,
  alt = 'Chabad of Bedford',
}) {
  const resolvedTheme = useResolvedTheme(theme);
  const src = resolveLogoSrc({ useSvg, variant, theme: resolvedTheme });
  const style = {};

  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  if (size && !width && !height) {
    style.width = typeof size === 'number' ? `${size}px` : size;
    style.height = 'auto';
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={Object.keys(style).length ? style : undefined}
      draggable={false}
      decoding="async"
    />
  );
}

export { LOGO_LIGHT, LOGO_DARK, MARK_LIGHT, MARK_DARK, LOGO_SVG };
