'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/Card';

// Helper function to capitalize names properly
const capitalizeName = (name: string | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

import type { Member } from '@/types';

interface FamilyTreeProps {
  member: Member;
  partner?: Member;
  father?: Member;
  mother?: Member;
  siblings?: Member[];
  children?: Member[];
}

export default function FamilyTree({
  member,
  partner,
  father,
  mother,
  siblings = [],
  children = []
}: FamilyTreeProps) {
  const router = useRouter();

  const formatAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return '';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const MemberCard = ({ 
    person, 
    role, 
    isCurrentMember = false 
  }: { 
    person: Member; 
    role: string; 
    isCurrentMember?: boolean;
  }) => (
    <div
      className={`
        relative flex flex-col items-center p-4 rounded-lg border-2 transition-all cursor-pointer
        ${isCurrentMember 
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-500 shadow-lg scale-105' 
          : 'bg-white border-gray-300 hover:border-emerald-400 hover:shadow-md'
        }
      `}
      onClick={() => !isCurrentMember && router.push(`/members/${person.personId}`)}
    >
      {isCurrentMember && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow">
          Current
        </div>
      )}
      <div className={`
        w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-md mb-2
        ${person.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'}
      `}>
        {(person.firstName?.[0] || '?')}{(person.lastName?.[0] || '')}
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900">{capitalizeName(person.firstName)} {capitalizeName(person.lastName)}</p>
        <p className="text-xs text-gray-500 mb-1">{role}</p>
        <p className="text-xs text-gray-400">{formatAge(person.dateOfBirth)} years</p>
      </div>
    </div>
  );

  const renderLine = (orientation: 'horizontal' | 'vertical', length: string) => (
    <div 
      className={`
        bg-gray-300
        ${orientation === 'horizontal' ? `h-0.5 ${length}` : `w-0.5 ${length}`}
      `}
    />
  );

  // If member is a child, show parent-centric view
  if (father || mother) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {/* Parents Level */}
            <div className="flex items-center justify-center gap-8">
              {father && <MemberCard person={father} role="Father" />}
              {father && mother && (
                <>
                  <div className="flex items-center">
                    <div className="h-0.5 w-8 bg-gray-300" />
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <div className="h-0.5 w-8 bg-gray-300" />
                  </div>
                </>
              )}
              {mother && <MemberCard person={mother} role="Mother" />}
            </div>

            {/* Vertical line to children */}
            <div className="w-0.5 h-8 bg-gray-300" />

            {/* Horizontal line connecting siblings + member + partner */}
            <div className="w-full flex justify-center">
              <div className="h-0.5 bg-gray-300" style={{ width: `${(siblings.length + (partner ? 2 : 1)) * 180}px` }} />
            </div>

            {/* Children Level (including current member and partner) */}
            <div className="flex items-start justify-center gap-4 relative">
              {siblings.filter(s => {
                const siblingAge = formatAge(s.dateOfBirth);
                const memberAge = formatAge(member.dateOfBirth);
                return siblingAge > memberAge;
              }).map((sibling) => (
                <div key={sibling.personId} className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300" />
                  <MemberCard person={sibling} role="Sibling" />
                </div>
              ))}

              <div className="flex flex-col items-center">
                <div className="w-0.5 h-8 bg-gray-300" />
                <MemberCard person={member} role="You" isCurrentMember />
              </div>

              {partner && (
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300" />
                  <MemberCard person={partner} role="Spouse" />
                </div>
              )}

              {siblings.filter(s => {
                const siblingAge = formatAge(s.dateOfBirth);
                const memberAge = formatAge(member.dateOfBirth);
                return siblingAge <= memberAge;
              }).map((sibling) => (
                <div key={sibling.personId} className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300" />
                  <MemberCard person={sibling} role="Sibling" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If member is head of household, show family-centric view
  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Parents Level (Head + Partner) */}
          <div className="flex items-center justify-center gap-8">
            <MemberCard person={member} role="Head of Family" isCurrentMember />
            {partner && (
              <>
                <div className="flex items-center">
                  <div className="h-0.5 w-8 bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="h-0.5 w-8 bg-gray-300" />
                </div>
                <MemberCard person={partner} role="Partner" />
              </>
            )}
          </div>

          {/* Show children if any */}
          {children && children.length > 0 && (
            <>
              {/* Vertical line to children */}
              <div className="w-0.5 h-8 bg-gray-300" />

              {/* Horizontal line connecting children */}
              <div className="w-full flex justify-center">
                <div className="h-0.5 bg-gray-300" style={{ width: `${children.length * 180}px` }} />
              </div>

              {/* Children Level */}
              <div className="flex items-start justify-center gap-4 flex-wrap max-w-4xl">
                {children.map((child) => (
                  <div key={child.personId} className="flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-gray-300" />
                    <MemberCard person={child} role="Child" />
                  </div>
                ))}
              </div>
            </>
          )}

          {!partner && (!children || children.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No family members added yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
