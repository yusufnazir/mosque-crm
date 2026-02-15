'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import { memberApi } from '@/lib/api';
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
  password: string;
  role: 'ADMIN' | 'MEMBER';
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
    password: '',
    role: 'MEMBER',
  });
  // Checkbox state: true if username exists, else false
  const [accountEnabled, setAccountEnabled] = useState(false);
  // Show/hide password toggle state
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchMemberData();
    fetchHeadMembers();
  }, [memberId]);

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
        username: data.username || '',
        password: '',
        role: data.role || 'MEMBER',
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
        setFormData((prev) => ({ ...prev, username: '', password: '', role: 'MEMBER' }));
      }
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
      // Clean up form data - remove empty strings and password if not changed
      const cleanData: any = {};
      Object.entries(formData).forEach(([key, value]) => {
        // Skip password if empty (no change)
        if (key === 'password' && !value) return;
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
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('member_edit.new_password')}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            minLength={6}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none pr-10"
                            placeholder={t('member_edit.leave_blank_password')}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.223-3.592m3.1-2.727A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.973 9.973 0 01-4.043 5.306M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('member_edit.leave_blank_password_hint')}
                        </p>
                      </div>


                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('member_edit.role')}
                        </label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                          <option value="MEMBER">{t('member_edit.member')}</option>
                          <option value="ADMIN">{t('member_edit.admin')}</option>
                        </select>
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
