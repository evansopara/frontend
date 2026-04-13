'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import { memosApi, usersApi } from '@/lib/api';
import { Memo, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Mail } from 'lucide-react';

export default function MemosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Memo | null>(null);
  const [replyText, setReplyText] = useState('');

  const [form, setForm] = useState({ subject: '', content: '', recipients: '' });

  const { data: memos = [], isLoading } = useQuery({
    queryKey: ['memos'],
    queryFn: () => memosApi.list().then((r) => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => memosApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memos'] });
      toast.success('Memo sent');
      setOpen(false);
      setForm({ subject: '', content: '', recipients: '' });
    },
    onError: () => toast.error('Failed to send memo'),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => memosApi.respond(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memos'] });
      toast.success('Reply sent');
      setReplyText('');
    },
  });

  const memoDetail = useQuery({
    queryKey: ['memo', selected?.id],
    queryFn: () => memosApi.get(selected!.id).then((r) => r.data),
    enabled: !!selected,
  });

  return (
    <div>
      <Header title="Memos" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-56px)]">
        {/* List */}
        <div className="lg:col-span-1 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Memos ({memos.length})</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="w-4 h-4 mr-1" /> New
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Send Memo</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Message</Label>
                    <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
                  </div>
                  <div className="space-y-1">
                    <Label>Recipients (select users)</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {users.filter((u: User) => u.id !== user?.id).map((u: User) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={form.recipients.split(',').includes(String(u.id))}
                            onChange={(e) => {
                              const ids = form.recipients.split(',').filter(Boolean);
                              if (e.target.checked) ids.push(String(u.id));
                              else ids.splice(ids.indexOf(String(u.id)), 1);
                              setForm({ ...form, recipients: ids.join(',') });
                            }}
                          />
                          {u.first_name} {u.last_name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => createMutation.mutate({
                        subject: form.subject,
                        content: form.content,
                        recipients: form.recipients.split(',').filter(Boolean).map(Number),
                      })}
                      disabled={!form.subject || !form.content || !form.recipients || createMutation.isPending}
                    >
                      {createMutation.isPending ? 'Sending...' : 'Send Memo'}
                    </Button>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : memos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No memos yet</p>
            </div>
          ) : (
            memos.map((memo: Memo) => (
              <div
                key={memo.id}
                onClick={() => setSelected(memo)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected?.id === memo.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{memo.subject}</p>
                  {memo.responses && memo.responses.length > 0 && (
                    <Badge variant="secondary" className="text-xs shrink-0">{memo.responses.length}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {memo.sender?.first_name} {memo.sender?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(memo.created_at)}</p>
              </div>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selected && memoDetail.data ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base">{memoDetail.data.subject}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  From: {memoDetail.data.sender?.first_name} {memoDetail.data.sender?.last_name} · {timeAgo(memoDetail.data.created_at)}
                </p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                <p className="text-sm whitespace-pre-wrap">{memoDetail.data.content}</p>
                {memoDetail.data.responses?.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Replies</p>
                    {memoDetail.data.responses.map((r: { id: number; user?: User; content: string; created_at: string }) => (
                      <div key={r.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(r.user?.first_name?.[0] ?? '') + (r.user?.last_name?.[0] ?? '')}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{r.user?.first_name} {r.user?.last_name}</p>
                          <p className="text-sm">{r.content}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => replyMutation.mutate({ id: selected.id, content: replyText })}
                    disabled={!replyText || replyMutation.isPending}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a memo to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
