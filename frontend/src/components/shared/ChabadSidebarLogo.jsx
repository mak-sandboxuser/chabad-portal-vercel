import ChabadLogo from './ChabadLogo';

export default function ChabadSidebarLogo({ className = '', theme }) {
  return (
    <ChabadLogo
      className={`chabad-logo chabad-logo--sidebar ${className}`.trim()}
      theme={theme}
      alt="Chabad Bedford"
    />
  );
}
