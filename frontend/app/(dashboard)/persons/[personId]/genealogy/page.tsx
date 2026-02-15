'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/Button';
import GenealogyTree from '@/components/GenealogyTree';

interface GenealogyNode {
  id: string;
  type: 'PERSON' | 'FAMILY';
  label?: string;
  gender?: string;
  birthDate?: string;
}

interface GenealogyEdge {
  from: string;
  to: string;
}

interface GenealogyData {
  nodes: GenealogyNode[];
  edges: GenealogyEdge[];
}

export default function GenealogyPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.personId as string;

  const [data, setData] = useState<GenealogyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGenealogyGraph();
  }, [personId]);

  const fetchGenealogyGraph = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/genealogy/persons/${personId}/graph`);

      if (!response.ok) {
        throw new Error('Failed to load genealogy graph');
      }

      const graphData = await response.json();
      setData(graphData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load genealogy graph';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (nodeId: string, nodeType: string) => {
    if (nodeType === 'PERSON') {
      // Navigate to that person's genealogy view
      router.push(`/persons/${nodeId}/genealogy`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-[800px] bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream p-8">
        <div className="max-w-7xl mx-auto">
          <Button variant="secondary" onClick={() => router.back()} className="mb-6">
            ← Back
          </Button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="min-h-screen bg-cream p-8">
        <div className="max-w-7xl mx-auto">
          <Button variant="secondary" onClick={() => router.back()} className="mb-6">
            ← Back
          </Button>
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-12 text-center text-stone-600">
            <p className="text-lg mb-2">No genealogy data available</p>
            <p className="text-sm">Add family relationships to see the family tree</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="secondary" onClick={() => router.back()} className="mb-4">
            ← Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2">
                Genealogy Family Tree
              </h1>
              <p className="text-stone-600">
                Interactive family tree visualization • Zoom and pan to explore • Click persons to navigate
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 flex items-center gap-6 bg-white p-4 rounded-lg border border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-500"></div>
            <span className="text-sm text-stone-700">Male</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-pink-500"></div>
            <span className="text-sm text-stone-700">Female</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-700"></div>
            <span className="text-sm text-stone-700">Family Unit</span>
          </div>
          <div className="ml-auto text-sm text-stone-500">
            {data.nodes.filter(n => n.type === 'PERSON').length} persons • {data.nodes.filter(n => n.type === 'FAMILY').length} families
          </div>
        </div>

        {/* Tree Visualization */}
        <div className="h-[800px]">
          <GenealogyTree data={data} onNodeClick={handleNodeClick} />
        </div>
      </div>
    </div>
  );
}
