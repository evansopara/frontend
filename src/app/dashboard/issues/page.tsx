'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import { issuesApi, projectsApi } from '@/lib/api';
import { IssueReport } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { statusColor, priorityColor, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, AlertCircle } from 'lucide-react';

export default function IssuesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', project_id: '', priority: 'medium' });

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues'],
    queryFn: () => issuesApi.list().then((r) => r.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => issuesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue reported');
      setOpen(false);
      setForm({ title: '', description: '', project_id: '', priority: 'medium' });
    },
    onError: () => toast.error('Failed to report issue'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => issuesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  });

  const canManage = ['operations_manager', 'team_lead', 'project_manager'].includes(user?.role ?? '');

  return (
    <div>
      <Header title="Issue Reports" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="w-4 h-4 mr-1" /> Report Issue
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Report an Issue</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Project (optional)</Label>
                    <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {projects.map((p: { id: number; name: string }) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['low', 'medium', 'high', 'urgent'].map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => createMutation.mutate({
                      ...form,
                      project_id: form.project_id ? Number(form.project_id) : undefined,
                    })}
                    disabled={!form.title || !form.description || createMutation.isPending}
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
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : issues.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No issues reported</p>
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue: IssueReport) => (
              <div key={issue.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{issue.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{issue.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {issue.project && <span className="text-xs text-muted-foreground">{issue.project.name}</span>}
                      {issue.reporter && <span className="text-xs text-muted-foreground">· {issue.reporter.first_name} {issue.reporter.last_name}</span>}
                      <span className="text-xs text-muted-foreground">· {timeAgo(issue.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {issue.priority && <Badge className={`text-xs ${priorityColor(issue.priority)}`} variant="outline">{issue.priority}</Badge>}
                    {canManage ? (
                      <Select value={issue.status} onValueChange={(v) => updateMutation.mutate({ id: issue.id, data: { status: v } })}>
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`text-xs ${statusColor(issue.status)}`} variant="outline">{issue.status.replace(/_/g, ' ')}</Badge>
                    )}
                  </div>
                </div>
                {issue.resolution && (
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                    <span className="font-medium">Resolution: </span>{issue.resolution}
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
