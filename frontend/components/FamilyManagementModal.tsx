'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import { memberApi } from '@/lib/api';
import { Member } from '@/types';

interface FamilyManagementModalProps {
  member: Member;
  onClose: () => void;
  onUpdate: () => void;
}

export default function FamilyManagementModal({ member, onClose, onUpdate }: FamilyManagementModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'partner' | 'children'>('partner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // For adding new child
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [childForm, setChildForm] = useState({
    firstName: '',
    lastName: member.lastName,
    dateOfBirth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results: any = await memberApi.search(searchTerm);
      // Filter out current member and existing partner/children
      const filtered = results.filter(
        (m: Member) =>
          m.id !== member.id &&
          m.id !== member.partnerId &&
          !member.children?.some((child) => child.id === m.id)
      );
      setSearchResults(filtered);
    } catch (err: any) {
      setError(err.message || 'Failed to search members');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPartner = async (partnerId: string) => {
    try {
      setLoading(true);
      setError('');
      await memberApi.update(member.id, { ...member, partnerId });
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to link partner');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewChild = async () => {
    try {
      setLoading(true);
      setError('');
      const newChild = {
        ...childForm,
        membershipStatus: 'ACTIVE',
        parentId: member.id,
        needsAccount: false,
      };
      await memberApi.create(newChild);
      onUpdate();
      setShowAddChildForm(false);
      setChildForm({ firstName: '', lastName: member.lastName, dateOfBirth: '', gender: 'MALE' });
    } catch (err: any) {
      setError(err.message || 'Failed to add child');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExistingChild = async (childId: string) => {
    try {
      setLoading(true);
      setError('');
      const childToUpdate = searchResults.find((m) => m.id === childId);
      if (childToUpdate) {
        await memberApi.update(childId, { ...childToUpdate, parentId: member.id });
      }
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to link child');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-charcoal">Manage Family</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600">
            Add or link family members for {member.firstName} {member.lastName}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('partner')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'partner'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Partner/Spouse
          </button>
          <button
            onClick={() => setActiveTab('children')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'children'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Children
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Partner Tab */}
          {activeTab === 'partner' && (
            <div>
              {member.partnerName ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-800 mb-2">Current Partner:</p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-emerald-900">{member.partnerName}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/members/${member.partnerId}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Search and link existing member as partner</p>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                      Search
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {result.firstName} {result.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {result.email} • {result.gender}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleLinkPartner(result.id)}
                            disabled={loading}
                          >
                            Link as Partner
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Children Tab */}
          {activeTab === 'children' && (
            <div>
              {member.children && member.children.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Current Children:</p>
                  <div className="space-y-2">
                    {member.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-blue-900">
                            {child.firstName} {child.lastName}
                          </p>
                          <p className="text-sm text-blue-700">{child.gender}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/members/${child.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-4"></div>
                </div>
              )}

              {!showAddChildForm ? (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={() => setShowAddChildForm(true)}
                  >
                    + Add New Child
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or link existing member</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                      Search
                    </Button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {result.firstName} {result.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{result.dateOfBirth}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleLinkExistingChild(result.id)}
                            disabled={loading}
                          >
                            Link as Child
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={childForm.firstName}
                      onChange={(e) =>
                        setChildForm({ ...childForm, firstName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={childForm.lastName}
                      onChange={(e) =>
                        setChildForm({ ...childForm, lastName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={childForm.dateOfBirth}
                      onChange={(e) =>
                        setChildForm({ ...childForm, dateOfBirth: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={childForm.gender}
                      onChange={(e) =>
                        setChildForm({ ...childForm, gender: e.target.value as 'MALE' | 'FEMALE' })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleAddNewChild}
                      disabled={loading || !childForm.firstName || !childForm.dateOfBirth}
                    >
                      Add Child
                    </Button>
                    <Button
                      className="flex-1"
                      variant="ghost"
                      onClick={() => {
                        setShowAddChildForm(false);
                        setChildForm({
                          firstName: '',
                          lastName: member.lastName,
                          dateOfBirth: '',
                          gender: 'MALE',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
