'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { authApi, portalApi, profileImageApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Member } from '@/types';
import { getStatusColor } from '@/lib/utils';
import { useDateFormat } from '@/lib/DateFormatContext';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  memberId?: number;
}

export default function AccountPage() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberProfile, setMemberProfile] = useState<Member | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchMemberProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/me');

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
      const profileData: any = await portalApi.getProfile();
      setMemberProfile(profileData);
      // Set profile image URL if available
      if (profileData.profileImageUrl) {
        setProfileImageUrl(profileData.profileImageUrl + '?t=' + Date.now());
      }
    } catch (error) {
      // Member profile not linked - this is OK for admin users
      console.log('No member profile linked to this user');
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/users/me/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const result = await profileImageApi.uploadMy(file);
      setProfileImageUrl(result.imageUrl + '?t=' + Date.now());
    } catch (error: any) {
      setMessage(error?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileImageDelete = async () => {
    try {
      await profileImageApi.deleteMy();
      setProfileImageUrl(null);
    } catch (error: any) {
      setMessage(error?.message || 'Failed to delete image');
    }
  };

  const handlePasswordChangeSubmit = async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword({ oldPassword, newPassword });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center text-red-600">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('account.title')}</h1>
        <p className="text-gray-600">{t('account.subtitle')}</p>
      </div>

      {/* Profile Image */}
      <div className="mb-8">
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-emerald-700">
                    {memberProfile
                      ? `${memberProfile.firstName?.[0] || ''}${memberProfile.lastName?.[0] || ''}`.toUpperCase()
                      : profile.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                title={t('account.upload_photo')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-charcoal">{t('account.profile_photo')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('account.profile_photo_hint')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition disabled:opacity-50"
                >
                  {uploadingImage ? t('account.uploading') : t('account.upload_photo')}
                </button>
                {profileImageUrl && (
                  <button
                    type="button"
                    onClick={handleProfileImageDelete}
                    className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                  >
                    {t('account.remove_photo')}
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleProfileImageUpload}
            />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-charcoal mb-4">{t('account.settings')}</h2>
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 space-y-6">
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
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4 border-t">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('account.personal_information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
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
