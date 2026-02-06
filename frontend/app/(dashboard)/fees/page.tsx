'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { feeApi } from '@/lib/api';
import Button from '@/components/Button';
import { MembershipFee } from '@/types';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

export default function FeesPage() {
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');

  useEffect(() => {
    fetchFees();
  }, [filter]);

  const fetchFees = async () => {
    try {
      const data: any = filter === 'overdue' ? await feeApi.getOverdue() : await feeApi.getAll();
      setFees(data);
    } catch (error) {
      console.error('Failed to fetch fees:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidAmount = fees
    .filter((f) => f.status === 'PAID')
    .reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-charcoal mb-2">Membership Fees</h1>
          <p className="text-gray-600">Track and manage membership payments</p>
        </div>
        <Button>Record Payment</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600 mb-1">Total Fees</p>
            <p className="text-2xl font-bold text-charcoal">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600 mb-1">Collected</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totalAmount - paidAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Records ({fees.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filter === 'all' ? 'primary' : 'ghost'}
                onClick={() => setFilter('all')}
              >
                All Fees
              </Button>
              <Button
                size="sm"
                variant={filter === 'overdue' ? 'primary' : 'ghost'}
                onClick={() => setFilter('overdue')}
              >
                Overdue
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Paid Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-charcoal">{fee.memberName}</td>
                    <td className="px-6 py-4 text-charcoal">{formatCurrency(fee.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(fee.dueDate)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {fee.paidDate ? formatDate(fee.paidDate) : '-'}
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
                    <td className="px-6 py-4">
                      <Button size="sm" variant="ghost">
                        {fee.status === 'PENDING' ? 'Mark Paid' : 'View'}
                      </Button>
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
