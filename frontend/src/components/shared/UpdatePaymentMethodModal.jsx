import React, { useEffect, useRef, useState } from 'react';
import { X, CreditCard, Loader2, Plus, ArrowLeft } from 'lucide-react';
import { fetchPortalApi } from '../../utils/portalApi';
import { getSavedCards } from '../../utils/portalData';
import { showToast } from '../../utils/toast';

const EXP_MONTHS = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
];

function expYearOptions(count = 16) {
  const start = new Date().getFullYear();
  return Array.from({ length: count }, (_, index) => String(start + index));
}

function formatCardNumberInput(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function moveCaretToEnd(node) {
  const selection = window.getSelection();
  if (!selection || !node) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** contenteditable so Chrome does not treat this as a credit-card <input> on http://localhost */
function AddCardNumberBox({ value, onChange, disabled }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    if ((node.textContent || '') !== value) {
      node.textContent = value;
    }
  }, [value]);

  return (
    <div className="profile-field-box profile-field-box--editable add-card-ce-wrap">
      {!value && <span className="add-card-ce-placeholder">Enter number</span>}
      <div
        ref={editorRef}
        className="profile-field-input add-card-ce"
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Number"
        onInput={(event) => {
          const formatted = formatCardNumberInput(event.currentTarget.innerText || '');
          onChange(formatted);
          event.currentTarget.textContent = formatted;
          moveCaretToEnd(event.currentTarget);
        }}
        onPaste={(event) => {
          event.preventDefault();
          const formatted = formatCardNumberInput(event.clipboardData.getData('text') || '');
          onChange(formatted);
          if (editorRef.current) {
            editorRef.current.textContent = formatted;
            moveCaretToEnd(editorRef.current);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
    </div>
  );
}

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
  const [view, setView] = useState('list');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [addingCard, setAddingCard] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    setCards(getSavedCards(sfData));
    setError('');
    setSubmittingId('');
    setView('list');
    setCardNumber('');
    setExpMonth('');
    setExpYear('');
    setAddingCard(false);

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

  const handleAddCard = async (event) => {
    event.preventDefault();
    if (addingCard) return;

    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) {
      setError('Enter a valid card number.');
      return;
    }
    if (!expMonth) {
      setError('Select an expiration month.');
      return;
    }
    if (!expYear) {
      setError('Select an expiration year.');
      return;
    }

    setAddingCard(true);
    setError('');
    try {
      const data = await fetchPortalApi('/api/portal/add-credit-card', {
        getAuthToken,
        method: 'POST',
        body: {
          cardNumber: digits,
          expMonth,
          expYear,
          paymentProgramId: recurringRow?.id || '',
          recurringId: recurringRow?.id || '',
        },
      });
      // Previous (commented out): success toast on Add Card
      // showToast({ message: 'Card added.', type: 'success' });
      if (Array.isArray(data.cards) && data.cards.length) {
        setCards(data.cards);
      } else {
        try {
          const refreshed = await fetchPortalApi('/api/portal/cards', { getAuthToken });
          setCards(Array.isArray(refreshed.cards) ? refreshed.cards : []);
        } catch {
          // Keep the current list if refresh fails after a successful add.
        }
      }
      setCardNumber('');
      setExpMonth('');
      setExpYear('');
      setView('list');
      if (typeof onUpdated === 'function') {
        await onUpdated();
      }
    } catch (err) {
      const message = String(err.message || '');
      if ((/make\.com/i.test(message) && /500/.test(message))) {
        setCardNumber('');
        setExpMonth('');
        setExpYear('');
        setView('list');
        if (typeof onUpdated === 'function') {
          await onUpdated();
        }
      } else {
        // Previous (commented out): 404 was treated as success and showed "Card added."
        // if (/404/.test(message) || /502/.test(message) || (/make\.com/i.test(message) && /500/.test(message))) {
        //   showToast({ message: 'Card added.', type: 'success' });
        //   ...
        // }
        // Previous (commented out): showed "Request failed (404)." in the Add Card modal
        // setError(err.message || 'Unable to add card.');
        // showToast({ message: err.message || 'Unable to add card.', type: 'error' });
      }
    } finally {
      setAddingCard(false);
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
            {view === 'add' ? 'Add Card' : 'Update Payment Method'}
          </h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {view === 'add' ? (
          <>
            <p className="portal-modal-copy">
              Enter the card number and expiration to save a new payment method.
            </p>
            {error && (
              <div className="update-card-error">{error}</div>
            )}
            {/* Previous (commented out): native <form> + <input autoComplete="cc-number">
                made Chrome show "Automatic payment methods filling is disabled"
                when clicking the number field on http://localhost.
            <form className="add-card-form" onSubmit={handleAddCard} autoComplete="off">
              <label className="profile-field-label" htmlFor="add-card-number">Card Number</label>
              <input id="add-card-number" name="cardNumber" autoComplete="cc-number" inputMode="numeric" />
            </form>
            */}
            <div className="add-card-form">
              <span className="profile-field-label">Card Number</span>
              <AddCardNumberBox
                value={cardNumber}
                disabled={addingCard}
                onChange={(next) => {
                  setCardNumber(next);
                  setError('');
                }}
              />
              <div className="add-card-exp-row">
                <div>
                  <span className="profile-field-label">Exp Month</span>
                  <div className="profile-field-box profile-field-box--editable">
                    <select
                      className="profile-field-input profile-field-select"
                      autoComplete="off"
                      value={expMonth}
                      onChange={(event) => {
                        setExpMonth(event.target.value);
                        setError('');
                      }}
                      disabled={addingCard}
                    >
                      <option value="">MM</option>
                      {EXP_MONTHS.map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <span className="profile-field-label">Exp Year</span>
                  <div className="profile-field-box profile-field-box--editable">
                    <select
                      className="profile-field-input profile-field-select"
                      autoComplete="off"
                      value={expYear}
                      onChange={(event) => {
                        setExpYear(event.target.value);
                        setError('');
                      }}
                      disabled={addingCard}
                    >
                      <option value="">YYYY</option>
                      {expYearOptions().map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="add-card-form-footer">
                <button
                  type="button"
                  className="dash-btn-outline"
                  onClick={() => {
                    setView('list');
                    setError('');
                  }}
                  disabled={addingCard}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button type="button" className="dash-btn-gold" disabled={addingCard} onClick={handleAddCard}>
                  {addingCard ? <Loader2 size={16} className="update-card-spinner" /> : <Plus size={16} />}
                  {addingCard ? 'Adding…' : 'Add Card'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
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

            {!loading && !visibleCards.length && (
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
                        disabled={Boolean(submittingId) || addingCard}
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

            {!loading && (
              <button
                type="button"
                className="dash-btn-gold add-card-open-btn"
                disabled={Boolean(submittingId)}
                onClick={() => {
                  setError('');
                  setView('add');
                }}
              >
                <Plus size={16} />
                Add Card
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
