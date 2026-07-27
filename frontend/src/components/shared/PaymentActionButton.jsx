import React from 'react';
import { GUEST_PAYMENTS_MESSAGE } from '../../utils/portalData';
import { showToast } from '../../utils/toast';

export default function PaymentActionButton({
  paymentsDisabled = false,
  onClick,
  className = 'dash-btn-gold',
  disabledMessage = GUEST_PAYMENTS_MESSAGE,
  children,
  ...props
}) {
  const handleClick = (event) => {
    if (paymentsDisabled) {
      event.preventDefault();
      showToast({ message: disabledMessage, type: 'error' });
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type="button"
      className={`${className}${paymentsDisabled ? ' payment-btn-disabled' : ''}`}
      onClick={handleClick}
      aria-disabled={paymentsDisabled}
      title={paymentsDisabled ? disabledMessage : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
