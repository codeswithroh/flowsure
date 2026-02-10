'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipientListsApi, RecipientList, Recipient } from '@/lib/api/recipient-lists';
import { useWalletStore } from '@/store/wallet-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Trash2, Edit, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

export function RecipientListManager() {
  const { user } = useWalletStore();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedList, setSelectedList] = useState<RecipientList | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newRecipients, setNewRecipients] = useState<Recipient[]>([{ address: '', name: '' }]);

  const { data: listsData, isLoading } = useQuery({
    queryKey: ['recipient-lists', user?.addr],
    queryFn: () => recipientListsApi.getByUser(user!.addr!),
    enabled: !!user?.addr,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => recipientListsApi.create(data),
    onSuccess: () => {
      toast.success('Recipient list created successfully');
      queryClient.invalidateQueries({ queryKey: ['recipient-lists'] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create recipient list');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => recipientListsApi.update(id, data),
    onSuccess: () => {
      toast.success('Recipient list updated successfully');
      queryClient.invalidateQueries({ queryKey: ['recipient-lists'] });
      setShowEditDialog(false);
      setSelectedList(null);
    },
    onError: () => {
      toast.error('Failed to update recipient list');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recipientListsApi.delete(id),
    onSuccess: () => {
      toast.success('Recipient list deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['recipient-lists'] });
    },
    onError: () => {
      toast.error('Failed to delete recipient list');
    },
  });

  const lists = listsData?.data || [];

  const resetForm = () => {
    setNewListName('');
    setNewListDescription('');
    setNewRecipients([{ address: '', name: '' }]);
  };

  const addRecipientField = () => {
    setNewRecipients([...newRecipients, { address: '', name: '' }]);
  };

  const removeRecipientField = (index: number) => {
    setNewRecipients(newRecipients.filter((_, i) => i !== index));
  };

  const updateRecipientField = (index: number, field: 'address' | 'name', value: string) => {
    const updated = [...newRecipients];
    updated[index][field] = value;
    setNewRecipients(updated);
  };

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    const validRecipients = newRecipients.filter(r => r.address.trim());
    if (validRecipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    createMutation.mutate({
      userAddress: user!.addr,
      name: newListName,
      description: newListDescription,
      recipients: validRecipients,
    });
  };

  const handleEditList = (list: RecipientList) => {
    setSelectedList(list);
    setNewListName(list.name);
    setNewListDescription(list.description || '');
    setNewRecipients(list.recipients.length > 0 ? list.recipients : [{ address: '', name: '' }]);
    setShowEditDialog(true);
  };

  const handleUpdateList = () => {
    if (!selectedList) return;

    const validRecipients = newRecipients.filter(r => r.address.trim());
    if (validRecipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    updateMutation.mutate({
      id: selectedList._id || selectedList.id!,
      data: {
        name: newListName,
        description: newListDescription,
        recipients: validRecipients,
      },
    });
  };

  if (!user?.loggedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
          <CardDescription>Please connect your wallet to manage recipient lists</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recipient Lists</h2>
          <p className="text-muted-foreground">Manage groups of recipients for batch payouts</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Recipient List</DialogTitle>
              <DialogDescription>
                Create a list of recipients for easy batch transfers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className='pb-4' htmlFor="list-name">List Name *</Label>
                <Input
                  id="list-name"
                  placeholder="e.g., Backend Developers, Marketing Team"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="mb-4"
                />
              </div>
              <div>
                <Label className='pb-4' htmlFor="list-description">Description</Label>
                <Textarea
                  id="list-description"
                  placeholder="Optional description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  className="mb-4"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Recipients *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRecipientField}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Recipient
                  </Button>
                </div>
                <div className="space-y-3">
                  {newRecipients.map((recipient, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Wallet Address *"
                          value={recipient.address}
                          onChange={(e) => updateRecipientField(index, 'address', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Name (optional)"
                          value={recipient.name || ''}
                          onChange={(e) => updateRecipientField(index, 'name', e.target.value)}
                        />
                      </div>
                      {newRecipients.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRecipientField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateList} disabled={createMutation.isPending} className="flex-1">
                  Create List
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading recipient lists...</p>
          </CardContent>
        </Card>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No recipient lists yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card key={list._id || list.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                    {list.description && (
                      <CardDescription className="mt-1">{list.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {list.recipients.length} {list.recipients.length === 1 ? 'recipient' : 'recipients'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {list.recipients.slice(0, 3).map((recipient, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium">{recipient.name || 'Unnamed'}</p>
                      <p className="text-muted-foreground font-mono text-xs truncate">
                        {recipient.address}
                      </p>
                    </div>
                  ))}
                  {list.recipients.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{list.recipients.length - 3} more
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditList(list)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(list._id || list.id!)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipient List</DialogTitle>
            <DialogDescription>Update your recipient list details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-list-name">List Name *</Label>
              <Input
                id="edit-list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="mb-4"
              />
            </div>
            <div>
              <Label htmlFor="edit-list-description">Description</Label>
              <Textarea
                id="edit-list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                className="mb-4"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Recipients *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRecipientField}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>
              <div className="space-y-3">
                {newRecipients.map((recipient, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Wallet Address *"
                        value={recipient.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRecipientField(index, 'address', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Name (optional)"
                        value={recipient.name || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRecipientField(index, 'name', e.target.value)}
                      />
                    </div>
                    {newRecipients.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRecipientField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateList} disabled={updateMutation.isPending} className="flex-1">
                Update List
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
