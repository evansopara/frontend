'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import { leaveApi } from '@/lib/api';
import { LeaveApplication } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { statusColor, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Calendar } from 'lucide-react';

export default function LeavePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
  const [decideId, setDecideId] = useState<number | null>(null);
  const [decision, setDecision] = useState({ status: 'approved', review_comment: '' });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leave'],
    queryFn: () => leaveApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => leaveApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Leave application submitted');
      setOpen(false);
      setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
    },
    onError: () => toast.error('Failed to submit application'),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => leaveApi.decide(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Decision recorded');
      setDecideId(null);
    },
  });

  const canDecide = ['operations_manager', 'team_lead'].includes(user?.role ?? '');

  return (
    <div>
      <Header title="Leave Applications" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{leaves.length} applications</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="w-4 h-4 mr-1" /> Apply for Leave
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Leave Application</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Leave Type</Label>
                  <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v ?? form.leave_type })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['annual', 'sick', 'personal', 'emergency', 'maternity', 'paternity', 'unpaid'].map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>End Date</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => createMutation.mutate(form)}
                    disabled={!form.start_date || !form.end_date || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No leave applications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaves.map((leave: LeaveApplication) => (
              <div key={leave.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium capitalize">{leave.leave_type} Leave</p>
                    {leave.user && (
                      <span className="text-xs text-muted-foreground">— {leave.user.first_name} {leave.user.last_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                  </p>
                  {leave.reason && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{leave.reason}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs ${statusColor(leave.status)}`} variant="outline">{leave.status}</Badge>
                  {canDecide && leave.status === 'pending' && (
                    <Button variant="outline" size="sm" onClick={() => setDecideId(leave.id)}>Review</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Decision Dialog */}
        <Dialog open={!!decideId} onOpenChange={() => setDecideId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Review Leave Application</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>Decision</Label>
                <Select value={decision.status} onValueChange={(v) => setDecision({ ...decision, status: v ?? decision.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Comment (optional)</Label>
                <Textarea value={decision.review_comment} onChange={(e) => setDecision({ ...decision, review_comment: e.target.value })} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => decideMutation.mutate({ id: decideId!, data: decision })}
                  disabled={decideMutation.isPending}
                >
                  {decideMutation.isPending ? 'Saving...' : 'Confirm'}
                </Button>
                <Button variant="outline" onClick={() => setDecideId(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
