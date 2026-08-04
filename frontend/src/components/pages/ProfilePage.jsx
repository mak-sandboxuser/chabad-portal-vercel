import React, { useEffect, useState } from 'react';
import { User, Pencil, X, Save, MapPin, Heart, Star, CheckCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { fetchPortalApi, fetchGroups } from '../../utils/portalApi';
import {
  ADDITIONAL_FIELD_KEYS,
  ADDITIONAL_FIELD_LABELS,
  displayValue,
  formatProfileDisplayValue,
  LIFECYCLE_FIELD_KEYS,
  LIFECYCLE_FIELD_LABELS,
  profileFormToPayload,
  sfDataToProfileForm,
} from '../../utils/profileForm';
import { getMembership } from '../../utils/portalData';

const PROFILE_TABS = [
  { id: 'general', label: 'General Details', icon: User },
  { id: 'address', label: 'Address Details', icon: MapPin },
  { id: 'personal', label: 'Personal Information', icon: Heart },
  { id: 'membership', label: 'Membership & Groups', icon: Star },
];

const TAB_FIELD_KEYS = {
  general: ['firstName', 'lastName', 'title', 'nickname', 'phone', 'homePhone'],
  address: ['street', 'city', 'state', 'postalCode', 'country'],
  personal: [...LIFECYCLE_FIELD_KEYS, ...ADDITIONAL_FIELD_KEYS],
  membership: ['groups'],
};

const MEMBERSHIP_TIERS = [
  {
    id: 'family',
    name: 'Family Membership',
    description: 'Perfect for families who want to be actively involved in our community and programs.',
    annualPrice: 2244,
    category: 'General',
  },
  {
    id: 'upgraded',
    name: 'Upgraded Membership',
    description: 'Enhanced benefits and opportunities for deeper engagement and impact.',
    annualPrice: 3000,
    category: 'General',
  },
  {
    id: 'single-parent',
    name: 'Single Parent Family',
    description: 'Supporting single parents and their children with connection and care.',
    annualPrice: 1560,
    category: 'General',
  },
  {
    id: 'single',
    name: 'Single Membership',
    description: 'For individuals seeking connection and Jewish life enrichment.',
    annualPrice: 1128,
    category: 'General',
  },
  {
    id: 'senior',
    name: 'Senior Citizen Membership',
    description: 'Special rate for seniors (65+) to stay engaged and inspired.',
    annualPrice: 1800,
    category: 'General',
  },
  {
    id: 'chai-donor',
    name: 'Chai Donor',
    description: 'Your generosity helps sustain our daily operations and essential programs.',
    annualPrice: 5000,
    category: 'Chai Club',
  },
  {
    id: 'chai-partner',
    name: 'Chai Partner',
    description: 'Partner with us to expand programs and reach more families.',
    annualPrice: 10000,
    category: 'Chai Club',
  },
  {
    id: 'chai-rabbis-circle',
    name: "Chai Rabbi's Circle",
    description: 'Invest in leadership, education, and inspiring Jewish experiences.',
    annualPrice: 18000,
    category: 'Chai Club',
  },
  {
    id: 'chai-leadership-circle',
    name: 'Chai Leadership Circle',
    description: 'Make a transformational impact and help shape the future of our community.',
    annualPrice: 36000,
    category: 'Chai Club',
  },
];

function FieldRow({ label, value, fieldKey, editing, fullWidth, children }) {
  return (
    <div className={`profile-field${fullWidth ? ' profile-field--full' : ''}`}>
      <label className="profile-field-label">{label}</label>
      {editing ? (
        <div className="profile-field-box profile-field-box--editable">{children}</div>
      ) : (
        <div className="profile-field-box">
          {fieldKey ? formatProfileDisplayValue(fieldKey, value) : displayValue(value)}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({
  user,
  getAuthToken,
  sfData,
  onProfileUpdated,
  startInEditMode = false,
}) {
  const localStorageKey = user?.email ? `portal_group_${user.email}` : null;
  const getStoredGroup = () => (localStorageKey ? localStorage.getItem(localStorageKey) || '' : '');

  const [activeTab, setActiveTab] = useState('general');
  const [editingTab, setEditingTab] = useState(startInEditMode ? 'general' : null);
  const [form, setForm] = useState(() => sfDataToProfileForm(sfData, user?.email));
  const [draft, setDraft] = useState(form);
  const [saving, setSaving] = useState(false);
  const [assignedGroup, setAssignedGroup] = useState(() => getStoredGroup());
  const [selectedGroup, setSelectedGroup] = useState('Senior Citizen Membership');
  const [assigningGroup, setAssigningGroup] = useState(false);
  const [groupOptions, setGroupOptions] = useState([
    'Senior Citizen Membership',
    'Family Membership',
    'Upgraded Membership',
    'Hebrew School',
    'Gan Parents',
    'Doctors',
    'High Holidays',
  ]);

  const isEditing = editingTab === activeTab;

  useEffect(() => {
    const next = sfDataToProfileForm(sfData, user?.email);
    setForm(next);
    if (!editingTab) setDraft(next);
    // Also pull groups from sfData if backend returns it
    const sfGroup = sfData?.account?.groups || sfData?.groups || sfData?.profile?.groups || '';
    if (sfGroup) {
      setAssignedGroup(sfGroup);
      if (localStorageKey) localStorage.setItem(localStorageKey, sfGroup);
    }
  }, [sfData, user?.email, editingTab]);

  useEffect(() => {
    fetchGroups()
      .then((liveGroups) => {
        if (Array.isArray(liveGroups) && liveGroups.length > 0) {
          const names = liveGroups.map((g) => (typeof g === 'string' ? g : g.name || g.groupName)).filter(Boolean);
          const merged = Array.from(new Set([...groupOptions, ...names]));
          setGroupOptions(merged);
        }
      })
      .catch(() => {});
  }, []);

  const handleAssignGroup = async (groupToAssign) => {
    const targetGroup = groupToAssign || selectedGroup;
    if (!targetGroup) {
      showToast({ message: 'Please select a group first.', type: 'warning' });
      return;
    }
    setAssigningGroup(true);

    try {
      try {
        await fetchPortalApi('/api/household/assign-group', {
          getAuthToken,
          method: 'POST',
          body: { groups: targetGroup },
        });
      } catch (apiErr) {
        console.warn('API endpoint returned error, attempting direct webhook fallback:', apiErr.message);
        const accountId = sfData?.account?.id || sfData?.accountId || '001Jx00001rDkFhIAK';
        const fallbackRes = await fetch('https://hook.us2.make.com/gxoitwnoedavlytkiij37nd2qr6mqlhc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assign_group',
            accountId,
            accountName: sfData?.account?.name || 'Household Account',
            email: user?.email,
            groups: targetGroup,
          }),
        });
        if (!fallbackRes.ok) {
          throw new Error(`Webhook error status: ${fallbackRes.status}`);
        }
      }

      showToast({
        message: `Group "${targetGroup}" assigned to Salesforce Account successfully!`,
        type: 'success',
      });

      // Persist in localStorage so it survives refresh
      if (localStorageKey) localStorage.setItem(localStorageKey, targetGroup);
      setAssignedGroup(targetGroup);
      setForm((prev) => ({ ...prev, groups: targetGroup }));
      setDraft((prev) => ({ ...prev, groups: targetGroup }));
      if (onProfileUpdated && sfData) {
        onProfileUpdated({
          ...sfData,
          account: { ...(sfData.account || {}), groups: targetGroup },
        });
      }
    } catch (err) {
      showToast({ message: `Failed to assign group: ${err.message}`, type: 'error' });
    } finally {
      setAssigningGroup(false);
    }
  };

  const updateDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetTabDraft = (tabId) => {
    const keys = TAB_FIELD_KEYS[tabId] || [];
    setDraft((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        next[key] = form[key];
      });
      return next;
    });
  };

  const startEdit = () => {
    resetTabDraft(activeTab);
    setEditingTab(activeTab);
  };

  const cancelEdit = () => {
    resetTabDraft(activeTab);
    setEditingTab(null);
  };

  const switchTab = (tabId) => {
    if (editingTab && editingTab !== tabId) {
      resetTabDraft(editingTab);
      setEditingTab(null);
    }
    setActiveTab(tabId);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Only send fields for the tab being edited so an address save cannot
      // overwrite a previously saved name (and vice versa) in Salesforce.
      const tabKeys = TAB_FIELD_KEYS[editingTab || activeTab] || TAB_FIELD_KEYS.general;
      const data = await fetchPortalApi('/api/portal/update-profile', {
        getAuthToken,
        method: 'POST',
        body: profileFormToPayload(draft, { keys: tabKeys }),
      });

      const updated = sfDataToProfileForm(data.sfData, user?.email);
      // Merge refreshed Salesforce data with the values we just saved, in case
      // the CRM read-back still has briefly stale values for this section.
      const merged = { ...updated };
      tabKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(draft, key)) {
          merged[key] = draft[key];
        }
      });
      setForm(merged);
      setDraft(merged);
      setEditingTab(null);
      onProfileUpdated?.(data.sfData);
      showToast({ message: 'Profile saved and synced to Salesforce.', type: 'success' });
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const inputProps = (key, { required = false, placeholder = '', type = 'text' } = {}) => ({
    type,
    className: 'profile-field-input',
    value: draft[key] || '',
    onChange: (e) => updateDraft(key, e.target.value),
    required,
    placeholder,
  });

  const selectProps = (key) => ({
    className: 'profile-field-input profile-field-select',
    value: draft[key] || '',
    onChange: (e) => updateDraft(key, e.target.value),
  });

  const renderLifecycleField = (key) => (
    <FieldRow key={key} label={LIFECYCLE_FIELD_LABELS[key]} fieldKey={key} value={form[key]} editing={isEditing}>
      {key === 'jewish' ? (
        <select {...selectProps('jewish')}>
          <option value="">Select...</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="Jewish">Jewish</option>
          {!['', 'Yes', 'No', 'Jewish'].includes(draft.jewish || '') && draft.jewish ? (
            <option value={draft.jewish}>{draft.jewish}</option>
          ) : null}
        </select>
      ) : (
        <input
          {...inputProps(
            key,
            key === 'nextHebrewBirthday' || key === 'weddingDate' ? { type: 'date' } : {},
          )}
        />
      )}
    </FieldRow>
  );

  const renderAdditionalField = (key) => (
    <FieldRow key={key} label={ADDITIONAL_FIELD_LABELS[key]} fieldKey={key} value={form[key]} editing={isEditing}>
      {key === 'gender' ? (
        <select {...selectProps('gender')}>
          <option value="">Select...</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      ) : (
        <input
          {...inputProps(
            key,
            key === 'birthdate' ? { type: 'date' } : key === 'age' ? { type: 'number' } : {},
          )}
          min={key === 'age' ? '0' : undefined}
        />
      )}
    </FieldRow>
  );

  const tabContent = {
    general: (
      <>
        <FieldRow label="First Name" fieldKey="firstName" value={form.firstName} editing={isEditing}>
          <input {...inputProps('firstName', { required: true })} />
        </FieldRow>
        <FieldRow label="Last Name" fieldKey="lastName" value={form.lastName} editing={isEditing}>
          <input {...inputProps('lastName', { required: true })} />
        </FieldRow>
        <FieldRow label="Email Address" value={user?.email} editing={false} />
        <FieldRow label="Title" fieldKey="title" value={form.title} editing={isEditing}>
          <input {...inputProps('title')} />
        </FieldRow>
        <FieldRow label="Nickname" fieldKey="nickname" value={form.nickname} editing={isEditing}>
          <input {...inputProps('nickname')} />
        </FieldRow>
        <FieldRow label="Mobile Phone" fieldKey="phone" value={form.phone} editing={isEditing}>
          <input {...inputProps('phone', { placeholder: '(555) 123-4567' })} />
        </FieldRow>
        <FieldRow label="Home Phone" fieldKey="homePhone" value={form.homePhone} editing={isEditing}>
          <input {...inputProps('homePhone', { placeholder: '(555) 987-6543' })} />
        </FieldRow>
      </>
    ),
    address: (
      <>
        <FieldRow label="Street Address" fieldKey="street" value={form.street} editing={isEditing} fullWidth>
          <input {...inputProps('street')} />
        </FieldRow>
        <FieldRow label="City" fieldKey="city" value={form.city} editing={isEditing}>
          <input {...inputProps('city')} />
        </FieldRow>
        <FieldRow label="State" fieldKey="state" value={form.state} editing={isEditing}>
          <input {...inputProps('state')} />
        </FieldRow>
        <FieldRow label="Postal Code" fieldKey="postalCode" value={form.postalCode} editing={isEditing}>
          <input {...inputProps('postalCode')} />
        </FieldRow>
        <FieldRow label="Country" fieldKey="country" value={form.country} editing={isEditing}>
          <input {...inputProps('country')} />
        </FieldRow>
      </>
    ),
    personal: [
      ...LIFECYCLE_FIELD_KEYS.map(renderLifecycleField),
      ...ADDITIONAL_FIELD_KEYS.map(renderAdditionalField),
    ],
    membership: (() => {
      const membership = getMembership(sfData);
      const activeGroup = assignedGroup || sfData?.account?.groups || sfData?.groups || sfData?.profile?.groups || form.groups || membership.tier || 'Member';
      const hasActiveGroup = Boolean(activeGroup && activeGroup !== 'No Group Assigned Yet');

      return (
        <div className="profile-field--full" style={{ gridColumn: '1 / -1' }}>
          {/* Assigned Group Display Card */}
          <div style={{ background: 'rgba(212, 175, 55, 0.08)', padding: '24px', borderRadius: '12px', border: '1px solid #d4af37', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} /> Current Assigned Group / Membership
            </h4>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#d4af37', color: '#000', padding: '10px 20px', borderRadius: '24px', fontWeight: '800', fontSize: '16px' }}>
              <CheckCircle size={20} /> {activeGroup || 'No Group Assigned Yet'}
            </div>
          </div>

          {/* If NO group assigned, show selection form */}
          {!hasActiveGroup && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: 'var(--text-primary)' }}>
                  Select Membership Tier:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {MEMBERSHIP_TIERS.map((tier) => {
                    const isSelected = selectedGroup === tier.name;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedGroup(tier.name)}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #d4af37' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'var(--card-bg)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '15px', color: isSelected ? '#d4af37' : 'var(--text-primary)' }}>
                            {tier.name}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#d4af37' }}>
                            ${tier.annualPrice}/yr
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                          {tier.description}
                        </p>
                        <button
                          type="button"
                          disabled={assigningGroup}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroup(tier.name);
                            handleAssignGroup(tier.name);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: 'none',
                            background: isSelected ? '#d4af37' : 'rgba(255,255,255,0.1)',
                            color: isSelected ? '#000' : 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Plus size={14} /> Select {tier.name}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="profile-field-box" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label className="profile-field-label" style={{ fontSize: '15px', fontWeight: '700' }}>Or Select from All Salesforce Groups (92+ Live Groups):</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <select
                    className="profile-field-input profile-field-select"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    style={{ fontSize: '15px', padding: '12px', flex: 1, minWidth: '240px' }}
                  >
                    {groupOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={assigningGroup}
                    onClick={() => handleAssignGroup(selectedGroup)}
                    style={{ padding: '12px 24px', fontSize: '14px', gap: '8px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <Plus size={16} />
                    {assigningGroup ? 'Assigning...' : 'Assign Group to Account'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    })(),
  };

  const currentTab = PROFILE_TABS.find((tab) => tab.id === activeTab);
  const TabIcon = currentTab?.icon || User;

  return (
    <div className="profile-container">
      <div className="glass-panel profile-card">
        <div className="profile-card-header">
          <div className="profile-card-title">
            <User size={24} className="profile-card-title-icon" />
            <div>
              <h2>My Profile</h2>
              <p>Manage your contact information by section.</p>
            </div>
          </div>
        </div>

        <div className="profile-tabs" role="tablist">
          {PROFILE_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`profile-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => switchTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <form id="profile-form" onSubmit={handleSave}>
          <div className="profile-tab-panel" role="tabpanel">
            <div className="profile-tab-panel-header">
              <h3 className="profile-section-title">
                <TabIcon size={16} />
                {currentTab?.label}
              </h3>

              {activeTab !== 'membership' && (
                !isEditing ? (
                  <button type="button" className="btn btn-primary profile-tab-edit-btn" onClick={startEdit}>
                    <Pencil size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <div className="profile-tab-actions">
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>
                      <X size={16} />
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="profile-tab-form-grid">
              {tabContent[activeTab]}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
