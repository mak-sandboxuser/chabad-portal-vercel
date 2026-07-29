import { Plus } from 'lucide-react';

/**
 * Navy "+ Add X" button matching the Continue / primary CTA color.
 */
export default function AddItemButton({ onClick, disabled = false, children }) {
  return (
    <button type="button" className="onboard-add-item-button" onClick={onClick} disabled={disabled}>
      <span className="onboard-add-item-icon" aria-hidden="true">
        <Plus size={14} strokeWidth={3} />
      </span>
      {children}
    </button>
  );
}
