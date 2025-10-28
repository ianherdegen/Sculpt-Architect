import React, { useState } from 'react';
import { Sequence, Section, PoseInstance, GroupBlock, Pose, PoseVariation } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SectionView } from './SectionView';
import { Plus, FolderOpen, Trash2, Edit, GripVertical, Clock } from 'lucide-react';
import { calculateSequenceDuration, formatDuration } from '../lib/timeUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface SequenceBuilderProps {
  sequences: Sequence[];
  poses: Pose[];
  variations: PoseVariation[];
  onUpdateSequences: (sequences: Sequence[]) => void;
}

export function SequenceBuilder({
  sequences,
  poses,
  variations,
  onUpdateSequences,
}: SequenceBuilderProps) {
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(
    sequences.length > 0 ? sequences[0].id : null
  );
  const [isCreateSequenceOpen, setIsCreateSequenceOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isEditSequenceOpen, setIsEditSequenceOpen] = useState(false);
  const [isDeleteSequenceOpen, setIsDeleteSequenceOpen] = useState(false);
  const [newSequenceName, setNewSequenceName] = useState('');
  const [editedSequenceName, setEditedSequenceName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const [groupBlockExpandedStates, setGroupBlockExpandedStates] = useState<Record<string, { isOpen: boolean; isBlockExpanded: boolean }>>({});

  const selectedSequence = sequences.find(s => s.id === selectedSequenceId);

  const handleCreateSequence = () => {
    if (!newSequenceName.trim()) return;

    const newSequence: Sequence = {
      id: `seq-${Date.now()}`,
      name: newSequenceName.trim(),
      sections: [],
    };

    const updatedSequences = [...sequences, newSequence];
    onUpdateSequences(updatedSequences);
    setSelectedSequenceId(newSequence.id);
    setNewSequenceName('');
    setIsCreateSequenceOpen(false);
  };

  const handleAddSection = () => {
    if (!newSectionName.trim() || !selectedSequence) return;

    const newSection: Section = {
      type: 'section',
      id: `section-${Date.now()}`,
      name: newSectionName.trim(),
      items: [],
    };

    const updatedSequence = {
      ...selectedSequence,
      sections: [...selectedSequence.sections, newSection],
    };

    const updatedSequences = sequences.map(s => 
      s.id === selectedSequence.id ? updatedSequence : s
    );

    onUpdateSequences(updatedSequences);
    setNewSectionName('');
    setIsAddSectionOpen(false);
  };

  const handleDeleteSection = (sectionIndex: number) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections.splice(sectionIndex, 1);

    const updatedSequence = {
      ...selectedSequence,
      sections: updatedSections,
    };

    const updatedSequences = sequences.map(s => 
      s.id === selectedSequence.id ? updatedSequence : s
    );

    onUpdateSequences(updatedSequences);
  };

  const handleAddPoseToSection = (sectionIndex: number, poseInstance: PoseInstance) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: [...updatedSections[sectionIndex].items, poseInstance],
    };

    const updatedSequence = {
      ...selectedSequence,
      sections: updatedSections,
    };

    const updatedSequences = sequences.map(s => 
      s.id === selectedSequence.id ? updatedSequence : s
    );

    onUpdateSequences(updatedSequences);
  };

  const handleAddGroupToSection = (sectionIndex: number, groupBlock: GroupBlock) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: [...updatedSections[sectionIndex].items, groupBlock],
    };

    const updatedSequence = {
      ...selectedSequence,
      sections: updatedSections,
    };

    const updatedSequences = sequences.map(s => 
      s.id === selectedSequence.id ? updatedSequence : s
    );

    onUpdateSequences(updatedSequences);
  };

  const handleDeleteItemFromSection = (sectionIndex: number, itemIndex: number) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    const section = updatedSections[sectionIndex];
    const updatedItems = [...section.items];
    updatedItems.splice(itemIndex, 1);

    updatedSections[sectionIndex] = {
      ...section,
      items: updatedItems,
    };

    const updatedSequence = {
      ...selectedSequence,
      sections: updatedSections,
    };

    const updatedSequences = sequences.map(s => 
      s.id === selectedSequence.id ? updatedSequence : s
    );

    onUpdateSequences(updatedSequences);
  };

  const handleUpdateSection = (sectionIndex: number, updatedSection: Section) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections[sectionIndex] = updatedSection;

    const updatedSequence = {
      ...selectedSequence,
      sections: updatedSections,
    };

    const updatedSequences = sequences.map(s => 
      s.id === selectedSequence.id ? updatedSequence : s
    );

    onUpdateSequences(updatedSequences);
  };

  const handleDeleteSequence = () => {
    if (!selectedSequence) return;

    const updatedSequences = sequences.filter(s => s.id !== selectedSequence.id);
    onUpdateSequences(updatedSequences);
    
    // Select another sequence if available
    if (updatedSequences.length > 0) {
      setSelectedSequenceId(updatedSequences[0].id);
    } else {
      setSelectedSequenceId(null);
    }
    
    setIsDeleteSequenceOpen(false);
  };

  const handleEditSequenceName = () => {
    if (!selectedSequence || !editedSequenceName.trim()) return;

    const updatedSequences = sequences.map(s =>
      s.id === selectedSequence.id ? { ...s, name: editedSequenceName.trim() } : s
    );

    onUpdateSequences(updatedSequences);
    setIsEditSequenceOpen(false);
  };

  const handleGroupBlockExpandedChange = (groupBlockId: string, isOpen: boolean, isBlockExpanded: boolean) => {
    setGroupBlockExpandedStates(prev => ({
      ...prev,
      [groupBlockId]: { isOpen, isBlockExpanded }
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedSectionIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSectionIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverSectionIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedSectionIndex === null || !selectedSequence || draggedSectionIndex === targetIndex) {
      setDraggedSectionIndex(null);
      setDragOverSectionIndex(null);
      return;
    }

    const updatedSections = [...selectedSequence.sections];
    const [removed] = updatedSections.splice(draggedSectionIndex, 1);
    updatedSections.splice(targetIndex, 0, removed);

    const updatedSequence = {
      ...selectedSequence,
      sections: updatedSections,
    };

    const updatedSequences = sequences.map(s => 
      s.id === selectedSequence.id ? updatedSequence : s
    );

    onUpdateSequences(updatedSequences);
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center gap-2">
        <div className="flex-1">
          <Select 
            value={selectedSequenceId || undefined} 
            onValueChange={setSelectedSequenceId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a sequence" />
            </SelectTrigger>
            <SelectContent>
              {sequences.map(seq => (
                <SelectItem key={seq.id} value={seq.id}>
                  {seq.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedSequence && (
          <>
            <Dialog open={isEditSequenceOpen} onOpenChange={setIsEditSequenceOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setEditedSequenceName(selectedSequence.name)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Sequence Name</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-sequence-name">Sequence Name</Label>
                    <Input
                      id="edit-sequence-name"
                      placeholder="Enter sequence name"
                      value={editedSequenceName}
                      onChange={(e) => setEditedSequenceName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSequenceName()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEditSequenceName}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteSequenceOpen} onOpenChange={setIsDeleteSequenceOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{selectedSequence.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSequence}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        
        <Dialog open={isCreateSequenceOpen} onOpenChange={setIsCreateSequenceOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sequence-name">Sequence Name</Label>
                <Input
                  id="sequence-name"
                  placeholder="Enter sequence name"
                  value={newSequenceName}
                  onChange={(e) => setNewSequenceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSequence()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSequence}>Create Sequence</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {selectedSequence ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2>{selectedSequence.name}</h2>
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(calculateSequenceDuration(selectedSequence))}
              </span>
            </div>
            <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Section</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="section-name">Section Name</Label>
                    <Input
                      id="section-name"
                      placeholder="e.g., Warm Up, Cool Down"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddSection}>Add Section</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {selectedSequence.sections.map((section, index) => {
              const showIndicatorAbove = dragOverSectionIndex === index && draggedSectionIndex !== null && draggedSectionIndex > index;
              const showIndicatorBelow = dragOverSectionIndex === index && draggedSectionIndex !== null && draggedSectionIndex < index;
              
              return (
                <div key={section.id}>
                  {showIndicatorAbove && (
                    <div className="h-1 bg-primary rounded mb-3" />
                  )}
                  <div
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`${draggedSectionIndex === index ? 'opacity-50' : ''} transition-opacity`}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        className="cursor-move text-muted-foreground mt-4"
                      >
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <SectionView
                          section={section}
                          poses={poses}
                          variations={variations}
                          onDelete={() => handleDeleteSection(index)}
                          onAddPoseInstance={(poseInstance) => handleAddPoseToSection(index, poseInstance)}
                          onAddGroupBlock={(groupBlock) => handleAddGroupToSection(index, groupBlock)}
                          onDeleteItem={(itemIndex) => handleDeleteItemFromSection(index, itemIndex)}
                          onUpdateSection={(updatedSection) => handleUpdateSection(index, updatedSection)}
                          groupBlockExpandedStates={groupBlockExpandedStates}
                          onGroupBlockExpandedChange={handleGroupBlockExpandedChange}
                        />
                      </div>
                    </div>
                  </div>
                  {showIndicatorBelow && (
                    <div className="h-1 bg-primary rounded mt-3" />
                  )}
                </div>
              );
            })}
          </div>

          {selectedSequence.sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sections yet. Add your first section to start building your sequence.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No sequences yet. Create your first sequence to get started.</p>
        </div>
      )}
    </div>
  );
}
