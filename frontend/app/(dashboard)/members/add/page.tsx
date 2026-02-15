'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import { memberApi } from '@/lib/api';
import { Member } from '@/types';

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
  needsAccount: boolean;
}

export default function AddMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    needsAccount: false,
  });

  useEffect(() => {
    fetchHeadMembers();
  }, []);

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
        if (!formData.needsAccount && ['username', 'password', 'role'].includes(key)) {
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

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/members')}
          >
            ← Back to Members
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">Add New Member</h1>
        <p className="text-gray-600">
          Create a new member. Head of household needs an account to manage family and fees.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
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
                      First Name <span className="text-red-500">*</span>
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
                      Last Name <span className="text-red-500">*</span>
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
                      Email
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
                      Phone
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
                      Date of Birth <span className="text-red-500">*</span>
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
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
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
                      Postal Code
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
                <CardTitle>Membership Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="needsAccount"
                        checked={formData.needsAccount}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, needsAccount: e.target.checked }))
                        }
                        className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Create Account
                        </span>
                        <p className="text-xs text-gray-500">
                          Head of household needs an account to manage family
                        </p>
                      </div>
                    </label>
                  </div>

                  {formData.needsAccount && (
                    <>
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-charcoal mb-3">Account Credentials</h4>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          required={formData.needsAccount}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required={formData.needsAccount}
                          minLength={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum 6 characters
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          required={formData.needsAccount}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className={formData.needsAccount ? 'pt-4 border-t border-gray-200' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membership Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="membershipStatus"
                      value={formData.membershipStatus}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 space-y-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Member...' : 'Create Member'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => router.push('/members')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
