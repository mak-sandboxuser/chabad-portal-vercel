import { Plus } from 'lucide-react';

/**
 * Blue "+ Add X" button used to append a new record to a dynamic list
 * (children, Yahrzeit records, etc). Reuses the same blue accent as
 * InfoPanel rather than the navy/gold brand buttons, matching the
 * reference design's distinct "add" affordance.
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
