'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { graphStratify, sugiyama, layeringLongestPath, decrossOpt, coordCenter } from 'd3-dag';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { linkVertical } from 'd3-shape';

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

interface GenealogyTreeProps {
  data: GenealogyData;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
}

export default function GenealogyTree({ data, onNodeClick }: GenealogyTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Stable sorting of nodes to ensure consistent layout across renders
  const sortedData = useMemo(() => {
    if (!data) return null;

    // Sort nodes by ID for stable ordering
    const sortedNodes = [...data.nodes].sort((a, b) => {
      // Family nodes first, then persons
      if (a.type !== b.type) {
        return a.type === 'FAMILY' ? -1 : 1;
      }
      // Within same type, sort by ID alphabetically
      return a.id.localeCompare(b.id);
    });

    // Sort edges by from then to
    const sortedEdges = [...data.edges].sort((a, b) => {
      const srcCmp = a.from.localeCompare(b.from);
      return srcCmp !== 0 ? srcCmp : a.to.localeCompare(b.to);
    });

    return {
      nodes: sortedNodes,
      edges: sortedEdges
    };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !sortedData || sortedData.nodes.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const height = dimensions.height;
    
    // Layout configuration
    const nodeWidth = 140;
    const nodeHeight = 70;
    const familyNodeSize = 16;
    const horizontalSpacing = 60;
    const verticalSpacing = 100;

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Add zoom behavior (no drag-rearranging)
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    try {
      // Build DAG structure for d3-dag
      const nodeMap = new Map(sortedData.nodes.map(n => [n.id, n]));
      
      // Create stratify data structure
      const stratifyData = sortedData.nodes.map(node => ({
        id: node.id,
        parentIds: sortedData.edges
          .filter(e => e.to === node.id)
          .map(e => e.from)
      }));

      // Build DAG using graphStratify
      const stratify = graphStratify();
      const dag = stratify(stratifyData);

      // Configure Sugiyama layout for stable, optimal rendering
      const layout = sugiyama()
        .nodeSize((node: any) => {
          const nodeData = nodeMap.get(node.data.id);
          if (nodeData?.type === 'FAMILY') {
            return [familyNodeSize + horizontalSpacing, familyNodeSize + verticalSpacing] as [number, number];
          }
          return [nodeWidth + horizontalSpacing, nodeHeight + verticalSpacing] as [number, number];
        })
        .layering(layeringLongestPath()) // Optimal vertical layering
        .decross(decrossOpt())            // Reduces line crossings
        .coord(coordCenter());            // Centers nodes horizontally per layer

      // Apply layout
      const { width: dagWidth, height: dagHeight } = layout(dag);

      // Draw edges first (smooth curves, behind nodes)
      const edgesGroup = g.append('g').attr('class', 'edges');

      // Create smooth vertical link generator
      const linkGenerator = linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y);

      for (const link of dag.links()) {
        const sourceNode = nodeMap.get(link.source.data.id);
        const targetNode = nodeMap.get(link.target.data.id);
        
        if (!sourceNode || !targetNode) continue;

        // Calculate edge path
        const sourceX = link.source.x;
        const sourceY = link.source.y;
        const targetX = link.target.x;
        const targetY = link.target.y;

        // Adjust for node sizes
        const sourceHeight = sourceNode.type === 'FAMILY' ? familyNodeSize : nodeHeight;
        const targetHeight = targetNode.type === 'FAMILY' ? familyNodeSize : nodeHeight;

        const path = linkGenerator({
          source: { x: sourceX, y: sourceY + sourceHeight / 2 },
          target: { x: targetX, y: targetY - targetHeight / 2 }
        });

        edgesGroup.append('path')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', '#94a3b8')
          .attr('stroke-width', 2)
          .attr('stroke-linecap', 'round');
      }

      // Draw nodes
      const nodesGroup = g.append('g').attr('class', 'nodes');

      for (const node of dag.nodes()) {
        const nodeData = nodeMap.get(node.data.id);
        if (!nodeData) continue;

        const nodeGroup = nodesGroup.append('g')
          .attr('class', 'node')
          .attr('transform', `translate(${node.x}, ${node.y})`)
          .style('cursor', nodeData.type === 'PERSON' ? 'pointer' : 'default');

        if (nodeData.type === 'PERSON') {
          // Person node - rectangle with name and gender color
          const bgColor = nodeData.gender === 'M' ? '#3b82f6' : nodeData.gender === 'F' ? '#ec4899' : '#6b7280';

          // Calculate age from birth date
          let age: number | null = null;
          let birthDateStr: string | null = null;
          if (nodeData.birthDate) {
            const birthDate = new Date(nodeData.birthDate);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            birthDateStr = birthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          }

          nodeGroup.append('rect')
            .attr('x', -nodeWidth / 2)
            .attr('y', -nodeHeight / 2)
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('rx', 8)
            .attr('fill', bgColor)
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 2)
            .style('transition', 'all 0.2s')
            .on('click', () => {
              if (onNodeClick) {
                onNodeClick(nodeData.id, nodeData.type);
              }
            })
            .on('mouseenter', function() {
              select(this)
                .attr('stroke', '#fbbf24')
                .attr('stroke-width', 3);
            })
            .on('mouseleave', function() {
              select(this)
                .attr('stroke', '#1e293b')
                .attr('stroke-width', 2);
            });

          // Split label into lines if needed - limit to 2 lines
          const label = nodeData.label || nodeData.id;
          // Capitalize each word properly
          const capitalizedLabel = label
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          const words = capitalizedLabel.split(' ');
          const maxCharsPerLine = 14;
          const maxLines = 2;
          const lines: string[] = [];
          let currentLine = '';

          words.forEach(word => {
            if (lines.length >= maxLines) return;
            
            if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
              currentLine = currentLine ? currentLine + ' ' + word : word;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine && lines.length < maxLines) {
            lines.push(currentLine);
          } else if (currentLine && lines.length === maxLines) {
            // Truncate last line with ellipsis if name is too long
            lines[maxLines - 1] = lines[maxLines - 1].substring(0, maxCharsPerLine - 3) + '...';
          }

          // Render name text lines with tighter spacing
          const lineHeight = 12;
          const nameStartY = birthDateStr ? -20 : -(lines.length - 1) * lineHeight / 2;

          lines.forEach((line, i) => {
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', nameStartY + i * lineHeight)
              .attr('dy', '0.35em')
              .attr('fill', 'white')
              .attr('font-size', '11px')
              .attr('font-weight', '600')
              .text(line);
          });

          // Render birth date and age info with adjusted positioning
          if (birthDateStr && age !== null) {
            // Birth date with calendar icon (smaller)
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', nameStartY + lines.length * lineHeight + 6)
              .attr('dy', '0.35em')
              .attr('fill', 'rgba(255, 255, 255, 0.85)')
              .attr('font-size', '8px')
              .attr('font-weight', '500')
              .text(`📅 ${birthDateStr}`);

            // Age with subtle background (smaller)
            nodeGroup.append('rect')
              .attr('x', -22)
              .attr('y', nameStartY + lines.length * lineHeight + 13)
              .attr('width', 44)
              .attr('height', 12)
              .attr('rx', 6)
              .attr('fill', 'rgba(255, 255, 255, 0.2)')
              .attr('stroke', 'rgba(255, 255, 255, 0.3)')
              .attr('stroke-width', 1);

            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', nameStartY + lines.length * lineHeight + 19)
              .attr('dy', '0.35em')
              .attr('fill', 'white')
              .attr('font-size', '9px')
              .attr('font-weight', '700')
              .text(`${age} yrs`);
          }

        } else {
          // Family node - small green circle connector
          nodeGroup.append('circle')
            .attr('r', familyNodeSize / 2)
            .attr('fill', '#047857')
            .attr('stroke', '#064e3b')
            .attr('stroke-width', 2);
        }
      }

      // Center and fit the view
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const padding = 50;
        const scale = Math.min(
          (width - padding * 2) / bounds.width,
          (height - padding * 2) / bounds.height,
          1
        );
        
        const translateX = width / 2 - scale * (bounds.x + bounds.width / 2);
        const translateY = height / 2 - scale * (bounds.y + bounds.height / 2);
        
        svg.call(
          zoomBehavior.transform as any,
          zoomIdentity.translate(translateX, translateY).scale(scale)
        );
      }

    } catch (error) {
      console.error('Error rendering genealogy tree:', error);
    }
  }, [sortedData, dimensions, onNodeClick]);

  return (
    <div className="w-full h-full bg-stone-50 rounded-lg border border-stone-200 overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}
