'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { authApi, portalApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Member, MembershipFee } from '@/types';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  memberId?: number;
}

export default function AccountPage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberProfile, setMemberProfile] = useState<Member | null>(null);
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchMemberProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEmail(data.email || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberProfile = async () => {
    // Only attempt to fetch member profile if the user has a linked personId
    const personId = localStorage.getItem('personId');
    const memberId = localStorage.getItem('memberId');
    if (!personId && !memberId) {
      // Admin users or users without member profiles - skip silently
      return;
    }
    try {
      const [profileData, feesData]: any = await Promise.all([
        portalApi.getProfile(),
        portalApi.getFees(),
      ]);
      setMemberProfile(profileData);
      setFees(feesData);
    } catch (error) {
      // Member profile not linked - this is OK for admin users
      console.log('No member profile linked to this user');
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/users/me/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('Email updated successfully');
        fetchProfile();
      } else {
        setMessage('Failed to update email');
      }
    } catch (error) {
      setMessage('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChangeSubmit = async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword({ oldPassword, newPassword });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">Failed to load profile</div>
      </div>
    );
  }

  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidFees = fees.filter((f) => f.status === 'PAID').reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal mb-2">{t('account.title')}</h1>
        <p className="text-gray-600">{t('account.subtitle')}</p>
      </div>

      {/* Account Settings */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-charcoal mb-4">{t('account.settings')}</h2>
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('account.username')}
              </label>
              <input
                type="text"
                value={profile.username}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500">{t('account.username_cannot_be_changed')}</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('account.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="your.email@example.com"
              />
              <p className="mt-1 text-sm text-gray-500">{t('account.email_required_for_reset')}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('account.role')}
              </label>
              <input
                type="text"
                value={profile.role}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('success') || message.includes('successfully')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                onClick={handleSaveEmail}
                disabled={saving || email === profile.email}
                className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('account.saving') : t('account.save_email')}
              </button>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                {t('common.change_password')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Member Profile (if available) */}
      {memberProfile && (
        <>
          <h2 className="text-xl font-semibold text-charcoal mb-4">{t('account.member_profile')}</h2>
          
          {/* Profile Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('account.personal_information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('account.full_name')}</p>
                    <p className="font-medium text-charcoal">
                      {memberProfile.firstName} {memberProfile.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('account.email')}</p>
                    <p className="font-medium text-charcoal">{memberProfile.email || ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('account.phone')}</p>
                    <p className="font-medium text-charcoal">{memberProfile.phone || ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('account.member_since')}</p>
                    <p className="font-medium text-charcoal">{formatDate(memberProfile.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('account.status')}</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        memberProfile.status
                      )}`}
                    >
                      {memberProfile.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('account.fee_summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('account.total_fees')}</p>
                  <p className="text-2xl font-bold text-charcoal">{formatCurrency(totalFees)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('account.paid')}</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidFees)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('account.pending')}</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(totalFees - paidFees)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Children (not available in Member type) */}
          {/* If you want to show children, fetch them separately and map here. */}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>{t('account.payment_history')} ({fees.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('account.amount')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('account.due_date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('account.paid_date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('account.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fees.map((fee) => (
                      <tr key={fee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-charcoal">
                          {formatCurrency(fee.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatDate(fee.dueDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {fee.paidDate ? formatDate(fee.paidDate) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              fee.status
                            )}`}
                          >
                            {fee.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          onSubmit={handlePasswordChangeSubmit}
        />
      )}
    </div>
  );
}
