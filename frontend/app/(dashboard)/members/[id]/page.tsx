'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import { memberApi, feeApi, relationshipApi, personApi } from '@/lib/api';
import { Member, MembershipFee, RelationshipResponse } from '@/types';
import { formatCurrency, formatDate, getStatusColor, getLocalizedStatus } from '@/lib/utils';
import FamilyManagementModal from '@/components/FamilyManagementModal';
import FamilyTree from '@/components/family-tree';
import ComprehensiveFamilyTree from '@/components/comprehensive-family-tree';
import GenealogyTree from '@/components/GenealogyTree';
import { useTranslation } from '@/lib/i18n/LanguageContext';

// Helper function to capitalize names properly
const capitalizeName = (name: string | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [children, setChildren] = useState<Member[]>([]);
  const [parent, setParent] = useState<Member | null>(null);
  const [father, setFather] = useState<Member | null>(null);
  const [mother, setMother] = useState<Member | null>(null);
  const [siblings, setSiblings] = useState<Member[]>([]);
  const [partner, setPartner] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [viewMode, setViewMode] = useState<'immediate' | 'comprehensive'>('immediate');
  const [familyTreeTab, setFamilyTreeTab] = useState<'immediate' | 'genealogy'>('immediate');
  const [genealogyData, setGenealogyData] = useState<any>(null);
  const [genealogyLoading, setGenealogyLoading] = useState(false);
  const [showDeceasedConfirmation, setShowDeceasedConfirmation] = useState(false);
  // State for toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  
  // State for deceased date
  const [deceasedDate, setDeceasedDate] = useState<string>('');
  const [editingDeceasedDate, setEditingDeceasedDate] = useState<boolean>(false);
  const [tempDeceasedDate, setTempDeceasedDate] = useState<string>('');

  // Function to mark member as deceased
  const handleMarkAsDeceased = async () => {
    if (!member?.personId) return;
    
    try {
      // Use the entered date or today's date as the default date of death
      const dateToUse = deceasedDate || new Date().toISOString().split('T')[0];
      
      await personApi.markAsDeceased(member.personId, { dateOfDeath: dateToUse });
      
      // Refresh member data to reflect the status change
      await fetchMemberDetails();
      
      setToast({ message: t('member_detail.success_mark_deceased'), type: 'success' });
      setShowDeceasedConfirmation(false);
      setDeceasedDate(''); // Reset the date input
    } catch (error) {
      console.error('Error marking member as deceased:', error);
      setToast({ message: t('member_detail.error_mark_deceased'), type: 'error' });
      setShowDeceasedConfirmation(false);
    }
  };

  // Function to start editing the date of death
  // Remove legacy dateOfDeath editing (not present in Member type)
  const startEditingDeceasedDate = () => {
    // No-op: Member does not have dateOfDeath
  };

  // Function to save the edited date of death
  const saveEditedDeceasedDate = async () => {
    if (!member?.personId) return;
    
    try {
      await personApi.markAsDeceased(member.personId, { dateOfDeath: tempDeceasedDate });
      
      // Refresh member data to reflect the updated date
      await fetchMemberDetails();
      
      setToast({ message: t('member_detail.success_update_deceased_date'), type: 'success' });
      setEditingDeceasedDate(false);
    } catch (error) {
      console.error('Error updating deceased date:', error);
      setToast({ message: t('member_detail.error_update_deceased_date'), type: 'error' });
    }
  };

  // Function to cancel editing the date of death
  const cancelEditingDeceasedDate = () => {
    setEditingDeceasedDate(false);
    setTempDeceasedDate('');
  };

  useEffect(() => {
    console.log('MemberDetailPage: useEffect triggered, calling fetchMemberDetails');
    fetchMemberDetails();
  }, [memberId]);
  // First effect: load memberData when id changes
  useEffect(() => {
    // ...existing code to load memberData...
    // If you already have a memberData loading function, call it here
    // For example:
    // loadMemberData(memberId);
  }, [memberId]);

  // Second effect: fetch relationships only when memberData.personId is available
  // Effect 1: Load member data when id changes
  useEffect(() => {
    // Replace with your member loading logic, e.g.:
    // memberApi.getById(memberId).then(setMember);
    // For now, just log for debug:
    console.log('Effect 1: load member for memberId', memberId);
  }, [memberId]);

  // Effect 2: Load relationships only when member is loaded
  useEffect(() => {
    if (member && member.personId) {
      console.log('Effect 2: member loaded, calling fetchMemberDetails for relationships');
      fetchMemberDetails();
    }
  }, [member?.personId]);

  useEffect(() => {
    // Fetch all members for the selector
    const fetchAllMembers = async () => {
      try {
        const membersData: any = await memberApi.getAll();
        setAllMembers(membersData);
      } catch (err) {
        console.log('Failed to load members list');
      }
    };
    fetchAllMembers();
  }, []);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      // Fetch member data
      let memberData: any = await memberApi.getById(memberId);
      // Always map id to personId
      if (memberData.id) memberData.personId = memberData.id;
      setMember(memberData);

      console.log('fetchMemberDetails: about to call relationshipApi.getRelationships, function ref:', relationshipApi.getRelationships);
      console.log('fetchMemberDetails: about to call /genealogy/persons/' + memberData.personId + '/relationships');
      if (memberData.personId) {
        try {
          console.log('fetchMemberDetails: BEFORE await relationshipApi.getRelationships');
          const relationships = await relationshipApi.getRelationships(memberData.personId) as RelationshipResponse[];
          console.log('fetchMemberDetails: AFTER await relationshipApi.getRelationships, response:', relationships);
          let allMembersData = await memberApi.getAll() as Member[];
          // Always map id to personId for all members
          allMembersData = allMembersData.map(m => ({ ...m, personId: m.id }));
          console.log('fetchMemberDetails debug:', { relationships, allMembersData });

          // Debug: print allMembersData and relationships for mapping
          console.log('Mapping relationships: allMembersData', allMembersData);
          relationships.forEach(rel => {
            console.log('Relationship:', rel.relationshipType, 'relatedPersonId:', rel.relatedPersonId, typeof rel.relatedPersonId);
          });

          allMembersData.forEach(m => {
            console.log('Member:', m.personId, typeof m.personId, m.firstName, m.lastName);
          });

          // Extract spouse
          const spouseRel = relationships.find(r => r.relationshipType === 'SPOUSE');
          const mappedPartner = spouseRel ? allMembersData.find((m: Member) => String(m.personId) === String(spouseRel.relatedPersonId)) || null : null;
          console.log('Mapped partner:', mappedPartner);
          setPartner(mappedPartner);

          // Extract parents
          const fatherRel = relationships.find(r => r.relationshipType === 'FATHER');
          const motherRel = relationships.find(r => r.relationshipType === 'MOTHER');
          setFather(fatherRel ? allMembersData.find((m: Member) => String(m.personId) === String(fatherRel.relatedPersonId)) || null : null);
          setMother(motherRel ? allMembersData.find((m: Member) => String(m.personId) === String(motherRel.relatedPersonId)) || null : null);
          setParent(fatherRel ? allMembersData.find((m: Member) => String(m.personId) === String(fatherRel.relatedPersonId)) || null : null);

          // Extract children
          const childRels = relationships.filter(r => r.relationshipType === 'CHILD');
          const mappedChildren = childRels.length > 0 ? childRels.map(rel => {
            const child = allMembersData.find((m: Member) => String(m.personId) === String(rel.relatedPersonId));
            console.log('Mapped child for rel', rel.relatedPersonId, ':', child);
            return child;
          }).filter(Boolean) as Member[] : [];
          setChildren(mappedChildren);
        } catch (err) {
          console.error('Error fetching genealogy relationships:', err);
          console.log('No genealogy relationships found, using legacy structure');
        }
      }
      
      // Try to fetch fees, but don't fail if table doesn't exist yet
      try {
        const feesData: any = await feeApi.getByMember(memberId);
        setFees(feesData);
      } catch (feeError) {
        console.log('Fee data not available yet');
        setFees([]);
      }
      
      // Fallback to legacy structure if no genealogy relationships found
      if (!partner && !parent && children.length === 0) {
        // Legacy fallback removed: Member type does not support parentId, partnerId, children
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load member details');
    } finally {
      setLoading(false);
    }
  };

  const fetchGenealogyGraph = async () => {
    if (!member?.personId) return;
    
    try {
      setGenealogyLoading(true);
      const response = await fetch(`/api/genealogy/persons/${member.personId}/graph`);

      if (!response.ok) {
        throw new Error('Failed to load genealogy graph');
      }

      const graphData = await response.json();
      setGenealogyData(graphData);
    } catch (err) {
      console.error('Error loading genealogy graph:', err);
    } finally {
      setGenealogyLoading(false);
    }
  };

  // Fetch genealogy data when genealogy tab is selected
  useEffect(() => {
    if (familyTreeTab === 'genealogy' && !genealogyData && member?.personId) {
      fetchGenealogyGraph();
    }
  }, [familyTreeTab, member?.personId]);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-red-600 mb-4">{error || 'Member not found'}</p>
            <Button onClick={() => router.push('/members')}>Back to Members</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPaid = fees
    .filter((fee) => fee.status === 'PAID')
    .reduce((sum, fee) => sum + fee.amount, 0);

  const totalPending = fees
    .filter((fee) => fee.status === 'PENDING' || fee.status === 'OVERDUE')
    .reduce((sum, fee) => sum + fee.amount, 0);

  // Debug output for relationships
  console.log('FamilyTree debug:', {
    partner,
    children,
    father,
    mother,
    siblings,
    member
  });

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/members')}>
            ← {t('member_detail.back_to_members')}
          </Button>
          
          {/* Member Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="member-select" className="text-sm text-gray-600 font-medium hidden sm:inline">
              {t('common.quick_navigate')}:
            </label>
            <select
              id="member-select"
              value={memberId}
              onChange={(e) => {
                // Only navigate if the value is a valid ID (numeric)
                const selectedValue = e.target.value;
                if (selectedValue && /^\d+$/.test(selectedValue)) {
                  router.push(`/members/${selectedValue}`);
                } else {
                  console.warn('Invalid ID format for navigation:', selectedValue);
                }
              }}
              className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              {allMembers.map((m, index) => {
                // Use personId only
                return (
                  <option key={index} value={m.personId}>
                    {capitalizeName(m.firstName)} {capitalizeName(m.lastName)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg md:text-2xl font-bold flex-shrink-0">
              {member.firstName?.[0] || '?'}{member.lastName?.[0] || '?'}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-charcoal truncate">
                {capitalizeName(member.firstName)} {capitalizeName(member.lastName)}
              </h1>
              <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                    member.status || 'ACTIVE'
                  )}`}
                >
                  {t(getLocalizedStatus(member.status || 'ACTIVE'))}
                </span>
                {member.role && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
            <Button className="flex-1 sm:flex-initial text-sm" onClick={() => router.push(`/members/${memberId}/edit`)}>
              {t('member_detail.edit_member')}
            </Button>
            <Button 
              className="flex-1 sm:flex-initial text-sm"
              variant="secondary"
              onClick={() => router.push(`/persons/${member.personId}/family`)}
            >
              {t('member_detail.manage_family')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('member_detail.personal_information')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.email')}
                  </label>
                  <p className="text-gray-900">{member.email || t('member_detail.not_provided')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.phone')}
                  </label>
                  <p className="text-gray-900">{member.phone || t('member_detail.not_provided')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.date_of_birth')}
                  </label>
                  <p className="text-gray-900">{member.dateOfBirth ? formatDate(member.dateOfBirth) : t('member_detail.not_provided')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.gender')}
                  </label>
                  <p className="text-gray-900">{member.gender || t('member_detail.not_specified')}</p>
                </div>
                {/* Show date of death if the member is deceased */}
                {/* No dateOfDeath field in Member type, skip rendering */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.member_since')}
                  </label>
                  <p className="text-gray-900">{member.startDate ? formatDate(member.startDate) : t('member_detail.not_provided')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.username')}
                  </label>
                  <p className="text-gray-900">{member.username || t('member_detail.no_account')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('common.status')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        member.status || 'ACTIVE'
                      )}`}
                    >
                      {t(getLocalizedStatus(member.status || 'ACTIVE'))}
                    </span>
                  </div>
                </div>
              </div>

              {(member.address || member.city || member.country) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    {t('member_detail.address')}
                  </label>
                  <p className="text-gray-900">
                    {member.address && <span>{member.address}<br /></span>}
                    {member.city && <span>{member.city}, </span>}
                    {member.country && <span>{member.country} </span>}
                    {member.postalCode && <span>{member.postalCode}</span>}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Information */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('member_detail.family_tree')}</h2>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFamilyModal(true)}
                >
                  {t('member_detail.manage_family')}
                </Button>
              </div>
            </div>

            {/* Tabs */}
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

            {/* Immediate Family View */}
            {familyTreeTab === 'immediate' && (
              <FamilyTree
                member={member}
                partner={partner || undefined}
                father={father || undefined}
                mother={mother || undefined}
                siblings={siblings}
                children={children}
              />
            )}

            {/* Genealogy View */}
            {familyTreeTab === 'genealogy' && (
              <div>
                {genealogyLoading ? (
                  <div className="bg-stone-50 rounded-lg border border-stone-200 p-6 md:p-12 text-center">
                    <div className="animate-pulse">
                      <div className="h-[400px] md:h-[600px] bg-gray-200 rounded"></div>
                    </div>
                    <p className="text-stone-600 mt-4">{t('member_detail.loading_genealogy')}</p>
                  </div>
                ) : genealogyData && genealogyData.nodes.length > 0 ? (
                  <div className="h-[400px] md:h-[600px] bg-white rounded-lg border border-stone-200">
                    <GenealogyTree 
                      data={genealogyData}
                      onNodeClick={(nodeId, nodeType) => {
                        if (nodeType === 'PERSON') {
                          // Navigate to that person's member page if they have one
                          router.push(`/persons/${nodeId}/genealogy`);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-lg border border-stone-200 p-6 md:p-12 text-center text-stone-600">
                    <p className="text-lg mb-2">{t('member_detail.no_genealogy_data')}</p>
                    <p className="text-sm">{t('member_detail.add_family_relationships')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Membership Fees */}
          <Card>
            <CardHeader>
              <CardTitle>{t('member_detail.membership_fees_history')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fees.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {t('member_detail.no_fees_recorded')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('member_detail.due_date')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('member_detail.amount')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('common.status')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('member_detail.paid_date')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('member_detail.payment_method')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {fees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatDate(fee.dueDate)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {formatCurrency(fee.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                fee.status === 'PAID'
                                  ? 'bg-green-100 text-green-800'
                                  : fee.status === 'OVERDUE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {fee.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {fee.paidDate ? formatDate(fee.paidDate) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {fee.paymentMethod || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Summary Cards */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('member_detail.fee_summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.total_paid')}
                  </label>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.total_pending')}
                  </label>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(totalPending)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('member_detail.total_fees')}
                  </label>
                  <p className="text-lg font-semibold text-gray-900">{fees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('member_detail.quick_actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => setShowFamilyModal(true)}
              >
                {t('member_detail.manage_family')}
              </Button>
              <Button className="w-full" variant="ghost">
                {t('member_detail.add_fee')}
              </Button>
              <Button className="w-full" variant="ghost">
                {t('member_detail.send_message')}
              </Button>
              <Button className="w-full" variant="ghost">
                {t('member_detail.view_activity')}
              </Button>
              <Button 
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200" 
                variant="danger"
                onClick={() => setShowDeceasedConfirmation(true)}
              >
                {t('member_detail.mark_as_deceased')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Family Management Modal */}
      {showFamilyModal && member && (
        <FamilyManagementModal
          member={member}
          onClose={() => setShowFamilyModal(false)}
          onUpdate={fetchMemberDetails}
        />
      )}

      {/* Confirmation Modal for Marking as Deceased */}
      {showDeceasedConfirmation && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-red-700 mb-2">{t('member_detail.mark_as_deceased')}</h3>
            <p className="text-gray-600 mb-4">{t('member_detail.confirm_mark_deceased')}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('member_detail.date_of_death')}
              </label>
              <input
                type="date"
                value={deceasedDate}
                onChange={(e) => setDeceasedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => setShowDeceasedConfirmation(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                variant="danger"
                onClick={handleMarkAsDeceased}
              >
                {t('member_detail.mark_as_deceased')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : toast.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'} text-white px-4 py-2 rounded-lg shadow-lg z-50`}>
          <div className="flex items-center">
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-4 text-white hover:text-gray-200 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
