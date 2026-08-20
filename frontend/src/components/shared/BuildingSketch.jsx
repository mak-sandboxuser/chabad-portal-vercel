export default function BuildingSketch({ theme, className = '' }) {
  const isLight = theme === 'light';
  return (
    <img
      src="/building-sketch.png"
      alt="Chabad Bedford Building Sketch"
      className={`building-sketch-img ${isLight ? 'theme-light-sketch' : 'theme-dark-sketch'} ${className}`}
      aria-hidden="true"
      draggable={false}
    />
  );
}
