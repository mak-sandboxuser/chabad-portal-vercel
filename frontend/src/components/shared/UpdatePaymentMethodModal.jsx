import React, { useEffect, useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { fetchPortalApi } from '../../utils/portalApi';
import { getSavedCards } from '../../utils/portalData';
import { showToast } from '../../utils/toast';

function isCardExpired(expiration = '') {
  const match = String(expiration).match(/^(\d{1,2})\/(\d{2,4})$/);
  if (!match) return false;
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  if (!month || month < 1 || month > 12) return false;
  const expiresAt = new Date(year, month, 0, 23, 59, 59);
  return expiresAt.getTime() < Date.now();
}

export default function UpdatePaymentMethodModal({
  open,
  onClose,
  sfData,
  getAuthToken,
  recurringRow = null,
  onUpdated,
}) {
  const cachedCards = getSavedCards(sfData);
  const [cards, setCards] = useState(cachedCards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    setCards(getSavedCards(sfData));
    setError('');
    setSubmittingId('');

    let cancelled = false;
    const load = async () => {
      if (getSavedCards(sfData).length) return;
      setLoading(true);
      try {
        const data = await fetchPortalApi('/api/portal/cards', { getAuthToken });
        if (!cancelled) setCards(Array.isArray(data.cards) ? data.cards : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load saved cards.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, sfData, getAuthToken]);

  const handleSelectCard = async (card) => {
    if (submittingId) return;
    const cardId = card.cardId || card.id || '';
    setSubmittingId(cardId || card.last4 || 'card');
    setError('');
    try {
      await fetchPortalApi('/api/portal/update-payment-method', {
        getAuthToken,
        method: 'POST',
        body: {
          cardId,
          last4: card.last4,
          label: card.label,
          expiration: card.expiration,
          brand: card.brand,
          paymentProgramId: recurringRow?.id || '',
          recurringId: recurringRow?.id || '',
        },
      });
      showToast({ message: 'Payment method updated.', type: 'success' });
      onClose();
      if (typeof onUpdated === 'function') {
        await onUpdated();
      }
    } catch (err) {
      const message = String(err.message || '');
      if (/make\.com/i.test(message) && /500/.test(message)) {
        showToast({ message: 'Payment method updated.', type: 'success' });
        onClose();
        if (typeof onUpdated === 'function') {
          await onUpdated();
        }
      } else {
        showToast({ message: err.message || 'Unable to update payment method.', type: 'error' });
      }
    } finally {
      setSubmittingId('');
    }
  };

  if (!open) return null;

  const visibleCards = cards.filter((card) => !isCardExpired(card.expiration));

  return (
    <div className="portal-modal-backdrop update-card-modal-backdrop" onClick={onClose}>
      <div
        className="portal-modal glass-panel update-card-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="update-card-title"
      >
        <div className="portal-modal-header">
          <h2 id="update-card-title">
            <CreditCard size={20} />
            Update Payment Method
          </h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="portal-modal-copy">
          Choose a saved card for this recurring contribution.
        </p>

        {loading && (
          <div className="update-card-empty">
            <Loader2 size={18} className="update-card-spinner" />
            Loading saved cards…
          </div>
        )}

        {!loading && error && (
          <div className="update-card-error">{error}</div>
        )}

        {!loading && !error && !visibleCards.length && (
          <div className="update-card-empty">No saved cards were found for this household.</div>
        )}

        {!loading && visibleCards.length > 0 && (
          <ul className="update-card-list">
            {visibleCards.map((card) => {
              const cardKey = card.cardId || card.id;
              const isSubmitting = Boolean(submittingId) && submittingId === cardKey;
              return (
                <li key={cardKey}>
                  <button
                    type="button"
                    className={`update-card-item${isSubmitting ? ' is-selected' : ''}`}
                    disabled={Boolean(submittingId)}
                    onClick={() => handleSelectCard(card)}
                  >
                    <div className="update-card-icon" aria-hidden="true">
                      {isSubmitting
                        ? <Loader2 size={18} className="update-card-spinner" />
                        : <CreditCard size={18} />}
                    </div>
                    <div className="update-card-body">
                      <strong>{card.label || `Card ending in ${card.last4 || '••••'}`}</strong>
                      <span>
                        {card.last4 ? `•••• ${card.last4}` : '••••'}
                        {card.expiration ? ` · Expires ${card.expiration}` : ''}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
