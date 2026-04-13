'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { bookingsApi } from '@/lib/api';
import { Booking } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Calendar, Trash2 } from 'lucide-react';

export default function BookingsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', location: '', type: 'meeting' });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => bookingsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking created');
      setOpen(false);
      setForm({ title: '', description: '', start_time: '', end_time: '', location: '', type: 'meeting' });
    },
    onError: () => toast.error('Failed to create booking'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking removed');
    },
  });

  const upcoming = bookings.filter((b: Booking) => new Date(b.start_time) >= new Date());
  const past = bookings.filter((b: Booking) => new Date(b.start_time) < new Date());

  return (
    <div>
      <Header title="Bookings & Meetings" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="w-4 h-4 mr-1" /> New Booking
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Create Booking</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Start</Label>
                    <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>End</Label>
                    <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room / Zoom link" />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => createMutation.mutate(form)}
                    disabled={!form.title || !form.start_time || !form.end_time || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
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
          <>
            <div>
              <h3 className="text-sm font-medium mb-3">Upcoming ({upcoming.length})</h3>
              {upcoming.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No upcoming bookings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((b: Booking) => (
                    <div key={b.id} className="flex items-start justify-between p-4 border rounded-lg border-l-4 border-l-primary">
                      <div>
                        <p className="text-sm font-medium">{b.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(b.start_time, 'MMM d, h:mm a')} — {formatDate(b.end_time, 'h:mm a')}
                        </p>
                        {b.location && <p className="text-xs text-muted-foreground">{b.location}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(b.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {past.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">Past ({past.length})</h3>
                <div className="space-y-2">
                  {past.slice(0, 5).map((b: Booking) => (
                    <div key={b.id} className="flex items-start justify-between p-3 border rounded-lg opacity-60">
                      <div>
                        <p className="text-sm font-medium">{b.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(b.start_time, 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
