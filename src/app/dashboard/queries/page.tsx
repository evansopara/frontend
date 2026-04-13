'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import { queriesApi } from '@/lib/api';
import { StaffQuery } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { statusColor, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function QueriesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [replyId, setReplyId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [form, setForm] = useState({ subject: '', message: '' });

  const { data: queries = [], isLoading } = useQuery({
    queryKey: ['queries'],
    queryFn: () => queriesApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => queriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queries'] });
      toast.success('Query submitted');
      setOpen(false);
      setForm({ subject: '', message: '' });
    },
    onError: () => toast.error('Failed to submit'),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response: string }) => queriesApi.respond(id, response),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queries'] });
      toast.success('Response sent');
      setReplyId(null);
      setReply('');
    },
  });

  const canRespond = ['operations_manager', 'team_lead', 'project_manager'].includes(user?.role ?? '');

  return (
    <div>
      <Header title="Staff Queries" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="w-4 h-4 mr-1" /> Submit Query
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Submit Query</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Message</Label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={!form.subject || !form.message || createMutation.isPending}>
                    {createMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : queries.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground text-sm">No queries yet</p>
        ) : (
          <div className="space-y-2">
            {queries.map((q: StaffQuery) => (
              <div key={q.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{q.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.message}</p>
                    {q.submitter && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.submitter.first_name} {q.submitter.last_name} · {timeAgo(q.created_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${statusColor(q.status)}`} variant="outline">{q.status}</Badge>
                    {canRespond && q.status !== 'resolved' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReplyId(q.id)}>
                        Reply
                      </Button>
                    )}
                  </div>
                </div>
                {q.response && (
                  <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
                    <span className="font-medium">Response: </span>{q.response}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!replyId} onOpenChange={() => setReplyId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Send Response</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write your response..." rows={4} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => respondMutation.mutate({ id: replyId!, response: reply })} disabled={!reply || respondMutation.isPending}>
                  {respondMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
                <Button variant="outline" onClick={() => setReplyId(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
