import React, { useState } from 'react';
import { PoseInstance, PoseVariation, Pose } from '../types';
import { Button } from './ui/button';
import { GripVertical, Trash2, Clock, Edit } from 'lucide-react';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

interface PoseInstanceViewProps {
  poseInstance: PoseInstance;
  poses: Pose[];
  variations: PoseVariation[];
  onDelete: () => void;
  onUpdate?: (updatedInstance: PoseInstance) => void;
  dragHandleProps?: any;
}

export function PoseInstanceView({
  poseInstance,
  poses,
  variations,
  onDelete,
  onUpdate,
  dragHandleProps,
}: PoseInstanceViewProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editedVariationId, setEditedVariationId] = useState(poseInstance.poseVariationId);
  const [editedDuration, setEditedDuration] = useState(poseInstance.duration);

  const variation = variations.find(v => v.id === poseInstance.poseVariationId);
  const pose = variation ? poses.find(p => p.id === variation.poseId) : null;

  const editVariation = variations.find(v => v.id === editedVariationId);
  const editPose = editVariation ? poses.find(p => p.id === editVariation.poseId) : null;
  const poseVariations = editPose ? variations.filter(v => v.poseId === editPose.id) : [];

  const handleEdit = () => {
    if (!onUpdate || !editedVariationId || !editedDuration.trim()) return;

    const updatedInstance: PoseInstance = {
      ...poseInstance,
      poseVariationId: editedVariationId,
      duration: editedDuration.trim(),
    };

    onUpdate(updatedInstance);
    setIsEditOpen(false);
  };

  const handleOpenEdit = () => {
    setEditedVariationId(poseInstance.poseVariationId);
    setEditedDuration(poseInstance.duration);
    setIsEditOpen(true);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (dragHandleProps?.onDragStart) {
      dragHandleProps.onDragStart(e);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-card border rounded-md">
      <div 
        {...dragHandleProps} 
        className="cursor-move text-muted-foreground"
        onDragStart={handleDragStart}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Pose</Badge>
          <span className="text-sm">{pose?.name || 'Unknown Pose'}</span>
        </div>
        {variation && !variation.name.includes('(Default)') && (
          <p className="text-xs text-muted-foreground mt-1">{variation.name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3 w-3" />
        {poseInstance.duration}
      </div>
      
      {onUpdate && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenEdit}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pose Instance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pose-name">Pose</Label>
                <Input
                  id="edit-pose-name"
                  value={editPose?.name || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  To change the pose, delete this instance and add a new one.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-variation">Variation</Label>
                <Select value={editedVariationId} onValueChange={setEditedVariationId}>
                  <SelectTrigger id="edit-variation">
                    <SelectValue placeholder="Choose a variation" />
                  </SelectTrigger>
                  <SelectContent>
                    {poseVariations.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duration (MM:SS or HH:MM:SS)</Label>
                <Input
                  id="edit-duration"
                  placeholder="00:30"
                  value={editedDuration}
                  onChange={(e) => setEditedDuration(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleEdit} disabled={!editedVariationId || !editedDuration.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
