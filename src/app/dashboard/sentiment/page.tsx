'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { projectsApi } from '@/lib/api';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Star } from 'lucide-react';

export default function SentimentPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ project_id: '', sentiment: 'positive', feedback: '' });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Record<string, unknown> }) =>
      projectsApi.addSentiment(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Sentiment recorded');
      setOpen(false);
      setForm({ project_id: '', sentiment: 'positive', feedback: '' });
    },
    onError: () => toast.error('Failed to record'),
  });

  const sentimentColor = (s: string) => ({
    positive: 'bg-green-100 text-green-700',
    neutral: 'bg-yellow-100 text-yellow-700',
    negative: 'bg-red-100 text-red-700',
  }[s] ?? 'bg-gray-100 text-gray-700');

  return (
    <div>
      <Header title="Client Sentiment" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="w-4 h-4 mr-1" /> Record Sentiment
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Record Client Sentiment</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Project</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v ?? form.project_id })}>
                    <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p: Project) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Sentiment</Label>
                  <Select value={form.sentiment} onValueChange={(v) => setForm({ ...form, sentiment: v ?? form.sentiment })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">😊 Positive</SelectItem>
                      <SelectItem value="neutral">😐 Neutral</SelectItem>
                      <SelectItem value="negative">😞 Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Feedback</Label>
                  <Textarea value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => createMutation.mutate({
                      projectId: Number(form.project_id),
                      data: { sentiment: form.sentiment, feedback: form.feedback },
                    })}
                    disabled={!form.project_id || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Saving...' : 'Record'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : (
          <div className="space-y-4">
            {projects.map((project: Project & { sentiments?: { id: number; sentiment: string; feedback?: string; created_at: string }[] }) => {
              const sentiments = project.sentiments ?? [];
              if (sentiments.length === 0) return null;
              return (
                <div key={project.id}>
                  <h3 className="text-sm font-semibold mb-2">{project.name}</h3>
                  <div className="space-y-2">
                    {sentiments.map((s) => (
                      <div key={s.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge className={`text-xs shrink-0 capitalize ${sentimentColor(s.sentiment)}`}>{s.sentiment}</Badge>
                        <div className="flex-1 min-w-0">
                          {s.feedback && <p className="text-sm">{s.feedback}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(s.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {projects.every((p: Project & { sentiments?: unknown[] }) => !p.sentiments?.length) && (
              <div className="text-center py-16 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No sentiment data yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
