'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import { complaintsApi } from '@/lib/api';
import { Complaint } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { statusColor, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, AlertCircle } from 'lucide-react';

export default function ComplaintsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
    email: user?.email ?? '',
    product_manager_name: '',
    developer_name: '',
    detailed_explanation: '',
  });

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => complaintsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => complaintsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint submitted');
      setOpen(false);
    },
    onError: () => toast.error('Failed to submit complaint'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => complaintsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['complaints'] }),
  });

  const canManage = ['operations_manager', 'team_lead', 'customer_support_officer'].includes(user?.role ?? '');

  return (
    <div>
      <Header title="Complaints" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="w-4 h-4 mr-1" /> Submit Complaint
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Submit a Complaint</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Your Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Product Manager (if applicable)</Label>
                    <Input value={form.product_manager_name} onChange={(e) => setForm({ ...form, product_manager_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Developer (if applicable)</Label>
                    <Input value={form.developer_name} onChange={(e) => setForm({ ...form, developer_name: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Detailed Explanation</Label>
                  <Textarea value={form.detailed_explanation} onChange={(e) => setForm({ ...form, detailed_explanation: e.target.value })} rows={5} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={!form.detailed_explanation || createMutation.isPending}>
                    {createMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No complaints filed</p>
          </div>
        ) : (
          <div className="space-y-2">
            {complaints.map((c: Complaint) => (
              <div key={c.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name} <span className="text-muted-foreground font-normal">({c.email})</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.detailed_explanation}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(c.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage ? (
                      <Select value={c.status} onValueChange={(v) => v && updateMutation.mutate({ id: c.id, data: { status: v } })}>
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['open', 'in_review', 'resolved', 'closed'].map((s) => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`text-xs ${statusColor(c.status)}`} variant="outline">{c.status.replace(/_/g, ' ')}</Badge>
                    )}
                  </div>
                </div>
                {c.review_comments && (
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                    <span className="font-medium">Review notes: </span>{c.review_comments}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
