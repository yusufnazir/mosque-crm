'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
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

interface GenealogyGraph {
  nodes: GenealogyNode[];
  edges: GenealogyEdge[];
}

export default function FamilyTreePage() {
  const [graphData, setGraphData] = useState<GenealogyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompleteGenealogyGraph();
  }, []);

  const fetchCompleteGenealogyGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:8080/api/genealogy/graph/complete', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch genealogy graph: ${response.statusText}`);
      }

      const data = await response.json();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to fetch genealogy graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to load family tree');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading complete family tree...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Family Tree</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchCompleteGenealogyGraph}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>🌳 Complete Family Tree</CardTitle>
          </CardHeader>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Family Data Available</h3>
            <p className="text-gray-600">Start by adding family relationships between members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🌳 Complete Family Tree - All Members</CardTitle>
            <button
              onClick={fetchCompleteGenealogyGraph}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Visualizing {graphData.nodes.filter(n => n.type === 'PERSON').length} members across {graphData.nodes.filter(n => n.type === 'FAMILY').length} families
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Legend */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Legend:</h4>
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Male Person</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-pink-500 rounded"></div>
                <span>Female Person</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Family Unit</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Parent → Child</span>
              </div>
            </div>
          </div>

          {/* Genealogy Tree Visualization */}
          <GenealogyTree data={graphData} />
        </CardContent>
      </Card>
    </div>
  );
}
