'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import { memberApi, ApiClient } from '@/lib/api';
import { Member } from '@/types';
import { useTranslation } from '@/lib/i18n/LanguageContext';

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
  membershipStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  username: string;
  roles: string[];
  partnerId?: number;
  parentId?: number;
}


export default function EditMemberPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [headMembers, setHeadMembers] = useState<Member[]>([]);
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
    membershipStatus: 'ACTIVE',
    username: '',
    roles: ['MEMBER'],
  });
  // Checkbox state: true if username exists, else false
  const [accountEnabled, setAccountEnabled] = useState(false);
  // Available roles fetched from API
  const [availableRoles, setAvailableRoles] = useState<{id: number; name: string}[]>([]);

  useEffect(() => {
    fetchMemberData();
    fetchHeadMembers();
    fetchAvailableRoles();
  }, [memberId]);

  const fetchAvailableRoles = async () => {
    try {
      const rolesData = await ApiClient.get<{id: number; name: string; description: string}[]>('/admin/roles');
      // Filter out SUPER_ADMIN — not assignable via member edit
      setAvailableRoles(rolesData.filter(r => r.name !== 'SUPER_ADMIN'));
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchMemberData = async () => {
    try {
      const data: any = await memberApi.getById(memberId);
       console.log(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender || 'MALE',
        address: data.address || '',
        city: data.city || '',
        country: data.country || '',
        postalCode: data.postalCode || '',
        membershipStatus: data.membershipStatus || 'ACTIVE',
        username: data.username || data.email || '',
        roles: data.roles || ['MEMBER'],
        partnerId: data.partnerId,
        parentId: data.parentId,
      });
      setAccountEnabled(!!data.username);
    } catch (error) {
      console.error('Failed to fetch member:', error);
      setError('Failed to load member data');
    } finally {
      setFetching(false);
    }
  };

  const fetchHeadMembers = async () => {
    try {
      const data: any = await memberApi.getAll();
      const heads = data.filter((m: Member) => m.username && String(m.id) !== String(memberId));
      setHeadMembers(heads);
    } catch (error) {
      console.error('Failed to fetch head members:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (type === 'checkbox' && 'checked' in e.target) ? (e.target as HTMLInputElement).checked : undefined;
    if (name === 'accountEnabled') {
      setAccountEnabled(!!checked);
      if (!checked) {
        setFormData((prev) => ({ ...prev, username: '', roles: ['MEMBER'] }));
      } else {
        // Auto-set username from email when enabling account
        setFormData((prev) => ({ ...prev, username: prev.email || prev.username }));
      }
      return;
    }
    // When email changes, update username if account is enabled
    if (name === 'email' && accountEnabled) {
      setFormData((prev) => ({ ...prev, email: value, username: value || prev.username }));
      return;
    }
    // Convert partnerId and parentId to numbers if they have values
    if (name === 'partnerId' || name === 'parentId') {
      setFormData((prev) => ({ ...prev, [name]: value ? Number(value) : undefined }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clean up form data - remove empty strings
      const cleanData: any = {};
      Object.entries(formData).forEach(([key, value]) => {
        // Handle optional numeric fields
        if (key === 'partnerId' || key === 'parentId') {
          if (value) cleanData[key] = value;
        } else if (value !== '' && value !== null) {
          cleanData[key] = value;
        }
      });
      // Always send id as string for backend compatibility
      cleanData.id = String(memberId);
      // Always send accountEnabled flag (matches MemberDTO)
      cleanData.accountEnabled = accountEnabled;

      await memberApi.update(memberId, cleanData);
      router.push(`/members/${memberId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/members/${memberId}`)}
          >
            ← {t('member_edit.back_to_member')}
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('member_edit.edit_member')}</h1>
        <p className="text-gray-600">{t('member_edit.update_member_information')}</p>
      </div>

      <form onSubmit={handleSubmit}>
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
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="accountEnabled"
                      name="accountEnabled"
                      checked={accountEnabled}
                      onChange={handleInputChange}
                      className="mr-2 h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="accountEnabled" className="text-sm font-medium text-gray-700">
                      {t('member_edit.enable_account')}
                    </label>
                  </div>

                  {accountEnabled ? (
                    <>
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
                          {t('member_edit.roles')}
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
                  ) : (
                    <div className="text-sm text-gray-500 italic py-4">
                      {t('member_edit.no_account')}
                    </div>
                  )}

                  <div className={formData.username ? 'pt-4 border-t border-gray-200' : ''}>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('member_edit.updating_member') : t('member_edit.update_member')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => router.push(`/members/${memberId}`)}
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
