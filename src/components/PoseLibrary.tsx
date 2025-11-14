import React, { useState, useEffect, useRef } from 'react';
import { Pose, PoseVariation } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { Plus, Trash2, Edit, Search, Lock, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';
import { generateUUID } from '../lib/uuid';
import { ImageWithFallback } from './figma/ImageWithFallback';

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
  onUploadVariationImage?: (variationId: string, file: File) => Promise<void>;
  onDeleteVariationImage?: (variationId: string, imageUrl: string) => Promise<void>;
}

const POSE_LIBRARY_PASSWORD = 'sculptyobooty';
const POSE_LIBRARY_AUTH_KEY = 'poseLibraryAuthenticated';

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
  onUploadVariationImage,
  onDeleteVariationImage,
}: PoseLibraryProps) {
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
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
  const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Check if already authenticated on mount
  useEffect(() => {
    const authenticated = sessionStorage.getItem(POSE_LIBRARY_AUTH_KEY) === 'true';
    setIsAuthenticated(authenticated);
  }, []);

  const handlePasswordSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (password === POSE_LIBRARY_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem(POSE_LIBRARY_AUTH_KEY, 'true');
      setPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handleAddPose = () => {
    if (!newPoseName.trim()) return;

    const poseId = generateUUID();
    const variationId = generateUUID();

    const newPose: Pose = {
      id: poseId,
      name: newPoseName.trim(),
    };

    const defaultVariation: PoseVariation = {
      id: variationId,
      poseId: poseId,
      name: `${newPoseName.trim()} (Default)`,
      isDefault: true,
    };

    onAddPose(newPose, defaultVariation);
    setNewPoseName('');
    setIsAddPoseOpen(false);
  };

  const handleAddVariation = async () => {
    if (!newVariationName.trim() || !selectedPoseForVariation) return;

    const newVariation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'> = {
      poseId: selectedPoseForVariation,
      name: newVariationName.trim(),
      isDefault: false,
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
    onUpdatePoseName(poseId, editedPoseName.trim());
    setEditingPoseId(null);
    setEditedPoseName('');
  };

  const handleEditVariationName = async (variationId: string) => {
    if (!editedVariationName.trim()) return;
    
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

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center min-h-[400px]`}>
        <Card className={`${isMobile ? 'w-full' : 'w-full max-w-md'} p-6`}>
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-center">Pose Library Protected</h2>
            <p className="text-sm text-muted-foreground text-center">
              Please enter the password to access the Pose Library.
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pose-library-password">Password</Label>
                <Input
                  id="pose-library-password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  className={passwordError ? 'border-destructive' : ''}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Unlock Pose Library
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-0' : 'p-4'} space-y-4`}>
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
        <h2 className={`${isMobile ? 'text-lg font-semibold' : 'text-xl font-semibold'}`}>Pose Library</h2>
        <Dialog open={isAddPoseOpen} onOpenChange={setIsAddPoseOpen}>
          <DialogTrigger asChild>
            <Button className={isMobile ? 'w-full' : ''}>
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

      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
        <Input
          placeholder="Search poses and variations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${isMobile ? 'pl-8 h-8' : 'pl-9'}`}
        />
      </div>

      {/* Grid of pose cards */}
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
                <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden">
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
                    <CardTitle className="text-base mb-1">{pose.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {poseVariations.length} variant{poseVariations.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-2xl">{pose.name}</DialogTitle>
                      <DialogDescription className="mt-1">
                        {poseVariations.length} variation{poseVariations.length !== 1 ? 's' : ''}
                      </DialogDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog 
                        open={editingPoseId === pose.id} 
                        onOpenChange={(open) => {
                          setEditingPoseId(open ? pose.id : null);
                          if (open) setEditedPoseName(pose.name);
                          else setEditedPoseName('');
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
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
                        onClick={() => onDeletePose(pose.id)}
                        disabled={poseVariations.length === 0}
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
                  
                  return displayedVariation ? (
                    <div className="mt-6 mb-6">
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

                {/* Variations List */}
                <div className="space-y-2 mt-6">
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
                      <div className="flex items-center gap-4 p-3 min-h-[60px]">
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
                            <div className="space-y-2">
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
                                className="h-8 text-sm"
                                autoFocus
                              />
                              {onUploadVariationImage && (
                                <div className="flex items-center gap-2">
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
                                    <div className="relative flex items-center gap-2">
                                      <div className="w-12 h-12 rounded overflow-hidden border flex-shrink-0">
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
                                        className="h-8 text-xs"
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
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        const fileInput = fileInputRef.current[`edit-${variation.id}`];
                                        fileInput?.click();
                                      }}
                                    >
                                      <Upload className="h-3 w-3 mr-1.5" />
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
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {editingVariationId === variation.id ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleEditVariationName(variation.id)}
                                disabled={uploadingImage === variation.id || !editedVariationName.trim()}
                                className="h-8 text-xs"
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
                                className="h-8 text-xs"
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
                                    onSetDefaultVariation(pose.id, variation.id);
                                  }}
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
                                  setEditingVariationId(variation.id);
                                  setEditedVariationName(variation.name);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteVariation(variation.id);
                                }}
                                disabled={variation.isDefault}
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
                      className="w-full mt-4"
                      onClick={() => setSelectedPoseForVariation(pose.id)}
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
              </DialogContent>
            </Dialog>
          );
        })}
      </div>

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
