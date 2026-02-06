'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/Card';
import { memberApi } from '@/lib/api';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  email?: string;
  phoneNumber?: string;
  parentId?: string;
  partnerId?: string;
  children?: Member[];
}

interface FamilyUnit {
  head: Member;
  partner?: Member;
  children: Member[];
}

interface ComprehensiveFamilyTreeProps {
  currentMemberId: string;
}

export default function ComprehensiveFamilyTree({ currentMemberId }: ComprehensiveFamilyTreeProps) {
  const router = useRouter();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [familyUnits, setFamilyUnits] = useState<FamilyUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllMembers();
  }, []);

  const fetchAllMembers = async () => {
    try {
      const members: any = await memberApi.getAll();
      setAllMembers(members);
      organizeFamilies(members);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  const organizeFamilies = (members: Member[]) => {
    // Group members into family units (heads of household with their partners and children)
    const familyHeads = members.filter(m => !m.parentId);
    
    const units: FamilyUnit[] = familyHeads.map(head => {
      const partner = head.partnerId ? members.find(m => m.id === head.partnerId) : undefined;
      const children = members.filter(m => m.parentId === head.id);
      
      return {
        head,
        partner,
        children
      };
    });

    setFamilyUnits(units);
  };

  const formatAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const findRelationship = (member: Member, targetId: string): string => {
    if (member.id === targetId) return 'You';
    
    const target = allMembers.find(m => m.id === targetId);
    if (!target) return '';

    // Same family unit
    if (member.parentId === target.parentId && member.parentId) return 'Sibling';
    if (member.partnerId === target.id) return 'Spouse';
    if (member.parentId === target.id) return 'Child';
    if (target.parentId === member.id) return 'Parent';
    
    // In-laws and extended
    if (member.partnerId && target.parentId === member.partnerId) return "Spouse's Parent";
    if (target.partnerId && member.id === target.partnerId) return 'Partner';
    
    return '';
  };

  const MemberCard = ({ 
    person, 
    isCurrentMember = false,
    relationship = ''
  }: { 
    person: Member; 
    isCurrentMember?: boolean;
    relationship?: string;
  }) => (
    <div
      className={`
        relative flex flex-col items-center p-3 rounded-lg border-2 transition-all cursor-pointer min-w-[140px]
        ${isCurrentMember 
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-500 shadow-lg' 
          : 'bg-white border-gray-300 hover:border-emerald-400 hover:shadow-md'
        }
      `}
      onClick={() => router.push(`/members/${person.id}`)}
    >
      {isCurrentMember && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow z-10">
          You
        </div>
      )}
      <div className={`
        w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md mb-2
        ${person.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'}
      `}>
        {person.firstName[0]}{person.lastName[0]}
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900 text-sm">{person.firstName}</p>
        <p className="font-medium text-gray-700 text-xs">{person.lastName}</p>
        {relationship && (
          <p className="text-xs text-emerald-600 font-medium mt-1">{relationship}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{formatAge(person.dateOfBirth)} yrs</p>
      </div>
    </div>
  );

  const FamilyUnitCard = ({ unit, currentId }: { unit: FamilyUnit; currentId: string }) => {
    const isCurrentInThisFamily = 
      unit.head.id === currentId ||
      unit.partner?.id === currentId ||
      unit.children.some(c => c.id === currentId);

    return (
      <Card className={`${isCurrentInThisFamily ? 'ring-2 ring-emerald-500' : ''}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Parents Row */}
            <div className="flex items-center justify-center gap-6">
              <MemberCard 
                person={unit.head} 
                isCurrentMember={unit.head.id === currentId.toString()}
                relationship={findRelationship(unit.head, currentId) || 'Family Head'}
              />
              
              {unit.partner && (
                <>
                  <div className="flex items-center">
                    <div className="h-0.5 w-6 bg-gray-300" />
                    <div className="w-3 h-3 rounded-full bg-gray-300 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div className="h-0.5 w-6 bg-gray-300" />
                  </div>
                  <MemberCard 
                    person={unit.partner} 
                    isCurrentMember={unit.partner.id === currentId.toString()}
                    relationship={findRelationship(unit.partner, currentId) || 'Partner'}
                  />
                </>
              )}
            </div>

            {/* Children Section */}
            {unit.children.length > 0 && (
              <>
                {/* Vertical line */}
                <div className="w-0.5 h-6 bg-gray-300" />
                
                {/* Horizontal connector */}
                <div className="w-full flex justify-center">
                  <div className="h-0.5 bg-gray-300" style={{ width: `${Math.min(unit.children.length * 160, 600)}px` }} />
                </div>

                {/* Children Row */}
                <div className="flex items-start justify-center gap-3 flex-wrap max-w-4xl">
                  {unit.children.map((child) => (
                    <div key={child.id} className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-gray-300" />
                      <MemberCard 
                        person={child} 
                        isCurrentMember={child.id === currentId.toString()}
                        relationship={findRelationship(child, currentId) || 'Child'}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Family Label */}
            <div className="pt-2 border-t border-gray-200 w-full text-center">
              <p className="text-xs text-gray-500 font-medium">
                {unit.head.lastName} Family ({1 + (unit.partner ? 1 : 0) + unit.children.length} members)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Family Network</h3>
        <p className="text-sm text-gray-600">
          Showing all {familyUnits.length} families • {allMembers.length} total members
        </p>
      </div>

      {/* If there are family units, show them. If not, but the current member exists, show a single-person family. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {familyUnits.length > 0 ? (
          familyUnits.map((unit) => (
            <FamilyUnitCard key={unit.head.id} unit={unit} currentId={currentMemberId} />
          ))
        ) : (
          (() => {
            const currentMember = allMembers.find(m => m.id === currentMemberId);
            if (currentMember) {
              const singleUnit: FamilyUnit = { head: currentMember, children: [] };
              return <FamilyUnitCard unit={singleUnit} currentId={currentMemberId} />;
            }
            return null;
          })()
        )}
      </div>
    </div>
  );
}
