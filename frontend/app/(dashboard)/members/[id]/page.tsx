'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import { memberApi, relationshipApi, personApi } from '@/lib/api';
import {
  exemptionApi,
  MemberContributionExemption,
  MemberContributionExemptionCreate,
  memberPaymentApi,
  MemberPayment,
  MemberPaymentCreate,
  contributionTypeApi,
  contributionObligationApi,
  ContributionType,
  ContributionObligation,
  createPeriodicPayments,
} from '@/lib/contributionApi';
import { currencyApi, MosqueCurrencyDTO } from '@/lib/currencyApi';
import ConfirmDialog from '@/components/ConfirmDialog';
import PaymentReceiptModal from '@/components/PaymentReceiptModal';
import { Member, RelationshipResponse } from '@/types';
import { formatDate, getStatusColor, getLocalizedStatus } from '@/lib/utils';
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
  const [memberExemptions, setMemberExemptions] = useState<MemberContributionExemption[]>([]);
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);

  // Contribution types & currencies for modals
  const [contributionTypes, setContributionTypes] = useState<ContributionType[]>([]);
  const [mosqueCurrencies, setMosqueCurrencies] = useState<MosqueCurrencyDTO[]>([]);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<MemberPayment | null>(null);
  const [paymentYearFilter, setPaymentYearFilter] = useState<string>('all');
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentPageSize, setPaymentPageSize] = useState(20);
  const [paymentTotalElements, setPaymentTotalElements] = useState(0);
  const [paymentTotalPages, setPaymentTotalPages] = useState(0);
  const [paymentYears, setPaymentYears] = useState<number[]>([]);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

  // Exemption modal state
  const [showExemptionModal, setShowExemptionModal] = useState(false);
  const [editingExemption, setEditingExemption] = useState<MemberContributionExemption | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'payment' | 'exemption'; id: number } | null>(null);

  // Receipt state
  const [receiptPayment, setReceiptPayment] = useState<MemberPayment | null>(null);

  // State for toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // Format a period range with month name prefix
  const formatPeriod = (periodFrom: string, periodTo: string): string => {
    if (!periodFrom || !periodTo) return '—';
    const [fy, fm, fd] = periodFrom.split('-').map(Number);
    const [ty, tm, td] = periodTo.split('-').map(Number);
    const fromDate = new Date(fy, fm - 1, fd);
    const toDate = new Date(ty, tm - 1, td);
    // Full calendar month
    const lastDayOfMonth = new Date(fy, fm, 0).getDate();
    if (fy === ty && fm === tm && fd === 1 && td === lastDayOfMonth) {
      return fromDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    // Full calendar year
    if (fy === ty && fm === 1 && fd === 1 && tm === 12 && td === 31) {
      return String(fy);
    }
    const fmtFrom = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fmtTo = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmtFrom} \u2014 ${fmtTo}`;
  };

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

  // ===== Contribution Types & Currencies loading =====
  useEffect(() => {
    const loadContributionData = async () => {
      try {
        const [typesData, currData] = await Promise.all([
          contributionTypeApi.getAll(),
          currencyApi.getActiveMosqueCurrencies(),
        ]);
        setContributionTypes(typesData);
        setMosqueCurrencies(currData);
      } catch (err) {
        console.log('Failed to load contribution types or currencies');
      }
    };
    loadContributionData();
  }, []);

  // Helper: get translated name for a contribution type
  const { language: locale } = useTranslation();
  const getTypeName = (type: ContributionType): string => {
    if (!type.translations || type.translations.length === 0) return type.code;
    const trans = type.translations.find(t => t.locale === locale)
      || type.translations.find(t => t.locale === 'en')
      || type.translations[0];
    return trans?.name || type.code;
  };

  const getTypeNameByCode = (code: string): string => {
    const ct = contributionTypes.find(t => t.code === code);
    return ct ? getTypeName(ct) : code;
  };

  // ===== Payment CRUD =====
  const loadMemberPayments = useCallback(async (personId: number) => {
    try {
      const params = {
        page: paymentPage,
        size: paymentPageSize,
        sort: ['periodFrom,asc', 'contributionType.code,asc'],
        year: paymentYearFilter !== 'all' ? Number(paymentYearFilter) : undefined,
      };
      const data = await memberPaymentApi.getByPersonPaginated(personId, params);
      setMemberPayments(data.content);
      setPaymentTotalElements(data.totalElements);
      setPaymentTotalPages(data.totalPages);
    } catch (err) {
      console.log('Failed to load member payments');
    }
  }, [paymentPage, paymentPageSize, paymentYearFilter]);

  // Load available years for the year filter (non-paginated, lightweight)
  useEffect(() => {
    if (!member?.personId) return;
    const loadYears = async () => {
      try {
        const all = await memberPaymentApi.getByPerson(member.personId!);
        const years = Array.from(
          new Set(
            all.flatMap((p) => {
              const yrs: number[] = [];
              if (p.periodFrom) yrs.push(new Date(p.periodFrom).getFullYear());
              if (p.paymentDate) yrs.push(new Date(p.paymentDate).getFullYear());
              return yrs;
            })
          )
        ).sort((a, b) => b - a);
        setPaymentYears(years);
      } catch (err) {
        console.log('Failed to load payment years');
      }
    };
    loadYears();
  }, [member?.personId, paymentsRefreshKey]);

  // Reload paginated payments when page/size/year/refreshKey changes
  useEffect(() => {
    if (member?.personId) {
      loadMemberPayments(member.personId);
    }
  }, [member?.personId, loadMemberPayments, paymentsRefreshKey]);

  // Reset page when year filter changes
  const handlePaymentYearChange = (value: string) => {
    setPaymentYearFilter(value);
    setPaymentPage(0);
  };

  const handleSavePayment = async (data: MemberPaymentCreate): Promise<string | null> => {
    try {
      if (editingPayment) {
        await memberPaymentApi.update(editingPayment.id, data);
      } else {
        // Determine frequency to split multi-period payments into individual records
        const selectedType = contributionTypes.find(ct => ct.id === data.contributionTypeId);
        const activeObligation = selectedType?.obligations?.find(o => o.amount > 0);
        const frequency = activeObligation?.frequency as 'MONTHLY' | 'YEARLY' | undefined;
        // Fetch full payment list for overlap detection (cannot rely on paginated subset)
        const allPayments = member?.personId ? await memberPaymentApi.getByPerson(member.personId) : [];
        const result = await createPeriodicPayments(data, frequency, undefined, allPayments);

        if (result.skippedCount > 0 && result.created.length > 0) {
          setToast({
            message: t('contributions.payments_created_with_skips', {
              created: result.created.length,
              skipped: result.skippedCount,
              periods: result.skippedPeriods.join(', ')
            }),
            type: 'warning'
          });
          setShowPaymentModal(false);
          setEditingPayment(null);
          setPaymentsRefreshKey(k => k + 1);
          return null;
        }
        if (result.skippedCount > 0 && result.created.length === 0) {
          setToast({
            message: t('contributions.all_periods_already_paid', {
              periods: result.skippedPeriods.join(', ')
            }),
            type: 'info'
          });
          setShowPaymentModal(false);
          setEditingPayment(null);
          return null;
        }
      }
      setShowPaymentModal(false);
      setEditingPayment(null);
      setPaymentsRefreshKey(k => k + 1);
      setToast({ message: t('member_detail.payment_saved'), type: 'success' });
      return null;
    } catch (err: any) {
      return err.message || 'Failed to save payment';
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'payment') return;
    try {
      await memberPaymentApi.delete(deleteConfirm.id);
      setPaymentsRefreshKey(k => k + 1);
      setToast({ message: t('member_detail.payment_deleted'), type: 'success' });
    } catch (err) {
      setToast({ message: t('member_detail.payment_delete_error'), type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ===== Exemption CRUD =====
  const loadMemberExemptions = async (personId: number) => {
    try {
      const allExemptions = await exemptionApi.getAll();
      const personExemptions = allExemptions.filter(
        (e: MemberContributionExemption) => e.personId === personId
      );
      setMemberExemptions(personExemptions);
    } catch (err) {
      console.log('Failed to load exemptions');
    }
  };

  const handleSaveExemption = async (data: MemberContributionExemptionCreate): Promise<string | null> => {
    try {
      if (editingExemption) {
        await exemptionApi.update(editingExemption.id, data);
      } else {
        await exemptionApi.create(data);
      }
      setShowExemptionModal(false);
      setEditingExemption(null);
      if (member?.personId) loadMemberExemptions(member.personId);
      setToast({ message: t('member_detail.exemption_saved'), type: 'success' });
      return null;
    } catch (err: any) {
      return err.message || 'Failed to save exemption';
    }
  };

  const handleDeleteExemption = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'exemption') return;
    try {
      await exemptionApi.delete(deleteConfirm.id);
      if (member?.personId) loadMemberExemptions(member.personId);
      setToast({ message: t('member_detail.exemption_deleted'), type: 'success' });
    } catch (err) {
      setToast({ message: t('member_detail.exemption_delete_error'), type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Format currency helper
  const formatCurrency = (amount: number, currencyCode?: string, currencySymbol?: string) => {
    if (currencyCode) {
      try {
        return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-US', {
          style: 'currency',
          currency: currencyCode,
        }).format(amount);
      } catch { /* fall through */ }
    }
    if (currencySymbol) return `${currencySymbol} ${amount.toFixed(2)}`;
    return amount.toFixed(2);
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
      

      
      // Fetch exemptions for this member (payments are loaded via useEffect on member.personId)
      if (memberData.personId) {
        loadMemberExemptions(memberData.personId);
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
                {member.roles && member.roles.length > 0 && member.roles.map((role) => (
                  <span key={role} className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
                    {role}
                  </span>
                ))}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="lg:col-span-3 space-y-6">
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

          {/* Member Payments */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle>{t('member_detail.member_payments')}</CardTitle>
                  <span className="text-sm text-gray-500">({paymentTotalElements})</span>
                </div>
                <div className="flex items-center gap-2">
                  {paymentYears.length > 0 && (
                    <select
                      value={paymentYearFilter}
                      onChange={(e) => handlePaymentYearChange(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="all">{t('contributions.all_years')}</option>
                      {paymentYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}
                  <Button size="sm" onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}>
                    + {t('member_detail.add_payment')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {memberPayments.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  {paymentYearFilter !== 'all' ? t('contributions.no_payments_year') : t('member_detail.no_payments')}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('member_detail.payment_type')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('member_detail.amount')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('member_detail.payment_date_col')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('member_detail.payment_period')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('member_detail.payment_reference')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {memberPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{getTypeNameByCode(payment.contributionTypeCode)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {formatCurrency(payment.amount, payment.currencyCode, payment.currencySymbol)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(payment.paymentDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {payment.periodFrom && payment.periodTo
                              ? formatPeriod(payment.periodFrom, payment.periodTo)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{payment.reference || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setReceiptPayment(payment)}
                              className="text-stone-500 hover:text-stone-700 text-sm mr-3"
                              title={t('receipt.view_receipt')}
                            >
                              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setEditingPayment(payment); setShowPaymentModal(true); }}
                              className="text-emerald-600 hover:text-emerald-800 text-sm mr-3"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'payment', id: payment.id })}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              {t('common.delete')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {memberPayments.map((payment) => (
                      <div key={payment.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{getTypeNameByCode(payment.contributionTypeCode)}</div>
                            <div className="text-xs text-gray-500">{formatDate(payment.paymentDate)}</div>
                          </div>
                          <div className="text-sm font-semibold text-emerald-700">
                            {formatCurrency(payment.amount, payment.currencyCode, payment.currencySymbol)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                          {payment.periodFrom && payment.periodTo && (
                            <span>{formatPeriod(payment.periodFrom, payment.periodTo)}</span>
                          )}
                          {payment.reference && <span>{payment.reference}</span>}
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-gray-100">
                          <button onClick={() => setReceiptPayment(payment)} className="text-stone-500 hover:text-stone-700 text-xs" title={t('receipt.view_receipt')}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button onClick={() => { setEditingPayment(payment); setShowPaymentModal(true); }} className="text-emerald-600 hover:text-emerald-800 text-xs">{t('common.edit')}</button>
                          <button onClick={() => setDeleteConfirm({ type: 'payment', id: payment.id })} className="text-red-600 hover:text-red-800 text-xs">{t('common.delete')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Total summary + pagination info */}
                  <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {t('contributions.showing_entries', {
                        from: paymentTotalElements === 0 ? 0 : paymentPage * paymentPageSize + 1,
                        to: Math.min((paymentPage + 1) * paymentPageSize, paymentTotalElements),
                        total: paymentTotalElements
                      })}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {t('contributions.total')}: {formatCurrency(
                        memberPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
                        memberPayments[0]?.currencyCode,
                        memberPayments[0]?.currencySymbol
                      )}
                    </span>
                  </div>
                  {/* Pagination controls */}
                  {paymentTotalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500">{t('contributions.rows_per_page')}</label>
                        <select
                          value={paymentPageSize}
                          onChange={(e) => { setPaymentPageSize(Number(e.target.value)); setPaymentPage(0); }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {[10, 20, 50, 100].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPaymentPage(p => Math.max(0, p - 1))}
                          disabled={paymentPage === 0}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ‹
                        </button>
                        <span className="text-sm text-gray-600">
                          {t('contributions.page_of', { page: paymentPage + 1, total: paymentTotalPages })}
                        </span>
                        <button
                          onClick={() => setPaymentPage(p => Math.min(paymentTotalPages - 1, p + 1))}
                          disabled={paymentPage >= paymentTotalPages - 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Contribution Exemptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('member_detail.contribution_exemptions')} ({memberExemptions.length})</CardTitle>
                <Button size="sm" onClick={() => { setEditingExemption(null); setShowExemptionModal(true); }}>
                  + {t('member_detail.add_exemption')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {memberExemptions.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  {t('member_detail.no_exemptions')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('member_detail.exemption_contribution_type')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('member_detail.exemption_type')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('member_detail.exemption_period')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('common.status')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {t('common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {memberExemptions.map((exemption) => (
                        <tr key={exemption.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {getTypeNameByCode(exemption.contributionTypeCode)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="inline-flex items-center">
                              {exemption.exemptionType === 'FULL' && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                                  {t('member_detail.exemption_full')}
                                </span>
                              )}
                              {exemption.exemptionType === 'FIXED_AMOUNT' && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {t('member_detail.exemption_fixed')}: {exemption.amount?.toFixed(2)}
                                </span>
                              )}
                              {exemption.exemptionType === 'DISCOUNT_AMOUNT' && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                  {t('member_detail.exemption_discount_amount')}: -{exemption.amount?.toFixed(2)}
                                </span>
                              )}
                              {exemption.exemptionType === 'DISCOUNT_PERCENTAGE' && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                  {t('member_detail.exemption_discount_pct')}: -{exemption.amount}%
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(exemption.startDate)}
                            {' — '}
                            {exemption.endDate ? formatDate(exemption.endDate) : t('member_detail.exemption_ongoing')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              exemption.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {exemption.isActive ? t('member_detail.exemption_active') : t('member_detail.exemption_inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => { setEditingExemption(exemption); setShowExemptionModal(true); }}
                              className="text-emerald-600 hover:text-emerald-800 text-sm mr-3"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'exemption', id: exemption.id })}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              {t('common.delete')}
                            </button>
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
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}
              >
                {t('member_detail.add_payment')}
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => { setEditingExemption(null); setShowExemptionModal(true); }}
              >
                {t('member_detail.add_exemption')}
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

      {/* Payment Modal */}
      {showPaymentModal && member && (
        <MemberPaymentModal
          payment={editingPayment}
          personId={member.personId!}
          personName={`${capitalizeName(member.firstName)} ${capitalizeName(member.lastName)}`}
          types={contributionTypes.filter(t => t.isActive)}
          mosqueCurrencies={mosqueCurrencies}
          onSave={handleSavePayment}
          onClose={() => { setShowPaymentModal(false); setEditingPayment(null); }}
          getTypeName={getTypeName}
          t={t}
        />
      )}

      {/* Exemption Modal */}
      {showExemptionModal && member && (
        <MemberExemptionModal
          exemption={editingExemption}
          personId={member.personId!}
          personName={`${capitalizeName(member.firstName)} ${capitalizeName(member.lastName)}`}
          types={contributionTypes.filter(t => t.isActive)}
          onSave={handleSaveExemption}
          onClose={() => { setShowExemptionModal(false); setEditingExemption(null); }}
          getTypeName={getTypeName}
          t={t}
        />
      )}

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        open={receiptPayment != null}
        payment={receiptPayment}
        onClose={() => setReceiptPayment(null)}
        contributionTypeName={receiptPayment ? getTypeNameByCode(receiptPayment.contributionTypeCode) : ''}
        formatDate={formatDate}
        formatPeriod={formatPeriod}
        t={t}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title={deleteConfirm?.type === 'payment' ? t('member_detail.delete_payment_title') : t('member_detail.delete_exemption_title')}
        message={deleteConfirm?.type === 'payment' ? t('member_detail.delete_payment_message') : t('member_detail.delete_exemption_message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={deleteConfirm?.type === 'payment' ? handleDeletePayment : handleDeleteExemption}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

// ===== Member Payment Modal (person is pre-selected) =====
function MemberPaymentModal({ payment, personId, personName, types, mosqueCurrencies, onSave, onClose, getTypeName, t }: {
  payment: MemberPayment | null;
  personId: number;
  personName: string;
  types: ContributionType[];
  mosqueCurrencies: MosqueCurrencyDTO[];
  onSave: (data: MemberPaymentCreate) => Promise<string | null>;
  onClose: () => void;
  getTypeName: (type: ContributionType) => string;
  t: (key: string) => string;
}) {
  const [typeId, setTypeId] = useState(payment?.contributionTypeId || 0);
  const [currencyId, setCurrencyId] = useState<number | undefined>(payment?.currencyId || undefined);
  const [amount, setAmount] = useState(payment?.amount?.toString() || '');
  const [amountManual, setAmountManual] = useState(!!payment);
  const [paymentDate, setPaymentDate] = useState(payment?.paymentDate || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })());
  const [periodFrom, setPeriodFrom] = useState(payment?.periodFrom || '');
  const [periodTo, setPeriodTo] = useState(payment?.periodTo || '');
  const [reference, setReference] = useState(payment?.reference || '');
  const [notes, setNotes] = useState(payment?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedType = types.find(t => t.id === typeId);
  const activeObligation = selectedType?.obligations?.find(o => o.amount > 0);
  const frequency = activeObligation?.frequency;

  // Fetch active exemptions for this person + type
  const [activeExemption, setActiveExemption] = useState<MemberContributionExemption | null>(null);

  useEffect(() => {
    if (personId && typeId) {
      exemptionApi.getActive(personId, typeId)
        .then(list => setActiveExemption(list.length > 0 ? list[0] : null))
        .catch(() => setActiveExemption(null));
    } else {
      setActiveExemption(null);
    }
  }, [personId, typeId]);

  const computePeriodCount = (): number => {
    if (!periodFrom || !periodTo || !frequency) return 1;
    if (frequency === 'MONTHLY') {
      const [fy, fm] = periodFrom.substring(0, 7).split('-').map(Number);
      const [ty, tm] = periodTo.substring(0, 7).split('-').map(Number);
      return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
    } else {
      const fy = new Date(periodFrom).getFullYear();
      const ty = new Date(periodTo).getFullYear();
      return Math.max(1, ty - fy + 1);
    }
  };
  const periodCount = computePeriodCount();
  const obligationUnitAmount = activeObligation?.amount;

  const applyExemptionPerUnit = (unitAmount: number): number => {
    if (!activeExemption) return unitAmount;
    switch (activeExemption.exemptionType) {
      case 'FULL': return 0;
      case 'FIXED_AMOUNT': return activeExemption.amount ?? unitAmount;
      case 'DISCOUNT_AMOUNT': return Math.max(0, unitAmount - (activeExemption.amount ?? 0));
      case 'DISCOUNT_PERCENTAGE': return Math.max(0, unitAmount * (1 - (activeExemption.amount ?? 0) / 100));
      default: return unitAmount;
    }
  };

  const exemptedUnitAmount = obligationUnitAmount ? applyExemptionPerUnit(obligationUnitAmount) : undefined;
  // For multi-period: amount field = per-unit amount (each record), not the total
  const calculatedAmount = exemptedUnitAmount !== undefined ? exemptedUnitAmount : undefined;

  useEffect(() => {
    if (amountManual) return;
    if (calculatedAmount !== undefined) {
      setAmount(calculatedAmount.toFixed(2));
    }
  }, [typeId, periodFrom, periodTo, calculatedAmount, amountManual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSave({
      personId,
      contributionTypeId: typeId,
      amount: parseFloat(amount),
      paymentDate,
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
      reference: reference || undefined,
      notes: notes || undefined,
      currencyId: currencyId || undefined,
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            {payment ? t('member_detail.edit_payment') : t('member_detail.add_payment')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Person (read-only) */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.person')}</label>
              <div className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50">
                {personName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.type')}</label>
              <select
                value={typeId}
                onChange={(e) => {
                  const newTypeId = Number(e.target.value);
                  setTypeId(newTypeId);
                  setAmountManual(false);
                  const newType = types.find(ct => ct.id === newTypeId);
                  const newObligation = newType?.obligations?.find(o => o.amount > 0);
                  const freq = newObligation?.frequency;
                  const now = new Date();
                  if (freq === 'MONTHLY') {
                    const y = now.getFullYear();
                    const m = now.getMonth() + 1;
                    const lastDay = new Date(y, m, 0).getDate();
                    setPeriodFrom(`${y}-${String(m).padStart(2, '0')}-01`);
                    setPeriodTo(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                  } else if (freq === 'YEARLY') {
                    const y = now.getFullYear();
                    setPeriodFrom(`${y}-01-01`);
                    setPeriodTo(`${y}-12-31`);
                  } else {
                    setPeriodFrom('');
                    setPeriodTo('');
                  }
                  if (!payment) {
                    if (newObligation?.currencyId) {
                      setCurrencyId(newObligation.currencyId);
                    } else if (mosqueCurrencies.length === 1) {
                      setCurrencyId(mosqueCurrencies[0].currencyId);
                    }
                  }
                }}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value={0} disabled>{t('contributions.select_type')}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{getTypeName(type)}</option>
                ))}
              </select>
            </div>

            {/* Period selection */}
            {frequency && (
              <div className="bg-stone-50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-stone-700">
                    {t('contributions.period')}
                    <span className="ml-1 text-xs text-stone-400 font-normal">
                      ({frequency === 'MONTHLY' ? t('contributions.freq_monthly') : t('contributions.freq_yearly')})
                    </span>
                  </label>
                  {periodCount >= 1 && (
                    <span className="text-xs text-emerald-600 font-medium">
                      {periodCount} {frequency === 'MONTHLY' ? (periodCount === 1 ? t('contributions.month') : t('contributions.months')) : (periodCount === 1 ? t('contributions.year') : t('contributions.years'))}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t('contributions.period_from')}</label>
                    {frequency === 'MONTHLY' ? (
                      <div className="flex gap-1">
                        <select
                          value={periodFrom ? parseInt(periodFrom.substring(5, 7)) : ''}
                          onChange={(e) => {
                            const month = Number(e.target.value);
                            const year = periodFrom ? parseInt(periodFrom.substring(0, 4)) : new Date().getFullYear();
                            setPeriodFrom(`${year}-${String(month).padStart(2, '0')}-01`);
                          }}
                          className="flex-1 border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString(undefined, { month: 'short' })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={periodFrom ? parseInt(periodFrom.substring(0, 4)) : new Date().getFullYear()}
                          onChange={(e) => {
                            const year = Number(e.target.value);
                            const month = periodFrom ? parseInt(periodFrom.substring(5, 7)) : (new Date().getMonth() + 1);
                            setPeriodFrom(`${year}-${String(month).padStart(2, '0')}-01`);
                          }}
                          className="w-[5.5rem] border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        value={periodFrom ? parseInt(periodFrom.substring(0, 4)) : new Date().getFullYear()}
                        onChange={(e) => setPeriodFrom(`${e.target.value}-01-01`)}
                        className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t('contributions.period_to')}</label>
                    {frequency === 'MONTHLY' ? (
                      <div className="flex gap-1">
                        <select
                          value={periodTo ? parseInt(periodTo.substring(5, 7)) : ''}
                          onChange={(e) => {
                            const month = Number(e.target.value);
                            const year = periodTo ? parseInt(periodTo.substring(0, 4)) : new Date().getFullYear();
                            const lastDay = new Date(year, month, 0).getDate();
                            setPeriodTo(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                          }}
                          className="flex-1 border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString(undefined, { month: 'short' })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={periodTo ? parseInt(periodTo.substring(0, 4)) : new Date().getFullYear()}
                          onChange={(e) => {
                            const year = Number(e.target.value);
                            const month = periodTo ? parseInt(periodTo.substring(5, 7)) : (new Date().getMonth() + 1);
                            const lastDay = new Date(year, month, 0).getDate();
                            setPeriodTo(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                          }}
                          className="w-[5.5rem] border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        value={periodTo ? parseInt(periodTo.substring(0, 4)) : new Date().getFullYear()}
                        onChange={(e) => setPeriodTo(`${e.target.value}-12-31`)}
                        className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.amount')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setAmountManual(true); }}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
              {obligationUnitAmount && !amountManual && frequency && periodCount > 1 && !payment && (
                <p className="mt-1 text-xs text-emerald-600">
                  {t('contributions.will_create_records', { count: periodCount })}: {periodCount} × {exemptedUnitAmount?.toFixed(2)}
                  {activeExemption && exemptedUnitAmount !== undefined && exemptedUnitAmount !== obligationUnitAmount
                    ? ` (${obligationUnitAmount.toFixed(2)} → ${exemptedUnitAmount.toFixed(2)})`
                    : ''}
                </p>
              )}
              {obligationUnitAmount && !amountManual && !(frequency && periodCount > 1) && (
                <p className="mt-1 text-xs text-emerald-600">
                  {t('contributions.amount_from_obligation')}: {obligationUnitAmount.toFixed(2)}
                  {activeExemption && exemptedUnitAmount !== undefined && exemptedUnitAmount !== obligationUnitAmount
                    ? ` → ${exemptedUnitAmount.toFixed(2)}`
                    : ''}
                </p>
              )}
              {activeExemption && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚡ {t('contributions.exemption_applied')}: {
                    activeExemption.exemptionType === 'FULL' ? t('contributions.exemption_full') :
                    activeExemption.exemptionType === 'FIXED_AMOUNT' ? `${t('contributions.exemption_fixed')}: ${activeExemption.amount?.toFixed(2)}` :
                    activeExemption.exemptionType === 'DISCOUNT_AMOUNT' ? `${t('contributions.exemption_discount_amount')}: -${activeExemption.amount?.toFixed(2)}` :
                    `${t('contributions.exemption_discount_pct')}: -${activeExemption.amount}%`
                  }
                </p>
              )}
              {amountManual && calculatedAmount !== undefined && parseFloat(amount) !== calculatedAmount && (
                <button
                  type="button"
                  onClick={() => { setAmount(calculatedAmount.toFixed(2)); setAmountManual(false); }}
                  className="mt-1 text-xs text-emerald-600 hover:text-emerald-800 underline"
                >
                  {t('contributions.reset_to_calculated')}: {calculatedAmount.toFixed(2)}
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.currency')}</label>
              {mosqueCurrencies.length === 0 ? (
                <p className="text-xs text-amber-600">{t('contributions.no_currencies')}</p>
              ) : (
                <select
                  value={currencyId || ''}
                  onChange={(e) => setCurrencyId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">{t('contributions.select_currency')}</option>
                  {mosqueCurrencies.map((mc) => (
                    <option key={mc.currencyId} value={mc.currencyId}>
                      {mc.currencyCode} — {mc.currencyName} ({mc.currencySymbol})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.payment_date')}</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.reference')}</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                placeholder={t('contributions.reference_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm disabled:opacity-50">
                {saving ? '...' : t('common.save')}
              </button>
            </div>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ===== Member Exemption Modal (person is pre-selected) =====
function MemberExemptionModal({ exemption, personId, personName, types, onSave, onClose, getTypeName, t }: {
  exemption: MemberContributionExemption | null;
  personId: number;
  personName: string;
  types: ContributionType[];
  onSave: (data: MemberContributionExemptionCreate) => Promise<string | null>;
  onClose: () => void;
  getTypeName: (type: ContributionType) => string;
  t: (key: string) => string;
}) {
  const [typeId, setTypeId] = useState(exemption?.contributionTypeId || 0);
  const [exemptionType, setExemptionType] = useState(exemption?.exemptionType || 'FULL');
  const [amount, setAmount] = useState(exemption?.amount?.toString() || '');
  const [reason, setReason] = useState(exemption?.reason || '');
  const [startDate, setStartDate] = useState(exemption?.startDate || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })());
  const [endDate, setEndDate] = useState(exemption?.endDate || '');
  const [isActive, setIsActive] = useState(exemption?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsAmount = exemptionType !== 'FULL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSave({
      personId,
      contributionTypeId: typeId,
      exemptionType,
      amount: needsAmount && amount ? parseFloat(amount) : undefined,
      reason: reason || undefined,
      startDate,
      endDate: endDate || undefined,
      isActive,
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            {exemption ? t('member_detail.edit_exemption') : t('member_detail.add_exemption')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Person (read-only) */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.person')}</label>
              <div className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50">
                {personName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.type')}</label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value={0} disabled>{t('contributions.select_type')}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{getTypeName(type)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.exemption_type')}</label>
              <select
                value={exemptionType}
                onChange={(e) => setExemptionType(e.target.value as 'FULL' | 'FIXED_AMOUNT' | 'DISCOUNT_AMOUNT' | 'DISCOUNT_PERCENTAGE')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="FULL">{t('contributions.exemption_full')}</option>
                <option value="FIXED_AMOUNT">{t('contributions.exemption_fixed')}</option>
                <option value="DISCOUNT_AMOUNT">{t('contributions.exemption_discount_amount')}</option>
                <option value="DISCOUNT_PERCENTAGE">{t('contributions.exemption_discount_pct')}</option>
              </select>
            </div>

            {needsAmount && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {exemptionType === 'DISCOUNT_PERCENTAGE' ? t('contributions.percentage') : t('contributions.amount')}
                </label>
                <input
                  type="number"
                  step={exemptionType === 'DISCOUNT_PERCENTAGE' ? '1' : '0.01'}
                  min={exemptionType === 'DISCOUNT_PERCENTAGE' ? '1' : '0.01'}
                  max={exemptionType === 'DISCOUNT_PERCENTAGE' ? '100' : undefined}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  placeholder={exemptionType === 'DISCOUNT_PERCENTAGE' ? '0-100' : undefined}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.reason')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                rows={2}
                placeholder={t('contributions.reason_placeholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.start_date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('contributions.end_date')} <span className="text-xs text-stone-400">({t('contributions.optional')})</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="member-exemption-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="member-exemption-active" className="text-sm text-stone-700">{t('contributions.active')}</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm disabled:opacity-50">
                {saving ? '...' : t('common.save')}
              </button>
            </div>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}