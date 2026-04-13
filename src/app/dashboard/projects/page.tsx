'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import { projectsApi, usersApi } from '@/lib/api';
import { Project, ProjectCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { statusColor, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, FolderKanban, Trash2, ChevronDown } from 'lucide-react';

const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: 'website_development', label: 'Website Development' },
  { value: 'dpl_outright', label: 'DPL Outright' },
  { value: 'dpl_partnership', label: 'DPL Partnership' },
  { value: 'direct_marketing', label: 'Direct Marketing' },
  { value: 'support_maintenance', label: 'Support & Maintenance' },
];

type DeliverableRow = { name: string; start_date: string; end_date: string };

const emptyDeliverable = (): DeliverableRow => ({ name: '', start_date: '', end_date: '' });

export default function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [form, setForm] = useState({
    name: '', description: '', category: '' as ProjectCategory | '', client_id: '',
    start_date: '', end_date: '', status: 'active',
  });
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [planEnabled, setPlanEnabled] = useState(false);
  const [plan, setPlan] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([emptyDeliverable()]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: ['operations_manager', 'team_lead', 'project_manager', 'customer_support_officer'].includes(user?.role ?? ''),
  });

  type UserRow = { id: number; first_name: string; last_name: string; role: string };
  const allUsers = users as UserRow[];
  const clients = allUsers.filter((u) => u.role === 'client');
  const nonClients = allUsers.filter((u) => u.role !== 'client');

  const resetForm = () => {
    setForm({ name: '', description: '', category: '', client_id: '', start_date: '', end_date: '', status: 'active' });
    setMemberIds([]);
    setPlanEnabled(false);
    setPlan({ name: '', description: '', start_date: '', end_date: '' });
    setDeliverables([emptyDeliverable()]);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const projectRes = await projectsApi.create(data);
      const projectId = projectRes.data.id;

      if (planEnabled && plan.name) {
        const planRes = await projectsApi.createPlan(projectId, {
          title: plan.name,
          description: plan.description || undefined,
          start_date: plan.start_date || undefined,
          end_date: plan.end_date || undefined,
        });
        const planId = planRes.data.id;
        for (const d of deliverables.filter((d) => d.name.trim())) {
          await projectsApi.createDeliverable(projectId, planId, {
            title: d.name,
            start_date: d.start_date || undefined,
            due_date: d.end_date || undefined,
          });
        }
      }
      return projectRes;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      setOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const detail = data?.message ?? (data?.errors ? Object.values(data.errors).flat().join(', ') : 'Unknown error');
      toast.error(`Failed to create project: ${detail}`);
    },
  });

  const filtered = projects.filter((p: Project) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const canCreate = ['operations_manager', 'team_lead'].includes(user?.role ?? '');
  const canSubmit = form.name && form.category && form.start_date && form.end_date && !createMutation.isPending;

  const updateDeliverable = (i: number, field: keyof DeliverableRow, value: string) => {
    setDeliverables((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };

  return (
    <div>
      <Header title="Projects" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canCreate && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="w-4 h-4 mr-1" /> New Project
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Project</DialogTitle>
                </DialogHeader>

                {/* ── Section A: Project Information ── */}
                <div className="space-y-4 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Information</p>

                  <div className="space-y-1">
                    <Label>Project Name <span className="text-destructive">*</span></Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter project name" />
                  </div>

                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional project description" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Category <span className="text-destructive">*</span></Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ProjectCategory })}>
                        <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Client</Label>
                      <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.first_name} {c.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Start Date <span className="text-destructive">*</span></Label>
                      <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>End Date <span className="text-destructive">*</span></Label>
                      <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                  </div>

                  {/* Team Members — checkbox list */}
                  <div className="space-y-1">
                    <Label>Team Members</Label>
                    {nonClients.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No users available</p>
                    ) : (
                      <div className="border rounded-md max-h-44 overflow-y-auto">
                        {nonClients.map((u) => (
                          <label
                            key={u.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input accent-primary"
                              checked={memberIds.includes(u.id)}
                              onChange={(e) => {
                                if (e.target.checked) setMemberIds([...memberIds, u.id]);
                                else setMemberIds(memberIds.filter((id) => id !== u.id));
                              }}
                            />
                            <span className="text-sm flex-1">{u.first_name} {u.last_name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{u.role.replace(/_/g, ' ')}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {memberIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">{memberIds.length} member{memberIds.length > 1 ? 's' : ''} selected</p>
                    )}
                  </div>
                </div>

                {/* ── Section B: Project Plan ── */}
                <div className="mt-4 pt-4 border-t space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={planEnabled}
                      onChange={(e) => setPlanEnabled(e.target.checked)}
                    />
                    <div>
                      <p className="text-sm font-medium">Create Plan Now</p>
                      <p className="text-xs text-muted-foreground">Optionally set up a project plan and deliverables</p>
                    </div>
                  </label>

                  {planEnabled && (
                    <div className="space-y-3 pl-7">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan Details</p>

                      <div className="space-y-1">
                        <Label>Plan Name <span className="text-destructive">*</span></Label>
                        <Input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="e.g. Phase 1" />
                      </div>

                      <div className="space-y-1">
                        <Label>Plan Description</Label>
                        <Textarea value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} rows={2} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Plan Start Date <span className="text-destructive">*</span></Label>
                          <Input type="date" value={plan.start_date} onChange={(e) => setPlan({ ...plan, start_date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Plan End Date <span className="text-destructive">*</span></Label>
                          <Input type="date" value={plan.end_date} onChange={(e) => setPlan({ ...plan, end_date: e.target.value })} />
                        </div>
                      </div>

                      {/* Deliverables */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deliverables</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDeliverables([...deliverables, emptyDeliverable()])}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                        {deliverables.map((d, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                            <div className="space-y-1">
                              {i === 0 && <Label className="text-xs">Name</Label>}
                              <Input
                                placeholder="Deliverable name"
                                value={d.name}
                                onChange={(e) => updateDeliverable(i, 'name', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              {i === 0 && <Label className="text-xs">Start Date</Label>}
                              <Input type="date" value={d.start_date} onChange={(e) => updateDeliverable(i, 'start_date', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              {i === 0 && <Label className="text-xs">End Date</Label>}
                              <Input type="date" value={d.end_date} onChange={(e) => updateDeliverable(i, 'end_date', e.target.value)} />
                            </div>
                            <div className={i === 0 ? 'pt-5' : ''}>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                disabled={deliverables.length === 1}
                                onClick={() => setDeliverables(deliverables.filter((_, idx) => idx !== i))}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-4 border-t mt-2">
                  <Button
                    className="flex-1"
                    disabled={!canSubmit}
                    onClick={() => createMutation.mutate({
                      name: form.name,
                      description: form.description || undefined,
                      category: form.category,
                      client_id: form.client_id ? Number(form.client_id) : undefined,
                      start_date: form.start_date,
                      end_date: form.end_date,
                      status: form.status,
                      member_ids: memberIds.length ? memberIds : undefined,
                    })}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                  <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Project list grouped by category */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No projects found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const catProjects = filtered.filter((p: Project) => p.category === cat.value);
              if (catProjects.length === 0) return null;
              const isOpen = openCategories.has(cat.value);
              return (
                <div key={cat.value} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleCategory(cat.value)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{cat.label}</span>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {catProjects.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                      {catProjects.map((project: Project) => (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardContent className="pt-5 pb-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-semibold text-sm leading-snug">{project.name}</h3>
                                <Badge className={`text-xs shrink-0 ${statusColor(project.status)}`} variant="outline">
                                  {project.status}
                                </Badge>
                              </div>
                              {project.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                              )}
                              {typeof project.progress === 'number' && project.progress > 0 && (
                                <div className="mb-2">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                                    <span>Progress</span><span>{project.progress}%</span>
                                  </div>
                                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                {project.manager && (
                                  <span>PM: {project.manager.first_name} {project.manager.last_name}</span>
                                )}
                                {project.end_date && <span>Due {formatDate(project.end_date)}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Uncategorised projects */}
            {(() => {
              const uncategorised = filtered.filter((p: Project) => !p.category);
              if (uncategorised.length === 0) return null;
              const isOpen = openCategories.has('__none__');
              return (
                <div className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleCategory('__none__')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Uncategorised</span>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {uncategorised.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                      {uncategorised.map((project: Project) => (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardContent className="pt-5 pb-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-semibold text-sm leading-snug">{project.name}</h3>
                                <Badge className={`text-xs shrink-0 ${statusColor(project.status)}`} variant="outline">
                                  {project.status}
                                </Badge>
                              </div>
                              {project.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                {project.manager && (
                                  <span>PM: {project.manager.first_name} {project.manager.last_name}</span>
                                )}
                                {project.end_date && <span>Due {formatDate(project.end_date)}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
