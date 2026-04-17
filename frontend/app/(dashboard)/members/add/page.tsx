'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import { memberApi, ApiClient } from '@/lib/api';
import { Member } from '@/types';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  address: string;
  city: string;
  country: string;
  postalCode: string;
  idNumber: string;
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  username: string;
  roles: string[];
  partnerId?: number;
  parentId?: number;
  needsAccount: boolean;
}

export default function AddMemberPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { getLimit } = useSubscription();
  const membersLimit = getLimit('members.max');
  const [currentMemberCount, setCurrentMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [headMembers, setHeadMembers] = useState<Member[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{id: number; name: string}[]>([]);
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'MALE',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    idNumber: '',
    membershipStatus: 'ACTIVE',
    username: '',
    roles: ['MEMBER'],
    needsAccount: false,
  });

  useEffect(() => {
    fetchHeadMembers();
    fetchAvailableRoles();
    memberApi.getStats().then(stats => setCurrentMemberCount(stats.total)).catch(() => {});
  }, []);

  const fetchAvailableRoles = async () => {
    try {
      const rolesData = await ApiClient.get<{id: number; name: string; description: string}[]>('/admin/roles/assignable');
      setAvailableRoles(rolesData);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchHeadMembers = async () => {
    try {
      const data: any = await memberApi.getAll();
      // Filter members who have accounts (heads of household)
      const heads = data.filter((m: Member) => m.username);
      setHeadMembers(heads);
    } catch (error) {
      console.error('Failed to fetch head members:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Convert partnerId and parentId to numbers if they have values
    if (name === 'partnerId' || name === 'parentId') {
      setFormData((prev) => ({ ...prev, [name]: value ? Number(value) : undefined }));
    } else if (name === 'email') {
      // When email changes, update username if account is enabled
      setFormData((prev) => ({
        ...prev,
        email: value,
        username: prev.needsAccount ? (value || prev.username) : prev.username,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clean up form data - remove empty strings and conditionally remove account fields
      const cleanData: any = {};
      
      Object.entries(formData).forEach(([key, value]) => {
        // Skip needsAccount field
        if (key === 'needsAccount') return;
        
        // Skip account-related fields if account is not needed
        if (!formData.needsAccount && ['username', 'roles'].includes(key)) {
          return;
        }
        
        // Only add non-empty values or explicitly set to undefined for optional numeric fields
        if (key === 'partnerId' || key === 'parentId') {
          if (value) cleanData[key] = value;
        } else if (value !== '' && value !== null) {
          cleanData[key] = value;
        }
      });
      
      await memberApi.create(cleanData);
      router.push('/members');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const atLimit = membersLimit != null && membersLimit > 0 && currentMemberCount != null && currentMemberCount >= membersLimit;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/members')}
          >
            ← {t('member_detail.back_to_members')}
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('member_add.title')}</h1>
        <p className="text-gray-600">
          {t('member_add.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {atLimit && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{t('plan.member_limit_reached', { limit: String(membersLimit) })}</p>
              <p className="text-sm text-amber-700 mt-0.5">{t('plan.upgrade_prompt')}</p>
            </div>
            <a href="/billing" className="shrink-0 text-sm font-medium text-amber-700 underline hover:text-amber-900">{t('plan.upgrade_button')} →</a>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('member_edit.personal_information')}</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_edit.first_name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_edit.last_name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_detail.email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_detail.phone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_detail.date_of_birth')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_detail.gender')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="MALE">{t('member_edit.male')}</option>
                      <option value="FEMALE">{t('member_edit.female')}</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('member_edit.id_number')}
                  </label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. CBB-001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('member_detail.address')}
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('member_edit.city')}</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('member_edit.country')}</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_edit.postal_code')}
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Family Relationship section removed as requested */}
              </CardContent>
            </Card>
          </div>

          {/* Account & Membership */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('member_edit.account_details')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="needsAccount"
                        checked={formData.needsAccount}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            needsAccount: checked,
                            username: checked ? (prev.email || prev.username) : '',
                          }));
                        }}
                        className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {t('member_add.create_account')}
                        </span>
                        <p className="text-xs text-gray-500">
                          {t('member_add.create_account_hint')}
                        </p>
                      </div>
                    </label>
                  </div>

                  {formData.needsAccount && (
                    <>
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-charcoal mb-3">{t('member_add.account_setup')}</h4>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('member_detail.username')}
                        </label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t('member_edit.username_from_email')}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('member_edit.roles')} <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {availableRoles.map((role) => (
                            <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.roles.includes(role.name)}
                                onChange={(e) => {
                                  setFormData((prev) => {
                                    const newRoles = e.target.checked
                                      ? [...prev.roles, role.name]
                                      : prev.roles.filter((r) => r !== role.name);
                                    return { ...prev, roles: newRoles.length > 0 ? newRoles : ['MEMBER'] };
                                  });
                                }}
                                className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                              />
                              <span className="text-sm text-gray-700">{role.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className={formData.needsAccount ? 'pt-4 border-t border-gray-200' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('member_edit.membership_status')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="membershipStatus"
                      value={formData.membershipStatus}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="ACTIVE">{t('member_edit.active')}</option>
                      <option value="INACTIVE">{t('member_edit.inactive')}</option>
                      <option value="SUSPENDED">{t('member_edit.suspended')}</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 space-y-3">
              <Button type="submit" className="w-full" disabled={loading || atLimit}>
                {loading ? t('member_add.creating') : t('member_add.create')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => router.push('/members')}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
