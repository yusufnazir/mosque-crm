'use client';

import { useEffect, useState } from 'react';
import FamilyTree from '@/components/family-tree';
import GenealogyTree from '@/components/GenealogyTree';
import ComprehensiveFamilyTree from '@/components/comprehensive-family-tree';
import { relationshipApi, memberApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { portalApi } from '@/lib/api';
import { Member, MembershipFee } from '@/types';
import { formatCurrency, formatDate, getStatusColor, getLocalizedStatus } from '@/lib/utils';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Member | null>(null);
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Member | null>(null);
  const [father, setFather] = useState<Member | null>(null);
  const [mother, setMother] = useState<Member | null>(null);
  const [siblings, setSiblings] = useState<Member[]>([]);
  const [children, setChildren] = useState<Member[]>([]);
  const [familyTreeTab, setFamilyTreeTab] = useState<'immediate' | 'genealogy'>('immediate');
  const [genealogyData, setGenealogyData] = useState<any>(null);
  const [genealogyLoading, setGenealogyLoading] = useState(false);
  // Fetch genealogy data when genealogy tab is selected
  useEffect(() => {
    const fetchGenealogyGraph = async () => {
      if (!profile?.personId) return;
      try {
        setGenealogyLoading(true);
        const response = await fetch(`http://localhost:8080/api/genealogy/persons/${profile.personId}/graph`);
        if (!response.ok) throw new Error('Failed to load genealogy graph');
        const graphData = await response.json();
        setGenealogyData(graphData);
      } catch (err) {
        setGenealogyData(null);
      } finally {
        setGenealogyLoading(false);
      }
    };
    if (familyTreeTab === 'genealogy' && !genealogyData && profile?.personId) {
      fetchGenealogyGraph();
    }
  }, [familyTreeTab, profile?.personId]);

    const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      // Only attempt to fetch member profile if the user has a linked memberId
      const personId = localStorage.getItem('personId');
      const memberId = localStorage.getItem('memberId');
      if (!personId && !memberId) {
        setLoading(false);
        return;
      }
      try {
        const [profileData, feesData]: any = await Promise.all([
          portalApi.getProfile(),
          portalApi.getFees(),
        ]);
        setProfile(profileData);
        setFees(feesData);

        // Fetch family relationships if personId is available
        if (profileData.personId) {
          try {
            const relationships = await relationshipApi.getRelationships(profileData.personId);
            // Fetch all members for mapping
            const allMembers: Member[] = await memberApi.getAll() as Member[];

            // Partner
            const spouseRel = relationships.find((r: any) => r.relationshipType === 'SPOUSE');
            if (spouseRel) {
              const spouse = allMembers.find((m) => m.personId === spouseRel.relatedPersonId);
              if (spouse) setPartner(spouse);
            }
            // Father
            const fatherRel = relationships.find((r: any) => r.relationshipType === 'FATHER');
            if (fatherRel) {
              const fatherMember = allMembers.find((m) => m.personId === fatherRel.relatedPersonId);
              if (fatherMember) setFather(fatherMember);
            }
            // Mother
            const motherRel = relationships.find((r: any) => r.relationshipType === 'MOTHER');
            if (motherRel) {
              const motherMember = allMembers.find((m) => m.personId === motherRel.relatedPersonId);
              if (motherMember) setMother(motherMember);
            }
            // Children
            const childRels = relationships.filter((r: any) => r.relationshipType === 'CHILD');
            if (childRels.length > 0) {
              const childMembers = childRels
                .map((rel: any) => allMembers.find((m) => m.personId === rel.relatedPersonId))
                .filter(Boolean);
              setChildren(childMembers as Member[]);
            }
            // Siblings (not direct in GEDCOM, but can be inferred if needed)
            // Optionally, fetch siblings if required
          } catch (err) {
            // No relationships found
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('profile.no_profile_title') || 'No Member Profile'}</h3>
            <p className="text-gray-600">{t('profile.no_profile_message') || 'Your account is not linked to a member profile. Please contact an administrator.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidFees = fees.filter((f) => f.status === 'PAID').reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal mb-2">{t('sidebar.my_profile')}</h1>
        <p className="text-gray-600">{t('member_detail.view_membership_details')}</p>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('member_detail.personal_information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('member_detail.full_name')}</p>
                <p className="font-medium text-charcoal">
                  {profile.firstName} {profile.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('member_detail.email')}</p>
                <p className="font-medium text-charcoal">{profile.email ? profile.email : ''}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('member_detail.phone')}</p>
                <p className="font-medium text-charcoal">{profile.phone ? profile.phone : ''}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('member_detail.member_since')}</p>
                <p className="font-medium text-charcoal">{formatDate(profile.memberSince)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('common.status')}</p>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      profile.status || profile.membershipStatus || 'ACTIVE'
                    )}`}
                  >
                    {t(getLocalizedStatus(profile.status || profile.membershipStatus || 'ACTIVE'))}
                  </span>
                  {profile.status === 'DECEASED' && (
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                </div>
              </div>
              {/* Show date of death if the member is deceased */}
              {profile.dateOfDeath && (
                <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-red-800 font-medium">
                      {t('member_detail.date_of_death')}
                    </p>
                  </div>
                  <p className="text-red-900 font-medium">{formatDate(profile.dateOfDeath)}</p>
                </div>
              )}
              {profile.partnerName && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('member_detail.partner')}</p>
                  <p className="font-medium text-charcoal">{profile.partnerName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('member_detail.fee_summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('member_detail.total_fees')}</p>
              <p className="text-2xl font-bold text-charcoal">{formatCurrency(totalFees)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('member_detail.total_paid')}</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidFees)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('member_detail.total_pending')}</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalFees - paidFees)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Family Tree Tabs */}
      {profile && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('member_detail.family_tree')}</h2>
          <div className="flex gap-2 mb-4 border-b border-stone-200">
            <button
              onClick={() => setFamilyTreeTab('immediate')}
              className={`px-4 py-2 font-medium transition-colors ${
                familyTreeTab === 'immediate'
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('member_detail.immediate_family')}
            </button>
            <button
              onClick={() => setFamilyTreeTab('genealogy')}
              className={`px-4 py-2 font-medium transition-colors ${
                familyTreeTab === 'genealogy'
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('member_detail.full_genealogy')}
            </button>
          </div>
          {familyTreeTab === 'immediate' && (
            <FamilyTree
              member={profile}
              partner={partner || undefined}
              father={father || undefined}
              mother={mother || undefined}
              siblings={siblings}
              children={children}
            />
          )}
          {familyTreeTab === 'genealogy' && (
            <div>
              {genealogyLoading ? (
                <div className="bg-stone-50 rounded-lg border border-stone-200 p-12 text-center">
                  <div className="animate-pulse">
                    <div className="h-[600px] bg-gray-200 rounded"></div>
                  </div>
                  <p className="text-stone-600 mt-4">{t('member_detail.loading_genealogy')}</p>
                </div>
              ) : genealogyData && genealogyData.nodes?.length > 0 ? (
                <div className="h-[600px] bg-white rounded-lg border border-stone-200">
                  <GenealogyTree 
                    data={genealogyData}
                    onNodeClick={(nodeId: string, nodeType: string) => {
                      if (nodeType === 'PERSON') {
                        // Optionally, navigate to a detail page
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="bg-stone-50 rounded-lg border border-stone-200 p-12 text-center text-stone-600">
                  <p className="text-lg mb-2">{t('member_detail.no_genealogy_data')}</p>
                  <p className="text-sm">{t('member_detail.add_family_relationships')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('member_detail.membership_fees_history')} ({fees.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('member_detail.amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('member_detail.due_date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('member_detail.paid_date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.status')}
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
                      {fee.paidDate ? formatDate(fee.paidDate) : ''}
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
    </div>
  );
}
