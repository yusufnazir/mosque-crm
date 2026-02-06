'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { memberApi } from '@/lib/api';
import Button from '@/components/Button';
import { PersonSearchResult } from '@/types';
import { getInitials, getStatusColor, getLocalizedStatus } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/LanguageContext';

// Helper function to capitalize names properly
const capitalizeName = (name: string | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function MembersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [members, setMembers] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [sortConfig]);

  const fetchMembers = async () => {
    try {
      console.log('🔍 Fetching members list...');
      const params = new URLSearchParams();
      if (sortConfig) {
        params.append('sortBy', sortConfig.key);
        params.append('direction', sortConfig.direction);
      }
      
      const data: any = await memberApi.getAll(params.toString());
      console.log('✅ Members fetched successfully:', data.length, 'members');
      setMembers(data);
    } catch (error) {
      console.error('❌ Failed to fetch members:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: typeof error,
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredMembers = members.filter(
    (member) =>
      member.id && // Filter out members with null/undefined id
      (
        (member.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (member.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      )
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-charcoal mb-2">{t('members.title')}</h1>
          <p className="text-gray-600">{t('members.subtitle')}</p>
        </div>
        <Button onClick={() => router.push('/members/add')}>{t('members.add_new_member')}</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('members.all_members')} ({filteredMembers.length})</CardTitle>
            <input
              type="text"
              placeholder={t('members.search_members')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center">
                      {t('members.member')}
                      {sortConfig?.key === 'firstName' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      {t('members.contact')}
                      {sortConfig?.key === 'email' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      {t('common.status')}
                      {sortConfig?.key === 'status' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  {/* Removed 'type' column */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMembers.map((member, index) => (
                  <tr key={member.id || `member-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold ${
                          member.status === 'DECEASED' ? 'bg-red-600' : 'bg-emerald-600'
                        }`}>
                          {member.firstName && member.lastName 
                            ? getInitials(member.firstName, member.lastName)
                            : 'M'}
                        </div>
                        <div>
                          <div className="font-medium text-charcoal">
                            {member.firstName && member.lastName 
                              ? `${capitalizeName(member.firstName)} ${capitalizeName(member.lastName)}`
                              : t('members.unknown')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.email && <div className="text-sm text-gray-900">{member.email}</div>}
                      {member.phone && <div className="text-sm text-gray-500">{member.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          member.status || 'ACTIVE'
                        )}`}
                      >
                        {t(getLocalizedStatus(member.status || 'ACTIVE'))}
                      </span>
                    </td>
                    {/* Removed 'type' column cell */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => router.push(`/members/${member.id}`)}
                        >
                          {t('common.view')}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => router.push(`/members/${member.id}/edit`)}
                        >
                          {t('common.edit')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
