import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Pose, PoseVariation } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { Plus, Trash2, Edit, Search, Upload, X, Image as ImageIcon, ChevronDown, Grid3x3, Table as TableIcon, Save, Pencil, User } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';
import { generateUUID } from '../lib/uuid';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { usePermission } from '../lib/usePermissions';
import { useAuth } from '../lib/auth';

interface PoseLibraryProps {
  poses: Pose[];
  variations: PoseVariation[];
  onAddPose: (pose: Pose, defaultVariation: PoseVariation) => void;
  onDeletePose: (poseId: string) => void;
  onAddVariation: (variation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>) => Promise<PoseVariation>;
  onDeleteVariation: (variationId: string) => void;
  onSetDefaultVariation: (poseId: string, variationId: string) => void;
  onUpdatePoseName: (poseId: string, newName: string) => void;
  onUpdateVariationName: (variationId: string, newName: string) => void;
  onUpdateVariationCues?: (variationId: string, cues: { cue1?: string | null; cue2?: string | null; cue3?: string | null; breathTransition?: string | null }) => Promise<void>;
  onUploadVariationImage?: (variationId: string, file: File) => Promise<void>;
  onDeleteVariationImage?: (variationId: string, imageUrl: string) => Promise<void>;
}


export function PoseLibrary({
  poses,
  variations,
  onAddPose,
  onDeletePose,
  onAddVariation,
  onDeleteVariation,
  onSetDefaultVariation,
  onUpdatePoseName,
  onUpdateVariationName,
  onUpdateVariationCues,
  onUploadVariationImage,
  onDeleteVariationImage,
}: PoseLibraryProps) {
  const { user } = useAuth();
  const { hasPermission: hasLibraryAccess, loading: permissionLoading } = usePermission('pose_library');
  const { hasPermission: hasManagementAccess } = usePermission('pose_management');
  const { hasPermission: hasUpdateAllAccess } = usePermission('update_all');
  const { hasPermission: hasDeleteAllAccess } = usePermission('delete_all');
  const isMobile = useIsMobile();
  const [isAddPoseOpen, setIsAddPoseOpen] = useState(false);
  const [isAddVariationOpen, setIsAddVariationOpen] = useState(false);
  const [newPoseName, setNewPoseName] = useState('');
  const [newVariationName, setNewVariationName] = useState('');
  const [selectedPoseForVariation, setSelectedPoseForVariation] = useState<string | null>(null);
  const [editingPoseId, setEditingPoseId] = useState<string | null>(null);
  const [editedPoseName, setEditedPoseName] = useState('');
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
  const [editedVariationName, setEditedVariationName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ [key: string]: string }>({});
  const [selectedPoseForDetails, setSelectedPoseForDetails] = useState<string | null>(null);
  const [hoveredVariationId, setHoveredVariationId] = useState<string | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Force grid view on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'table') {
      setViewMode('grid');
    }
  }, [isMobile, viewMode]);
  
  // Excel-like inline editing state
  const [pendingChanges, setPendingChanges] = useState<{
    poses: Map<string, string>; // poseId -> newName
    variations: Map<string, string>; // variationId -> newName
    cues: Map<string, { cue1?: string | null; cue2?: string | null; cue3?: string | null; breathTransition?: string | null }>; // variationId -> cue changes
  }>({
    poses: new Map(),
    variations: new Map(),
    cues: new Map(),
  });
  const [editingCell, setEditingCell] = useState<{ type: 'pose' | 'variation' | 'cue' | 'breath'; id: string; cueNum?: 1 | 2 | 3 } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);


  const location = useLocation();
  const hasUnsavedChanges = pendingChanges.poses.size > 0 || pendingChanges.variations.size > 0 || pendingChanges.cues.size > 0;

  // Track location changes to detect navigation
  useEffect(() => {
    // This effect runs when location changes, but we can't prevent it
    // The beforeunload handler will catch browser navigation
  }, [location]);

  // Warn before leaving page with unsaved changes (browser refresh/close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCellClick = (type: 'pose' | 'variation' | 'cue' | 'breath', id: string, currentValue: string, cueNum?: 1 | 2 | 3) => {
    if (viewMode !== 'table') return;
    
    // Check permissions before allowing edits
    if (type === 'pose') {
      const pose = poses.find(p => p.id === id);
      if (pose && !canManagePose(pose)) {
        alert('You can only edit poses that you created.');
        return;
      }
    } else if (type === 'variation') {
      const variation = variations.find(v => v.id === id);
      if (variation && !canManageVariation(variation)) {
        alert('You can only edit variations that you created.');
        return;
      }
    } else if (type === 'cue' || type === 'breath') {
      const variation = variations.find(v => v.id === id);
      if (variation && !canManageVariation(variation)) {
        alert('You can only edit cues for variations that you created.');
        return;
      }
    }
    
    setEditingCell({ type, id, cueNum });
    setEditingCellValue(currentValue);
  };

  const handleCellBlur = () => {
    if (!editingCell) return;
    
    const { type, id, cueNum } = editingCell;
    
    if (type === 'cue' && cueNum) {
      const variation = variations.find(v => v.id === id);
      if (!variation) return;
      
      if (!canManageVariation(variation)) {
        alert('You can only edit cues for variations that you created.');
        setEditingCell(null);
        setEditingCellValue('');
        return;
      }
      
      const originalValue = variation?.[`cue${cueNum}` as 'cue1' | 'cue2' | 'cue3'] ?? '';
      const trimmedNewValue = editingCellValue.trim();
      const trimmedOriginalValue = originalValue.trim();
      
      if (trimmedNewValue !== trimmedOriginalValue) {
        setPendingChanges(prev => {
          const newChanges = {
            poses: new Map(prev.poses),
            variations: new Map(prev.variations),
            cues: new Map(prev.cues),
          };
          
          const existingCueChanges = newChanges.cues.get(id) || {};
          // Allow empty string to be saved as null
          existingCueChanges[`cue${cueNum}` as 'cue1' | 'cue2' | 'cue3'] = trimmedNewValue === '' ? null : trimmedNewValue;
          newChanges.cues.set(id, existingCueChanges);
          
          return newChanges;
        });
      } else {
        // Remove from pending changes if reverted to original
        setPendingChanges(prev => {
          const newChanges = {
            poses: new Map(prev.poses),
            variations: new Map(prev.variations),
            cues: new Map(prev.cues),
          };
          
          const existingCueChanges = newChanges.cues.get(id);
          if (existingCueChanges) {
            delete existingCueChanges[`cue${cueNum}` as 'cue1' | 'cue2' | 'cue3'];
            if (Object.keys(existingCueChanges).length === 0) {
              newChanges.cues.delete(id);
            } else {
              newChanges.cues.set(id, existingCueChanges);
            }
          }
          
          return newChanges;
        });
      }
    } else if (type === 'breath') {
      const variation = variations.find(v => v.id === id);
      if (!variation) return;
      
      if (!canManageVariation(variation)) {
        alert('You can only edit breath/transition cues for variations that you created.');
        setEditingCell(null);
        setEditingCellValue('');
        return;
      }
      
      const originalValue = variation?.breathTransition ?? '';
      const trimmedNewValue = editingCellValue.trim();
      const trimmedOriginalValue = originalValue.trim();
      
      if (trimmedNewValue !== trimmedOriginalValue) {
        setPendingChanges(prev => {
          const newChanges = {
            poses: new Map(prev.poses),
            variations: new Map(prev.variations),
            cues: new Map(prev.cues),
          };
          
          const existingCueChanges = newChanges.cues.get(id) || {};
          // Allow empty string to be saved as null
          const updatedCueChanges = {
            ...existingCueChanges,
            breathTransition: trimmedNewValue === '' ? null : trimmedNewValue
          };
          newChanges.cues.set(id, updatedCueChanges);
          
          return newChanges;
        });
      } else {
        // Remove from pending changes if reverted to original
        setPendingChanges(prev => {
          const newChanges = {
            poses: new Map(prev.poses),
            variations: new Map(prev.variations),
            cues: new Map(prev.cues),
          };
          
          const existingCueChanges = newChanges.cues.get(id);
          if (existingCueChanges) {
            const updatedCueChanges: { cue1?: string | null; cue2?: string | null; cue3?: string | null; breathTransition?: string | null } = { ...existingCueChanges };
            delete updatedCueChanges.breathTransition;
            if (Object.keys(updatedCueChanges).length === 0) {
              newChanges.cues.delete(id);
            } else {
              newChanges.cues.set(id, updatedCueChanges);
            }
          }
          
          return newChanges;
        });
      }
    } else {
      const originalValue = type === 'pose' 
        ? poses.find(p => p.id === id)?.name || ''
        : variations.find(v => v.id === id)?.name || '';
      
      if (editingCellValue.trim() !== originalValue.trim() && editingCellValue.trim()) {
        setPendingChanges(prev => {
          const newChanges = {
            poses: new Map(prev.poses),
            variations: new Map(prev.variations),
            cues: new Map(prev.cues),
          };
          
          if (type === 'pose') {
            newChanges.poses.set(id, editingCellValue.trim());
          } else {
            newChanges.variations.set(id, editingCellValue.trim());
          }
          
          return newChanges;
        });
      } else {
        // Remove from pending changes if reverted to original
        setPendingChanges(prev => {
          const newChanges = {
            poses: new Map(prev.poses),
            variations: new Map(prev.variations),
            cues: new Map(prev.cues),
          };
          
          if (type === 'pose') {
            newChanges.poses.delete(id);
          } else {
            newChanges.variations.delete(id);
          }
          
          return newChanges;
        });
      }
    }
    
    setEditingCell(null);
    setEditingCellValue('');
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (!editingCell) return;
      
      const { type, id, cueNum } = editingCell;
      let originalValue = '';
      
      if (type === 'cue' && cueNum) {
        const variation = variations.find(v => v.id === id);
        originalValue = variation?.[`cue${cueNum}` as 'cue1' | 'cue2' | 'cue3'] ?? '';
      } else if (type === 'breath') {
        const variation = variations.find(v => v.id === id);
        originalValue = variation?.breathTransition ?? '';
      } else {
        originalValue = type === 'pose'
          ? poses.find(p => p.id === id)?.name || ''
          : variations.find(v => v.id === id)?.name || '';
      }
      
      setEditingCellValue(originalValue);
      setEditingCell(null);
      
      // Remove from pending changes
      setPendingChanges(prev => {
        const newChanges = {
          poses: new Map(prev.poses),
          variations: new Map(prev.variations),
          cues: new Map(prev.cues),
        };
        
        if (type === 'pose') {
          newChanges.poses.delete(id);
        } else if (type === 'variation') {
          newChanges.variations.delete(id);
        } else if (type === 'cue' && cueNum) {
          const existingCueChanges = newChanges.cues.get(id);
          if (existingCueChanges) {
            delete existingCueChanges[`cue${cueNum}` as 'cue1' | 'cue2' | 'cue3'];
            if (Object.keys(existingCueChanges).length === 0) {
              newChanges.cues.delete(id);
            } else {
              newChanges.cues.set(id, existingCueChanges);
            }
          }
        } else if (type === 'breath') {
          const existingCueChanges = newChanges.cues.get(id);
          if (existingCueChanges) {
            const updatedCueChanges: { cue1?: string | null; cue2?: string | null; cue3?: string | null; breathTransition?: string | null } = { ...existingCueChanges };
            delete updatedCueChanges.breathTransition;
            if (Object.keys(updatedCueChanges).length === 0) {
              newChanges.cues.delete(id);
            } else {
              newChanges.cues.set(id, updatedCueChanges);
            }
          }
        }
        
        return newChanges;
      });
    }
  };

  const handleSaveAllChanges = async () => {
    try {
      // Save all pose name changes
      for (const [poseId, newName] of pendingChanges.poses.entries()) {
        await onUpdatePoseName(poseId, newName);
      }
      
      // Save all variation name changes
      for (const [variationId, newName] of pendingChanges.variations.entries()) {
        await onUpdateVariationName(variationId, newName);
      }
      
      // Save all cue changes
      if (onUpdateVariationCues) {
        for (const [variationId, cueChanges] of pendingChanges.cues.entries()) {
          await onUpdateVariationCues(variationId, cueChanges);
        }
      }
      
      // Clear pending changes
      setPendingChanges({ poses: new Map(), variations: new Map(), cues: new Map() });
      setShowUnsavedWarning(false);
      
      // If there was a pending navigation, execute it
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save some changes. Please try again.');
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges({ poses: new Map(), variations: new Map(), cues: new Map() });
    setEditingCell(null);
    setEditingCellValue('');
    setShowUnsavedWarning(false);
    
    // If there was a pending navigation, execute it
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleViewModeChange = (value: string) => {
    if (hasUnsavedChanges && value !== viewMode) {
      setPendingNavigation(() => () => setViewMode(value as 'grid' | 'table'));
      setShowUnsavedWarning(true);
    } else {
      setViewMode(value as 'grid' | 'table');
    }
  };


  const handleAddPose = () => {
    if (!newPoseName.trim()) return;
    if (!hasManagementAccess || !user) {
      alert('You do not have permission to create poses.');
      return;
    }

    const poseId = generateUUID();
    const variationId = generateUUID();

    const newPose: Pose = {
      id: poseId,
      name: newPoseName.trim(),
      authorId: user.id,
    };

    const defaultVariation: PoseVariation = {
      id: variationId,
      poseId: poseId,
      name: `${newPoseName.trim()} (Default)`,
      isDefault: true,
      authorId: user.id,
    };

    onAddPose(newPose, defaultVariation);
    setNewPoseName('');
    setIsAddPoseOpen(false);
  };

  const handleAddVariation = async () => {
    if (!newVariationName.trim() || !selectedPoseForVariation) return;
    if (!hasManagementAccess || !user) {
      alert('You do not have permission to create pose variations.');
      return;
    }

    // Check if user can add variation to this pose
    const pose = poses.find(p => p.id === selectedPoseForVariation);
    if (!pose) return;
    
    // User must own the pose OR have update_all permission
    const canAddVariation = isOwnedByUser(pose) || hasUpdateAllAccess;
    if (!canAddVariation) {
      alert('You can only add variations to poses that you created.');
      return;
    }

    const newVariation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'> = {
      poseId: selectedPoseForVariation,
      name: newVariationName.trim(),
      isDefault: false,
      authorId: user.id,
    };

    // Get file before creating variation
    const fileInput = fileInputRef.current[`add-${selectedPoseForVariation}`];
    const file = fileInput?.files?.[0];
    
    // Create variation first and get the created variation with its ID
    const createdVariation = await onAddVariation(newVariation);
    
    // Handle image upload if file was selected
    if (file && onUploadVariationImage) {
      try {
        setUploadingImage(createdVariation.id);
        await onUploadVariationImage(createdVariation.id, file);
        // Small delay to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 100));
        // Reset file input and preview
        if (fileInput) {
          fileInput.value = '';
          setImagePreview(prev => {
            const newPrev = { ...prev };
            delete newPrev[`add-${selectedPoseForVariation}`];
            return newPrev;
          });
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(null);
      }
    }
    
    setNewVariationName('');
    setIsAddVariationOpen(false);
    setSelectedPoseForVariation(null);
  };

  const getVariationsForPose = (poseId: string) => {
    return variations.filter(v => v.poseId === poseId);
  };

  const handleEditPoseName = (poseId: string) => {
    if (!editedPoseName.trim()) return;
    const pose = poses.find(p => p.id === poseId);
    if (!pose) return;
    
    if (!canManagePose(pose)) {
      alert('You can only edit poses that you created.');
      setEditingPoseId(null);
      setEditedPoseName('');
      return;
    }
    
    onUpdatePoseName(poseId, editedPoseName.trim());
    setEditingPoseId(null);
    setEditedPoseName('');
  };

  const handleEditVariationName = async (variationId: string) => {
    if (!editedVariationName.trim()) return;
    
    const variation = variations.find(v => v.id === variationId);
    if (!variation) return;
    
    if (!canManageVariation(variation)) {
      alert('You can only edit variations that you created.');
      setEditingVariationId(null);
      setEditedVariationName('');
      return;
    }
    
    // Handle image upload first if file was selected
    const fileInput = fileInputRef.current[`edit-${variationId}`];
    const hasImageUpload = fileInput?.files?.[0] && onUploadVariationImage;
    
    if (hasImageUpload) {
      try {
        setUploadingImage(variationId);
        await onUploadVariationImage(variationId, fileInput.files[0]);
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 300));
        // Reset file input and preview
        if (fileInput) {
          fileInput.value = '';
          setImagePreview(prev => {
            const newPrev = { ...prev };
            delete newPrev[`edit-${variationId}`];
            return newPrev;
          });
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        // Don't close dialog on error, let user try again
        setUploadingImage(null);
        return;
      } finally {
        setUploadingImage(null);
      }
    }
    
    // Update name if it changed
    // The handler will reload from database first to preserve imageUrl
    const currentVariation = variations.find(v => v.id === variationId);
    if (editedVariationName.trim() !== currentVariation?.name) {
      await onUpdateVariationName(variationId, editedVariationName.trim());
    }
    
    setEditingVariationId(null);
    setEditedVariationName('');
  };

  const handleImageFileChange = (variationId: string, inputKey: string, file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(prev => ({
          ...prev,
          [inputKey]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(prev => {
        const newPrev = { ...prev };
        delete newPrev[inputKey];
        return newPrev;
      });
    }
  };

  const handleDeleteImage = async (variationId: string, imageUrl: string) => {
    if (!onDeleteVariationImage) return;
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      setDeletingImage(variationId);
      await onDeleteVariationImage(variationId, imageUrl);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    } finally {
      setDeletingImage(null);
    }
  };

  const filteredPoses = poses.filter(pose => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    // Check if pose name matches
    if (pose.name.toLowerCase().includes(query)) return true;
    
    // Check if any variation name matches
    const poseVariations = getVariationsForPose(pose.id);
    return poseVariations.some(v => v.name.toLowerCase().includes(query));
  });

  const getDefaultVariation = (poseId: string) => {
    return variations.find(v => v.poseId === poseId && v.isDefault) || variations.find(v => v.poseId === poseId);
  };

  // Helper functions to check if user can manage poses/variations
  const canManagePose = (pose: Pose): boolean => {
    if (!user || !hasManagementAccess) return false;
    // If user has update_all permission, they can manage any pose
    if (hasUpdateAllAccess) return true;
    return pose.authorId === user.id;
  };

  const canManageVariation = (variation: PoseVariation): boolean => {
    if (!user || !hasManagementAccess) return false;
    // If user has update_all permission, they can manage any variation
    if (hasUpdateAllAccess) return true;
    return variation.authorId === user.id;
  };

  // Helper functions to check if user actually owns the pose/variation
  const isOwnedByUser = (pose: Pose): boolean => {
    if (!user) return false;
    return pose.authorId === user.id;
  };

  const isVariationOwnedByUser = (variation: PoseVariation): boolean => {
    if (!user) return false;
    return variation.authorId === user.id;
  };

  // Helper functions to check if user can delete poses/variations
  // Delete requires ownership OR delete_all permission
  // Note: Other rules (like can't delete default variation) are still enforced
  const canDeletePose = (pose: Pose): boolean => {
    if (!user || !hasManagementAccess) return false;
    // Owners can delete, or users with delete_all permission
    return pose.authorId === user.id || hasDeleteAllAccess;
  };

  const canDeleteVariation = (variation: PoseVariation): boolean => {
    if (!user || !hasManagementAccess) return false;
    // Owners can delete, or users with delete_all permission
    // Note: Default variation check is handled separately in the disabled prop
    return variation.authorId === user.id || hasDeleteAllAccess;
  };

  // Check permissions - show access denied if user doesn't have permission
  if (permissionLoading) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center min-h-[400px]`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center min-h-[400px]`}>
        <Card className={`${isMobile ? 'w-full' : 'w-full max-w-md'} p-6`}>
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold">Authentication Required</h2>
            <p className="text-sm text-muted-foreground">
              Please sign in to access the Pose Library.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!hasLibraryAccess) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center min-h-[400px]`}>
        <Card className={`${isMobile ? 'w-full' : 'w-full max-w-md'} p-6`}>
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You don't have permission to access the Pose Library.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-0' : 'p-4'} ${viewMode === 'table' ? 'flex flex-col h-[calc(100vh-200px)] overflow-hidden' : 'space-y-4'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'} ${viewMode === 'table' ? 'flex-shrink-0 mb-4' : ''}`}>
        <h2 className={`${isMobile ? 'text-lg font-semibold' : 'text-xl font-semibold'}`}>Pose Library</h2>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && handleViewModeChange(value)}>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid3x3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view">
                <TableIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
          {viewMode === 'table' && hasUnsavedChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveAllChanges}
              className="ml-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes ({pendingChanges.poses.size + pendingChanges.variations.size + pendingChanges.cues.size})
            </Button>
          )}
          <Dialog open={isAddPoseOpen} onOpenChange={setIsAddPoseOpen}>
            <DialogTrigger asChild>
              <Button 
                className={isMobile ? 'w-full' : ''}
                disabled={!hasManagementAccess}
                title={!hasManagementAccess ? "You do not have permission to create poses" : "Add new pose"}
              >
                <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                Add Pose
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Pose</DialogTitle>
              <DialogDescription>
                Create a new pose. A default variation will be created automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pose-name">Pose Name</Label>
                <Input
                  id="pose-name"
                  placeholder="Enter pose name"
                  value={newPoseName}
                  onChange={(e) => setNewPoseName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPose()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPose}>Add Pose</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className={`relative ${viewMode === 'table' ? 'flex-shrink-0 mb-4' : ''}`}>
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
        <Input
          placeholder="Search poses and variations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${isMobile ? 'pl-8 h-8' : 'pl-9'}`}
        />
      </div>

      {/* Grid of pose cards */}
      {viewMode === 'grid' || isMobile ? (
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
        {filteredPoses.map(pose => {
          const poseVariations = getVariationsForPose(pose.id);
          const defaultVariation = getDefaultVariation(pose.id);
          
          return (
            <Dialog
              key={pose.id}
              open={selectedPoseForDetails === pose.id}
              onOpenChange={(open) => {
                setSelectedPoseForDetails(open ? pose.id : null);
                if (open && defaultVariation) {
                  setSelectedVariationId(defaultVariation.id);
                } else {
                  setSelectedVariationId(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Card className={`cursor-pointer hover:shadow-lg transition-shadow overflow-hidden ${isOwnedByUser(pose) ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}>
                  <div className="relative bg-muted flex items-center justify-center" style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                    {defaultVariation?.imageUrl ? (
                      <ImageWithFallback
                        src={defaultVariation.imageUrl}
                        alt={pose.name}
                        className="object-contain"
                        style={{ maxWidth: '200px', maxHeight: '200px', width: 'auto', height: 'auto' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-16 w-16" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <CardTitle className="text-base mb-1 flex items-center gap-2">
                      {pose.name}
                      {isOwnedByUser(pose) && (
                        <Badge variant="outline" className="text-xs border-primary/50 text-primary flex items-center justify-center p-1">
                          <User className="h-3 w-3" />
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {poseVariations.length} variant{poseVariations.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden" style={{ height: '90vh' }}>
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-2xl flex items-center gap-2">
                        {pose.name}
                        {isOwnedByUser(pose) && (
                          <Badge variant="outline" className="border-primary/50 text-primary flex items-center justify-center p-1">
                            <User className="h-3 w-3" />
                          </Badge>
                        )}
                      </DialogTitle>
                      <DialogDescription className="mt-1 flex items-center gap-1">
                        <span>{poseVariations.length} variation{poseVariations.length !== 1 ? 's' : ''}</span>
                        <ChevronDown className="h-3 w-3" />
                      </DialogDescription>
                    </div>
                    <div className="flex gap-2 pr-8">
                      <Dialog 
                        open={editingPoseId === pose.id} 
                        onOpenChange={(open) => {
                          if (open && !canManagePose(pose)) {
                            alert('You can only edit poses that you created.');
                            return;
                          }
                          setEditingPoseId(open ? pose.id : null);
                          if (open) setEditedPoseName(pose.name);
                          else setEditedPoseName('');
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={!canManagePose(pose)}
                            title={!canManagePose(pose) ? "You can only edit poses that you created" : "Edit pose name"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Pose Name</DialogTitle>
                            <DialogDescription>
                              Update the name of this pose.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-pose-name">Pose Name</Label>
                              <Input
                                id="edit-pose-name"
                                placeholder="Enter pose name"
                                value={editedPoseName}
                                onChange={(e) => setEditedPoseName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleEditPoseName(pose.id)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => handleEditPoseName(pose.id)}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!canDeletePose(pose)) {
                            alert('You can only delete poses that you created.');
                            return;
                          }
                          if (poseVariations.length > 0 && !confirm(`Are you sure you want to delete "${pose.name}"? This will also delete all its variations.`)) {
                            return;
                          }
                          onDeletePose(pose.id);
                        }}
                        disabled={poseVariations.length === 0 || !canDeletePose(pose)}
                        title={!canDeletePose(pose) ? "You can only delete poses that you created" : "Delete pose"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                
                {/* Selected Variation Image Display */}
                {(() => {
                  const displayedVariation = selectedVariationId 
                    ? poseVariations.find(v => v.id === selectedVariationId) 
                    : defaultVariation;
                  
                  return displayedVariation && !isMobile ? (
                    <div className="px-6 pb-6 flex-shrink-0">
                      <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center" style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                        {displayedVariation.imageUrl ? (
                          <ImageWithFallback
                            src={displayedVariation.imageUrl}
                            alt={displayedVariation.name}
                            className="object-contain"
                            style={{ maxWidth: '200px', maxHeight: '200px', width: 'auto', height: 'auto' }}
                          />
                        ) : (
                          <div className="flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-16 w-16" />
                          </div>
                        )}
                      </div>
                      <p className="text-center text-sm font-medium mt-2">
                        {displayedVariation.name}
                      </p>
                    </div>
                  ) : null;
                })()}

                {/* Variations List - Scrollable */}
                <div className="px-6 pt-2 overflow-y-auto flex-1 min-h-0 max-h-full relative">
                  <div className="space-y-2 pb-2">
                  {poseVariations.map(variation => (
                    <Card 
                      key={variation.id} 
                      className={`group relative overflow-hidden transition-all hover:bg-muted/50 ${
                        editingVariationId === variation.id ? '' : 'cursor-pointer'
                      } ${
                        selectedVariationId === variation.id ? 'bg-muted border-primary' : ''
                      }`}
                      onMouseEnter={() => setHoveredVariationId(variation.id)}
                      onMouseLeave={() => setHoveredVariationId(null)}
                      onClick={() => {
                        if (editingVariationId !== variation.id) {
                          setSelectedVariationId(variation.id);
                        }
                      }}
                    >
                      <div className={`flex items-center gap-4 p-3 min-h-[60px] ${isMobile && editingVariationId === variation.id ? 'flex-col items-stretch landscape:flex-row landscape:items-center' : ''}`}>
                        {/* Hidden Image Preview - shown on hover */}
                        <div className="relative bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-200" 
                             style={{ 
                               width: hoveredVariationId === variation.id && variation.imageUrl ? '60px' : '0px', 
                               height: '60px',
                               opacity: hoveredVariationId === variation.id && variation.imageUrl ? 1 : 0,
                               marginRight: hoveredVariationId === variation.id && variation.imageUrl ? '0px' : '0px'
                             }}>
                          {variation.imageUrl && (
                            <ImageWithFallback
                              src={variation.imageUrl}
                              alt={variation.name}
                              className="object-contain"
                              style={{ maxWidth: '60px', maxHeight: '60px', width: 'auto', height: 'auto' }}
                            />
                          )}
                        </div>

                        {/* Variation Name or Inline Edit */}
                        <div className="flex-1 min-w-0" onClick={(e) => {
                          if (editingVariationId === variation.id) {
                            e.stopPropagation();
                          }
                        }}>
                          {editingVariationId === variation.id ? (
                            <div className="space-y-2 w-full">
                              <Input
                                value={editedVariationName}
                                onChange={(e) => setEditedVariationName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditVariationName(variation.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingVariationId(null);
                                    setEditedVariationName('');
                                  }
                                }}
                                className={`${isMobile ? 'h-10 text-base landscape:h-8 landscape:text-sm' : 'h-8 text-sm'} w-full`}
                                autoFocus
                              />
                              {onUploadVariationImage && (
                                <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap landscape:flex-nowrap' : ''}`}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    ref={(el) => {
                                      fileInputRef.current[`edit-${variation.id}`] = el;
                                    }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      handleImageFileChange(variation.id, `edit-${variation.id}`, file);
                                    }}
                                    className="hidden"
                                    style={{ display: 'none' }}
                                    id={`file-input-${variation.id}`}
                                  />
                                  {(imagePreview[`edit-${variation.id}`] || variation.imageUrl) ? (
                                    <div className={`relative flex items-center gap-2 ${isMobile ? 'flex-wrap w-full landscape:flex-nowrap landscape:w-auto' : ''}`}>
                                      <div className={`${isMobile ? 'w-16 h-16 landscape:w-12 landscape:h-12' : 'w-12 h-12'} rounded overflow-hidden border flex-shrink-0`}>
                                        <ImageWithFallback
                                          src={imagePreview[`edit-${variation.id}`] || variation.imageUrl || ''}
                                          alt={variation.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={isMobile ? 'h-10 text-sm flex-1 landscape:h-8 landscape:text-xs landscape:flex-none' : 'h-8 text-xs'}
                                        onClick={() => {
                                          const fileInput = fileInputRef.current[`edit-${variation.id}`];
                                          fileInput?.click();
                                        }}
                                      >
                                        Change
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => {
                                          if (imagePreview[`edit-${variation.id}`]) {
                                            // Clear preview
                                            setImagePreview(prev => {
                                              const newPrev = { ...prev };
                                              delete newPrev[`edit-${variation.id}`];
                                              return newPrev;
                                            });
                                            const fileInput = fileInputRef.current[`edit-${variation.id}`];
                                            if (fileInput) fileInput.value = '';
                                          } else if (variation.imageUrl && onDeleteVariationImage) {
                                            // Delete existing image
                                            handleDeleteImage(variation.id, variation.imageUrl!);
                                          }
                                        }}
                                        disabled={deletingImage === variation.id || uploadingImage === variation.id}
                                        className={isMobile ? 'h-10 w-10 landscape:h-7 landscape:w-7' : 'h-7 w-7'}
                                      >
                                        <X className={isMobile ? 'h-4 w-4 landscape:h-3 landscape:w-3' : 'h-3 w-3'} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className={isMobile ? 'h-10 text-sm w-full landscape:h-8 landscape:text-xs landscape:w-auto' : 'h-8 text-xs'}
                                      onClick={() => {
                                        const fileInput = fileInputRef.current[`edit-${variation.id}`];
                                        fileInput?.click();
                                      }}
                                    >
                                      <Upload className={`${isMobile ? 'h-4 w-4 landscape:h-3 landscape:w-3' : 'h-3 w-3'} mr-1.5`} />
                                      Upload
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CardTitle className={`text-sm ${variation.isDefault ? 'font-semibold' : 'font-medium'}`}>
                                {variation.name}
                              </CardTitle>
                              {variation.isDefault && (
                                <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                                  Default
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile && editingVariationId === variation.id ? 'flex-col w-full mt-2 landscape:flex-row landscape:w-auto landscape:mt-0' : ''}`} onClick={(e) => e.stopPropagation()}>
                          {editingVariationId === variation.id ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleEditVariationName(variation.id)}
                                disabled={uploadingImage === variation.id || !editedVariationName.trim()}
                                className={isMobile ? 'h-10 text-sm w-full landscape:h-8 landscape:text-xs landscape:w-auto' : 'h-8 text-xs'}
                              >
                                {uploadingImage === variation.id ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingVariationId(null);
                                  setEditedVariationName('');
                                  setImagePreview(prev => {
                                    const newPrev = { ...prev };
                                    delete newPrev[`edit-${variation.id}`];
                                    return newPrev;
                                  });
                                  const fileInput = fileInputRef.current[`edit-${variation.id}`];
                                  if (fileInput) fileInput.value = '';
                                }}
                                className={isMobile ? 'h-10 text-sm w-full landscape:h-8 landscape:text-xs landscape:w-auto' : 'h-8 text-xs'}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              {!variation.isDefault && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!hasManagementAccess || !user) {
                                      alert('You do not have permission to set default variations.');
                                      return;
                                    }
                                    if (!canManagePose(pose) && !canManageVariation(variation)) {
                                      alert('You can only set default variations for poses or variations that you created.');
                                      return;
                                    }
                                    onSetDefaultVariation(pose.id, variation.id);
                                  }}
                                  disabled={!hasManagementAccess || (!canManagePose(pose) && !canManageVariation(variation))}
                                  title={!hasManagementAccess ? "You do not have permission to set default variations" : (!canManagePose(pose) && !canManageVariation(variation)) ? "You can only set default variations for poses or variations that you created" : "Mark as default variation"}
                                  className="h-8 text-xs whitespace-nowrap"
                                >
                                  Mark Default
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canManageVariation(variation)) {
                                    alert('You can only edit variations that you created.');
                                    return;
                                  }
                                  setEditingVariationId(variation.id);
                                  setEditedVariationName(variation.name);
                                }}
                                disabled={!canManageVariation(variation)}
                                title={!canManageVariation(variation) ? "You can only edit variations that you created" : "Edit variation"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canDeleteVariation(variation)) {
                                    alert('You can only delete variations that you created.');
                                    return;
                                  }
                                  if (!confirm(`Are you sure you want to delete "${variation.name}"?`)) {
                                    return;
                                  }
                                  onDeleteVariation(variation.id);
                                }}
                                disabled={variation.isDefault || !canDeleteVariation(variation)}
                                title={!canDeleteVariation(variation) ? "You can only delete variations that you created" : variation.isDefault ? "Cannot delete default variation" : "Delete variation"}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  </div>
                </div>

                {/* Add Variation Button - Fixed at bottom */}
                <div className="px-6 pb-6 pt-6 border-t flex-shrink-0">
                  <Dialog 
                    open={isAddVariationOpen && selectedPoseForVariation === pose.id}
                    onOpenChange={(open) => {
                      setIsAddVariationOpen(open);
                      if (!open) setSelectedPoseForVariation(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (!hasManagementAccess || !user) {
                            alert('You do not have permission to create pose variations.');
                            return;
                          }
                          if (!isOwnedByUser(pose) && !hasUpdateAllAccess) {
                            alert('You can only add variations to poses that you created.');
                            return;
                          }
                          setSelectedPoseForVariation(pose.id);
                        }}
                        disabled={!hasManagementAccess || (!isOwnedByUser(pose) && !hasUpdateAllAccess)}
                        title={!hasManagementAccess ? "You do not have permission to create pose variations" : (!isOwnedByUser(pose) && !hasUpdateAllAccess) ? "You can only add variations to poses that you created" : "Add new variation"}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Add Variation
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Variation for {pose.name}</DialogTitle>
                      <DialogDescription>
                        Create a new variation for this pose. You can optionally add an image.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="variation-name">Variation Name</Label>
                        <Input
                          id="variation-name"
                          placeholder="Enter variation name"
                          value={newVariationName}
                          onChange={(e) => setNewVariationName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddVariation()}
                        />
                      </div>
                      {onUploadVariationImage && (
                        <div className="space-y-2">
                          <Label>Image (Optional)</Label>
                          <div className="flex items-center gap-2">
                            <input
                              id={`add-image-${pose.id}`}
                              type="file"
                              accept="image/*"
                              ref={(el) => {
                                fileInputRef.current[`add-${pose.id}`] = el;
                              }}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleImageFileChange(pose.id, `add-${pose.id}`, file);
                              }}
                              className="hidden"
                              style={{ display: 'none' }}
                            />
                            {imagePreview[`add-${pose.id}`] ? (
                              <div className="relative flex items-center gap-2">
                                <div className="w-12 h-12 rounded overflow-hidden border flex-shrink-0">
                                  <ImageWithFallback
                                    src={imagePreview[`add-${pose.id}`]}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const fileInput = fileInputRef.current[`add-${pose.id}`];
                                    fileInput?.click();
                                  }}
                                >
                                  Change
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => {
                                    setImagePreview(prev => {
                                      const newPrev = { ...prev };
                                      delete newPrev[`add-${pose.id}`];
                                      return newPrev;
                                    });
                                    const fileInput = fileInputRef.current[`add-${pose.id}`];
                                    if (fileInput) fileInput.value = '';
                                  }}
                                  className="h-7 w-7"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const fileInput = fileInputRef.current[`add-${pose.id}`];
                                  fileInput?.click();
                                }}
                              >
                                <Upload className="h-3 w-3 mr-1.5" />
                                Upload
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Upload an image for this variation
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleAddVariation}
                        disabled={uploadingImage !== null}
                      >
                        {uploadingImage ? 'Adding...' : 'Add Variation'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
      ) : (
        /* Table view - Spreadsheet style */
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1" style={{ minWidth: 0 }}>
          <Table style={{ minWidth: '1000px', width: 'max-content' }}>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="w-[200px] font-semibold border-r bg-muted/50">Pose</TableHead>
                <TableHead className="w-[200px] font-semibold border-r bg-muted/50">Variation</TableHead>
                <TableHead className="w-[150px] font-semibold border-r bg-muted/50">Cue 1</TableHead>
                <TableHead className="w-[150px] font-semibold border-r bg-muted/50">Cue 2</TableHead>
                <TableHead className="w-[150px] font-semibold border-r bg-muted/50">Cue 3</TableHead>
                <TableHead className="w-[150px] font-semibold border-r bg-muted/50">Breath / Transition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPoses.flatMap(pose => {
                const poseVariations = getVariationsForPose(pose.id);
                const defaultVariation = getDefaultVariation(pose.id);
                const posePendingName = pendingChanges.poses.get(pose.id);
                const displayPoseName = posePendingName || pose.name;
                const isEditingPose = editingCell?.type === 'pose' && editingCell.id === pose.id;
                
                if (poseVariations.length === 0) {
                  return (
                    <TableRow key={pose.id} className={`border-b hover:bg-muted/30 ${isOwnedByUser(pose) ? 'bg-primary/5' : ''}`}>
                      <TableCell 
                        className={`font-medium border-r align-middle cursor-text ${
                          isEditingPose 
                            ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                            : posePendingName 
                              ? 'bg-primary/5 border-primary/30' 
                              : ''
                        }`}
                        onClick={() => handleCellClick('pose', pose.id, displayPoseName)}
                      >
                        {isEditingPose ? (
                          <Input
                            value={editingCellValue}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 text-sm font-medium border-primary/50 focus-visible:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {posePendingName && (
                              <Pencil className="h-3 w-3 text-primary" />
                            )}
                            <span className={posePendingName ? 'text-primary' : ''}>
                              {displayPoseName}
                            </span>
                            {isOwnedByUser(pose) && (
                              <Badge variant="outline" className="text-xs border-primary/50 text-primary flex items-center justify-center p-1">
                                <User className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground italic">No variations</TableCell>
                      <TableCell className="border-r">-</TableCell>
                      <TableCell className="border-r">-</TableCell>
                      <TableCell className="border-r">-</TableCell>
                      <TableCell className="border-r">-</TableCell>
                    </TableRow>
                  );
                }
                
                return poseVariations.map((variation, idx) => {
                  const variationPendingName = pendingChanges.variations.get(variation.id);
                  const displayVariationName = variationPendingName || variation.name;
                  const isEditingVariation = editingCell?.type === 'variation' && editingCell.id === variation.id;
                  
                  const cueChanges = pendingChanges.cues.get(variation.id);
                  const displayCue1 = cueChanges?.cue1 !== undefined ? cueChanges.cue1 : (variation.cue1 ?? '');
                  const displayCue2 = cueChanges?.cue2 !== undefined ? cueChanges.cue2 : (variation.cue2 ?? '');
                  const displayCue3 = cueChanges?.cue3 !== undefined ? cueChanges.cue3 : (variation.cue3 ?? '');
                  const displayBreathTransition = cueChanges?.breathTransition !== undefined ? cueChanges.breathTransition : (variation.breathTransition ?? '');
                  const isEditingCue1 = editingCell?.type === 'cue' && editingCell.id === variation.id && editingCell.cueNum === 1;
                  const isEditingCue2 = editingCell?.type === 'cue' && editingCell.id === variation.id && editingCell.cueNum === 2;
                  const isEditingCue3 = editingCell?.type === 'cue' && editingCell.id === variation.id && editingCell.cueNum === 3;
                  const isEditingBreath = editingCell?.type === 'breath' && editingCell.id === variation.id;
                  const hasCue1Change = cueChanges?.cue1 !== undefined;
                  const hasCue2Change = cueChanges?.cue2 !== undefined;
                  const hasCue3Change = cueChanges?.cue3 !== undefined;
                  const hasBreathChange = cueChanges?.breathTransition !== undefined;
                  
                  return (
                    <TableRow 
                      key={`${pose.id}-${variation.id}`} 
                      className={`border-b hover:bg-muted/30 ${isOwnedByUser(pose) ? 'bg-primary/5' : ''}`}
                    >
                      {idx === 0 && (
                        <TableCell 
                          className={`font-medium border-r align-middle cursor-text ${
                            isEditingPose 
                              ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                              : posePendingName 
                                ? 'bg-primary/5 border-primary/30' 
                                : ''
                          }`}
                          rowSpan={poseVariations.length}
                          onClick={() => handleCellClick('pose', pose.id, displayPoseName)}
                        >
                          {isEditingPose ? (
                            <Input
                              value={editingCellValue}
                              onChange={(e) => setEditingCellValue(e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={handleCellKeyDown}
                              className="h-7 text-sm font-medium border-primary/50 focus-visible:ring-primary"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {posePendingName && (
                                <Pencil className="h-3 w-3 text-primary" />
                              )}
                              <span className={posePendingName ? 'text-primary' : ''}>
                                {displayPoseName}
                              </span>
                              {isOwnedByUser(pose) && (
                                <Badge variant="outline" className="text-xs border-primary/50 text-primary flex items-center justify-center p-1">
                                  <User className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                      <TableCell 
                        className={`border-r cursor-text ${
                          isEditingVariation 
                            ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                            : variationPendingName 
                              ? 'bg-primary/5 border-primary/30' 
                              : ''
                        }`}
                        onClick={() => handleCellClick('variation', variation.id, displayVariationName)}
                      >
                        {isEditingVariation ? (
                          <Input
                            value={editingCellValue}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className={`h-7 text-sm ${variation.isDefault ? 'font-semibold' : ''} border-primary/50 focus-visible:ring-primary`}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {variationPendingName && (
                              <Pencil className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <span className={`text-sm ${variation.isDefault ? 'font-semibold' : ''} ${variationPendingName ? 'text-primary' : ''}`}>
                              {displayVariationName}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell 
                        className={`border-r cursor-text ${
                          isEditingCue1 
                            ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                            : hasCue1Change 
                              ? 'bg-primary/5 border-primary/30' 
                              : ''
                        }`}
                        onClick={() => handleCellClick('cue', variation.id, displayCue1, 1)}
                      >
                        {isEditingCue1 ? (
                          <Input
                            value={editingCellValue ?? ''}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 text-sm border-primary/50 focus-visible:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {hasCue1Change && (
                              <Pencil className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <span className={`text-sm ${hasCue1Change ? 'text-primary' : ''}`}>
                              {displayCue1 && displayCue1.trim() ? displayCue1 : '-'}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell 
                        className={`border-r cursor-text ${
                          isEditingCue2 
                            ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                            : hasCue2Change 
                              ? 'bg-primary/5 border-primary/30' 
                              : ''
                        }`}
                        onClick={() => handleCellClick('cue', variation.id, displayCue2, 2)}
                      >
                        {isEditingCue2 ? (
                          <Input
                            value={editingCellValue ?? ''}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 text-sm border-primary/50 focus-visible:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {hasCue2Change && (
                              <Pencil className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <span className={`text-sm ${hasCue2Change ? 'text-primary' : ''}`}>
                              {displayCue2 && displayCue2.trim() ? displayCue2 : '-'}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell 
                        className={`border-r cursor-text ${
                          isEditingCue3 
                            ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                            : hasCue3Change 
                              ? 'bg-primary/5 border-primary/30' 
                              : ''
                        }`}
                        onClick={() => handleCellClick('cue', variation.id, displayCue3, 3)}
                      >
                        {isEditingCue3 ? (
                          <Input
                            value={editingCellValue ?? ''}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 text-sm border-primary/50 focus-visible:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {hasCue3Change && (
                              <Pencil className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <span className={`text-sm ${hasCue3Change ? 'text-primary' : ''}`}>
                              {displayCue3 && displayCue3.trim() ? displayCue3 : '-'}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell 
                        className={`border-r cursor-text ${
                          isEditingBreath 
                            ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                            : hasBreathChange 
                              ? 'bg-primary/5 border-primary/30' 
                              : ''
                        }`}
                        onClick={() => handleCellClick('breath', variation.id, displayBreathTransition)}
                      >
                        {isEditingBreath ? (
                          <Input
                            value={editingCellValue ?? ''}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 text-sm border-primary/50 focus-visible:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {hasBreathChange && (
                              <Pencil className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <span className={`text-sm ${hasBreathChange ? 'text-primary' : ''}`}>
                              {displayBreathTransition && displayBreathTransition.trim() ? displayBreathTransition : '-'}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Unsaved changes warning dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={(open) => {
        if (!open) {
          // User closed dialog without choosing - cancel navigation
          setShowUnsavedWarning(false);
          setPendingNavigation(null);
        } else {
          setShowUnsavedWarning(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before continuing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardChanges}>Discard Changes</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAllChanges}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {poses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No poses yet. Add your first pose to get started.</p>
        </div>
      )}

      {poses.length > 0 && filteredPoses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No poses or variations match your search.</p>
        </div>
      )}
    </div>
  );
}
