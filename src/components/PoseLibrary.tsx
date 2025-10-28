import React, { useState } from 'react';
import { Pose, PoseVariation } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { Plus, Trash2, Edit, Search } from 'lucide-react';

interface PoseLibraryProps {
  poses: Pose[];
  variations: PoseVariation[];
  onAddPose: (pose: Pose, defaultVariation: PoseVariation) => void;
  onDeletePose: (poseId: string) => void;
  onAddVariation: (variation: PoseVariation) => void;
  onDeleteVariation: (variationId: string) => void;
  onSetDefaultVariation: (poseId: string, variationId: string) => void;
  onUpdatePoseName: (poseId: string, newName: string) => void;
  onUpdateVariationName: (variationId: string, newName: string) => void;
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
}: PoseLibraryProps) {
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

  const handleAddPose = () => {
    if (!newPoseName.trim()) return;

    const poseId = `pose-${Date.now()}`;
    const variationId = `var-${Date.now()}`;

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

  const handleAddVariation = () => {
    if (!newVariationName.trim() || !selectedPoseForVariation) return;

    const newVariation: PoseVariation = {
      id: `var-${Date.now()}`,
      poseId: selectedPoseForVariation,
      name: newVariationName.trim(),
      isDefault: false,
    };

    onAddVariation(newVariation);
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

  const handleEditVariationName = (variationId: string) => {
    if (!editedVariationName.trim()) return;
    onUpdateVariationName(variationId, editedVariationName.trim());
    setEditingVariationId(null);
    setEditedVariationName('');
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2>Pose Library</h2>
        <Dialog open={isAddPoseOpen} onOpenChange={setIsAddPoseOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Pose
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Pose</DialogTitle>
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search poses and variations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {filteredPoses.map(pose => {
          const poseVariations = getVariationsForPose(pose.id);
          return (
            <Card key={pose.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="mb-1">{pose.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {poseVariations.length} variation{poseVariations.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-1">
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

              <div className="space-y-2 mb-3">
                {poseVariations.map(variation => (
                  <div key={variation.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="radio"
                        checked={variation.isDefault}
                        onChange={() => onSetDefaultVariation(pose.id, variation.id)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">{variation.name}</span>
                      {variation.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Dialog 
                        open={editingVariationId === variation.id} 
                        onOpenChange={(open) => {
                          setEditingVariationId(open ? variation.id : null);
                          if (open) setEditedVariationName(variation.name);
                          else setEditedVariationName('');
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Variation Name</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-variation-name">Variation Name</Label>
                              <Input
                                id="edit-variation-name"
                                placeholder="Enter variation name"
                                value={editedVariationName}
                                onChange={(e) => setEditedVariationName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleEditVariationName(variation.id)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => handleEditVariationName(variation.id)}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteVariation(variation.id)}
                        disabled={variation.isDefault}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
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
                    className="w-full"
                    onClick={() => setSelectedPoseForVariation(pose.id)}
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Add Variation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Variation for {pose.name}</DialogTitle>
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
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddVariation}>Add Variation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>
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
