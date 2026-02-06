'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { relationshipApi } from '@/lib/api';
import { PersonSearchResult, RelationshipResponse } from '@/types';
import Button from '@/components/Button';
import { Card } from '@/components/Card';

type RelationshipType = 'FATHER' | 'MOTHER' | 'SPOUSE' | 'CHILD';

export default function ManageFamilyRelationshipsPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.personId as string;

  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState<RelationshipResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PersonSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('FATHER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRelationships = useCallback(async () => {
    try {
      setLoading(true);
      const data = await relationshipApi.getRelationships(Number(personId)) as RelationshipResponse[];
      setRelationships(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load relationships';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  const searchPersons = useCallback(async () => {
    try {
      setSearchLoading(true);
      const results = await relationshipApi.searchPersons(searchQuery) as PersonSearchResult[];
      // Filter out the current person from results
      setSearchResults(results.filter((p: PersonSearchResult) => p.id !== personId));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, personId]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchPersons();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchPersons]);

  const handleSelectPerson = (person: PersonSearchResult) => {
    setSelectedPerson(person);
    const fullName = person.lastName ? `${person.firstName} ${person.lastName}` : person.firstName;
    setSearchQuery(fullName);
    setSearchResults([]);
  };

  const handleAddRelationship = async () => {
    if (!selectedPerson) {
      setError('Please select a person');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await relationshipApi.addRelationship(personId, {
        relatedPersonId: selectedPerson.id,
        relationshipType,
      });
      setSuccess(`Successfully added ${relationshipType.toLowerCase()} relationship`);
      setSelectedPerson(null);
      setSearchQuery('');
      loadRelationships();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add relationship';
      setError(errorMessage);
    }
  };

  const handleRemoveRelationship = async (relationshipId: string, relatedPersonName: string) => {
    if (!confirm(`Are you sure you want to remove the relationship with ${relatedPersonName}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await relationshipApi.removeRelationship(personId, relationshipId);
      setSuccess('Successfully removed relationship');
      loadRelationships();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove relationship';
      setError(errorMessage);
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'FATHER':
        return '👨';
      case 'MOTHER':
        return '👩';
      case 'SPOUSE':
        return '💑';
      case 'CHILD':
        return '👶';
      default:
        return '👤';
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'FATHER':
      case 'MOTHER':
        return 'bg-blue-100 text-blue-800';
      case 'SPOUSE':
        return 'bg-pink-100 text-pink-800';
      case 'CHILD':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="mb-6"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Manage Family Relationships
          </h1>
          <p className="text-stone-600">
            Link family members for genealogy purposes
          </p>
        </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      {/* Add Relationship Form */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-6">
          Add New Relationship
        </h2>

        {/* Person Search */}
        <div className="mb-6 relative">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Search Person
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedPerson(null);
            }}
            placeholder="Search by name or ID..."
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-stone-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleSelectPerson(person)}
                  className="w-full px-4 py-2 text-left hover:bg-emerald-50 border-b border-stone-100 last:border-b-0"
                >
                  <div className="font-medium text-stone-900">
                    {person.lastName ? `${person.firstName} ${person.lastName}` : person.firstName}
                  </div>
                  <div className="text-sm text-stone-500">ID: {person.id}</div>
                </button>
              ))}
            </div>
          )}

          {searchLoading && (
            <div className="absolute right-3 top-11 text-stone-400">
              Searching...
            </div>
          )}
        </div>

        {/* Relationship Type Dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Relationship Type <span className="text-red-500">*</span>
          </label>
          <select
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="FATHER">Father</option>
            <option value="MOTHER">Mother</option>
            <option value="SPOUSE">Spouse</option>
            <option value="CHILD">Child</option>
          </select>
        </div>

        {/* Add Button */}
        <Button
          onClick={handleAddRelationship}
          disabled={!selectedPerson}
          className="w-full"
        >
          Add Relationship
        </Button>
      </Card>

      {/* Existing Relationships List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-6">
          Existing Relationships
        </h2>

        {loading ? (
          <div className="text-center py-12 text-stone-500">
            Loading relationships...
          </div>
        ) : relationships.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            No family relationships found. Add one above to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {relationships.map((rel) => (
              <div
                key={rel.relationshipId}
                className="flex items-center justify-between p-5 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors border border-stone-200"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{getRelationshipIcon(rel.relationshipType)}</span>
                  <div>
                    <div className="font-medium text-stone-900 text-lg">
                      {rel.relatedPersonName}
                    </div>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mt-1 ${getRelationshipColor(rel.relationshipType)}`}
                    >
                      {rel.relationshipType}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleRemoveRelationship(rel.relationshipId, rel.relatedPersonName)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
