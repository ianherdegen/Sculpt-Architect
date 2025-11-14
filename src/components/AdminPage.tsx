import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { usePermission } from '../lib/usePermissions';
import { permissionsService, PermissionKey } from '../lib/permissionsService';
import { supabase, UserProfile } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Search, Loader2 } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';

interface UserWithPermissions extends UserProfile {
  permissions: Record<string, boolean>;
}

const PERMISSION_KEYS: PermissionKey[] = [
  'pose_library',
  'pose_management',
  'update_all',
  'delete_all'
];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  pose_library: 'Pose Library',
  pose_management: 'Pose Management',
  update_all: 'Update All',
  delete_all: 'Delete All',
  admin: 'Admin'
};

export function AdminPage() {
  const { user } = useAuth();
  const { hasPermission: hasAdminAccess, loading: permissionLoading } = usePermission('admin');
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all users
  useEffect(() => {
    if (!hasAdminAccess) return;
    
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Try using the RPC function first (if available)
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_all_users_for_admin');

        if (!rpcError && rpcData) {
          const usersWithPermissions = (rpcData || []).map((user: any) => ({
            ...user,
            permissions: (user.permissions as Record<string, boolean>) || {}
          }));
          setUsers(usersWithPermissions);
          return;
        }

        // Fallback to direct query if RPC function doesn't exist
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .order('email', { ascending: true });

        if (error) throw error;

        const usersWithPermissions = (data || []).map(user => ({
          ...user,
          permissions: (user.permissions as Record<string, boolean>) || {}
        }));

        setUsers(usersWithPermissions);
      } catch (error) {
        console.error('Error fetching users:', error);
        alert('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [hasAdminAccess]);

  // Handle permission toggle and auto-save
  const handlePermissionToggle = async (userId: string, permissionKey: PermissionKey, checked: boolean) => {
    try {
      setSaving(userId);
      
      // Get current permissions
      const currentPermissions = await permissionsService.getUserPermissions(userId);
      
      // Update permissions
      const updatedPermissions = {
        ...currentPermissions,
        [permissionKey]: checked
      };

      // Update in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ permissions: updatedPermissions })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId 
          ? { ...u, permissions: updatedPermissions }
          : u
      ));
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions. Please try again.');
    } finally {
      setSaving(null);
    }
  };


  // Filter users by search query
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Check permissions - show access denied if user doesn't have admin permission
  if (permissionLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Authentication Required</p>
          <p className="text-muted-foreground">Please sign in to access the admin page.</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-muted-foreground">You do not have permission to access the admin page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-8'} max-w-7xl mx-auto`}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage user permissions</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? 'No users found matching your search.' : 'No users found.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">User</TableHead>
                  {PERMISSION_KEYS.map(key => (
                    <TableHead key={key} className="text-center">
                      {PERMISSION_LABELS[key]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.email}</div>
                        {user.name && (
                          <div className="text-sm text-muted-foreground">{user.name}</div>
                        )}
                      </div>
                    </TableCell>
                    {PERMISSION_KEYS.map(permissionKey => (
                      <TableCell key={permissionKey} className="text-center">
                        <Checkbox
                          checked={user.permissions[permissionKey] === true}
                          disabled={saving === user.user_id}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(user.user_id, permissionKey, checked === true)
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

