'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import { reviewLinksApi, usersApi } from '@/lib/api';
import { ReviewLink, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { statusColor, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Link2, ExternalLink } from 'lucide-react';

export default function ReviewLinksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [respondId, setRespondId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ title: '', link_url: '', description: '', assigned_to: '' });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['review-links'],
    queryFn: () => reviewLinksApi.list().then((r) => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => reviewLinksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-links'] });
      toast.success('Review link sent');
      setOpen(false);
      setForm({ title: '', link_url: '', description: '', assigned_to: '' });
    },
    onError: () => toast.error('Failed to send'),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => reviewLinksApi.respond(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-links'] });
      toast.success('Review submitted');
      setRespondId(null);
      setComment('');
    },
  });

  return (
    <div>
      <Header title="Review Links" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="w-4 h-4 mr-1" /> Send Review Link
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Send Review Link</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Link URL</Label>
                  <Input type="url" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://" />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Assign To</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v ?? form.assigned_to })}>
                    <SelectTrigger><SelectValue placeholder="Select person..." /></SelectTrigger>
                    <SelectContent>
                      {users.filter((u: User) => u.id !== user?.id).map((u: User) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => createMutation.mutate({
                      ...form,
                      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
                    })}
                    disabled={!form.title || !form.link_url || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Sending...' : 'Send'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : links.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No review links</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link: ReviewLink) => (
              <div key={link.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{link.title}</p>
                      <a href={link.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    {link.description && <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {link.sender && <span>From: {link.sender.first_name} {link.sender.last_name}</span>}
                      {link.assignee && <span>→ {link.assignee.first_name} {link.assignee.last_name}</span>}
                      <span>· {timeAgo(link.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${statusColor(link.status)}`} variant="outline">{link.status}</Badge>
                    {link.assigned_to === user?.id && link.status === 'pending' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRespondId(link.id)}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
                {link.review_comment && (
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                    <span className="font-medium">Comment: </span>{link.review_comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!respondId} onOpenChange={() => setRespondId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Submit Review</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional review comment..." rows={3} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => respondMutation.mutate({ id: respondId!, comment })} disabled={respondMutation.isPending}>
                  {respondMutation.isPending ? 'Submitting...' : 'Mark as Reviewed'}
                </Button>
                <Button variant="outline" onClick={() => setRespondId(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
