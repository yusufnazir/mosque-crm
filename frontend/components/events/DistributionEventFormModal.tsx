'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';
import DateInput from '@/components/DateInput';
import EventFormModal, {
  EVENT_FORM_BTN_PRIMARY,
  EVENT_FORM_BTN_SECONDARY,
  EVENT_FORM_INPUT,
} from '@/components/events/EventFormModal';
import { DistributionEventCreate } from '@/lib/distributionApi';

interface DistributionEventFormModalProps {
  open: boolean;
  onClose: () => void;
  form: DistributionEventCreate;
  onChange: (form: DistributionEventCreate) => void;
  onSubmit: () => void;
  saving?: boolean;
  isEdit?: boolean;
}

export default function DistributionEventFormModal({
  open,
  onClose,
  form,
  onChange,
  onSubmit,
  saving = false,
  isEdit = false,
}: DistributionEventFormModalProps) {
  const { t } = useTranslation();

  const set = <K extends keyof DistributionEventCreate>(key: K, value: DistributionEventCreate[K]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <EventFormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('distribution.edit_event') : t('distribution.create_event')}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={EVENT_FORM_BTN_SECONDARY}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !form.name.trim()}
            className={EVENT_FORM_BTN_PRIMARY}
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.event_name')} *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className={EVENT_FORM_INPUT}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.event_year')} *</label>
            <input
              type="number"
              required
              min={2000}
              value={form.year}
              onChange={e => set('year', parseInt(e.target.value, 10))}
              className={EVENT_FORM_INPUT}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.event_date')}</label>
            <DateInput
              value={form.eventDate ?? ''}
              onChange={value => set('eventDate', value || undefined)}
              className="text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.event_location')}</label>
          <input
            type="text"
            value={form.location ?? ''}
            onChange={e => set('location', e.target.value || undefined)}
            className={EVENT_FORM_INPUT}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.member_capacity')}</label>
            <input
              type="number"
              min={0}
              value={form.memberCapacity ?? 0}
              onChange={e => set('memberCapacity', parseInt(e.target.value, 10) || 0)}
              className={EVENT_FORM_INPUT}
            />
            <p className="text-xs text-stone-400 mt-1">{t('distribution.capacity_hint')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.non_member_capacity')}</label>
            <input
              type="number"
              min={0}
              value={form.nonMemberCapacity ?? 0}
              onChange={e => set('nonMemberCapacity', parseInt(e.target.value, 10) || 0)}
              className={EVENT_FORM_INPUT}
            />
            <p className="text-xs text-stone-400 mt-1">{t('distribution.capacity_hint')}</p>
          </div>
        </div>
      </form>
    </EventFormModal>
  );
}
