import React, { useState, useEffect, useRef } from 'react';
import { Sequence, Section, PoseInstance, GroupBlock, Pose, PoseVariation } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SectionView } from './SectionView';
import { Plus, FolderOpen, Trash2, Edit, GripVertical, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { calculateSequenceDuration, formatDuration } from '../lib/timeUtils';
import { useIsMobile } from './ui/use-mobile';
import { generateUUID } from '../lib/uuid';
import { DEFAULT_SEQUENCE_TEMPLATE, generateTemplateWithNewIds } from '../lib/defaultSequenceTemplate';
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
  onCreateSequence: (sequence: Omit<Sequence, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateSequence: (id: string, updates: Partial<Sequence>) => Promise<void>;
  onDeleteSequence: (id: string) => Promise<void>;
}

export function SequenceBuilder({
  sequences,
  poses,
  variations,
  onCreateSequence,
  onUpdateSequence,
  onDeleteSequence,
}: SequenceBuilderProps) {
  const isMobile = useIsMobile();
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
  const [useTemplate, setUseTemplate] = useState(false);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const [groupBlockExpandedStates, setGroupBlockExpandedStates] = useState<Record<string, { isOpen: boolean; isBlockExpanded: boolean }>>({});
  const prevSequenceIdsRef = useRef<Set<string>>(new Set(sequences.map(s => s.id)));
  const isInitialMountRef = useRef(true);

  const selectedSequence = sequences.find(s => s.id === selectedSequenceId);

  // Auto-select newly created sequence
  useEffect(() => {
    if (isInitialMountRef.current) {
      // Skip auto-selection on initial mount
      isInitialMountRef.current = false;
      prevSequenceIdsRef.current = new Set(sequences.map(s => s.id));
      return;
    }

    const currentIds = new Set(sequences.map(s => s.id));
    const prevIds = prevSequenceIdsRef.current;
    
    // Find sequences that are new (exist in current but not in previous)
    const newSequences = sequences.filter(s => !prevIds.has(s.id));
    
    if (newSequences.length > 0) {
      // Select the first newly created sequence
      const newestSequence = newSequences[0];
      if (newestSequence) {
        setSelectedSequenceId(newestSequence.id);
      }
    }
    
    prevSequenceIdsRef.current = currentIds;
  }, [sequences]);

  // Update selected sequence if current selection is deleted
  useEffect(() => {
    if (selectedSequenceId && !sequences.find(s => s.id === selectedSequenceId)) {
      // Current selection was deleted, select first available or null
      setSelectedSequenceId(sequences.length > 0 ? sequences[0].id : null);
    }
  }, [sequences, selectedSequenceId]);

  const handleCreateSequence = async () => {
    if (!newSequenceName.trim()) return;

    const newSequence = {
      name: newSequenceName.trim(),
      sections: useTemplate ? generateTemplateWithNewIds(DEFAULT_SEQUENCE_TEMPLATE) : [],
    };

    await onCreateSequence(newSequence);
    setNewSequenceName('');
    setUseTemplate(false);
    setIsCreateSequenceOpen(false);
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim() || !selectedSequence) return;

    const newSection: Section = {
      type: 'section',
      id: generateUUID(),
      name: newSectionName.trim(),
      items: [],
    };

    const updatedSequence = {
      ...selectedSequence,
      sections: [...selectedSequence.sections, newSection],
    };

    await onUpdateSequence(selectedSequence.id, { sections: updatedSequence.sections });
    setNewSectionName('');
    setIsAddSectionOpen(false);
  };

  const handleDeleteSection = async (sectionIndex: number) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections.splice(sectionIndex, 1);

    await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
  };

  const handleAddPoseToSection = async (sectionIndex: number, poseInstance: PoseInstance) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: [...updatedSections[sectionIndex].items, poseInstance],
    };

    await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
  };

  const handleAddGroupToSection = async (sectionIndex: number, groupBlock: GroupBlock) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: [...updatedSections[sectionIndex].items, groupBlock],
    };

    await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
  };

  const handleDeleteItemFromSection = async (sectionIndex: number, itemIndex: number) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    const section = updatedSections[sectionIndex];
    const updatedItems = [...section.items];
    updatedItems.splice(itemIndex, 1);

    updatedSections[sectionIndex] = {
      ...section,
      items: updatedItems,
    };

    await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
  };

  const handleUpdateSection = async (sectionIndex: number, updatedSection: Section) => {
    if (!selectedSequence) return;

    const updatedSections = [...selectedSequence.sections];
    updatedSections[sectionIndex] = updatedSection;

    await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
  };

  const handleDeleteSequence = async () => {
    if (!selectedSequence) return;

    await onDeleteSequence(selectedSequence.id);
    
    // Select another sequence if available
    const remainingSequences = sequences.filter(s => s.id !== selectedSequence.id);
    if (remainingSequences.length > 0) {
      setSelectedSequenceId(remainingSequences[0].id);
    } else {
      setSelectedSequenceId(null);
    }
    
    setIsDeleteSequenceOpen(false);
  };

  const handleEditSequenceName = async () => {
    if (!selectedSequence || !editedSequenceName.trim()) return;

    await onUpdateSequence(selectedSequence.id, { name: editedSequenceName.trim() });
    setEditedSequenceName('');
    setIsEditSequenceOpen(false);
  };

  const handleGroupBlockExpandedChange = (groupBlockId: string, isOpen: boolean, isBlockExpanded: boolean) => {
    setGroupBlockExpandedStates(prev => ({
      ...prev,
      [groupBlockId]: { isOpen, isBlockExpanded }
    }));
  };

  const handleMoveSectionUp = async (index: number) => {
    if (index > 0 && selectedSequence) {
      const updatedSections = [...selectedSequence.sections];
      [updatedSections[index - 1], updatedSections[index]] = [updatedSections[index], updatedSections[index - 1]];
      
      await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
    }
  };

  const handleMoveSectionDown = async (index: number) => {
    if (index < selectedSequence!.sections.length - 1 && selectedSequence) {
      const updatedSections = [...selectedSequence.sections];
      [updatedSections[index], updatedSections[index + 1]] = [updatedSections[index + 1], updatedSections[index]];
      
      await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
    }
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

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
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

    await onUpdateSequence(selectedSequence.id, { sections: updatedSections });
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  };

  return (
    <div className={`${isMobile ? 'p-0' : 'p-4'} space-y-4`}>
      <div className={`flex ${isMobile ? 'items-center gap-2' : 'justify-between items-center gap-2'}`}>
        <div className="flex-1">
          <Select 
            value={selectedSequenceId || undefined} 
            onValueChange={setSelectedSequenceId}
            disabled={sequences.length === 0}
          >
            <SelectTrigger className={isMobile ? 'w-full' : ''}>
              <SelectValue placeholder={sequences.length === 0 ? "Empty" : "Select a sequence"} />
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
          <div className={`flex ${isMobile ? 'gap-1' : 'gap-1'}`}>
            <Dialog open={isEditSequenceOpen} onOpenChange={setIsEditSequenceOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setEditedSequenceName(selectedSequence.name)}
                  className={isMobile ? 'h-8 w-8' : ''}
                >
                  <Edit className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
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
                <Button 
                  variant="outline" 
                  size="icon"
                  className={isMobile ? 'h-8 w-8' : ''}
                >
                  <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
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
          </div>
        )}
        
        <Dialog open={isCreateSequenceOpen} onOpenChange={setIsCreateSequenceOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className={isMobile ? 'h-8 w-8' : ''}>
              <Plus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
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
              <div className="space-y-2">
                <Label>Template</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="use-template"
                    checked={useTemplate}
                    onChange={(e) => setUseTemplate(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="use-template" className="text-sm font-normal">
                    Start with default sequence template
                  </Label>
                </div>
                {useTemplate && (
                  <p className="text-xs text-muted-foreground">
                    This will create a comprehensive yoga/sculpt sequence with 11 sections including warm-up, sun salutations, cardio, and cool down.
                  </p>
                )}
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
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-3'}`}>
              <h2 className={isMobile ? 'text-lg' : ''}>{selectedSequence.name}</h2>
              <span className={`text-muted-foreground flex items-center gap-1.5 ${isMobile ? 'text-sm' : ''}`}>
                <Clock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                {formatDuration(calculateSequenceDuration(selectedSequence))}
              </span>
            </div>
            <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
              <DialogTrigger asChild>
                <Button className={isMobile ? 'w-full' : ''}>
                  <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
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
                    <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-start gap-2'}`}>
                      {!isMobile && (
                        <div 
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          className="cursor-move text-muted-foreground mt-4"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>
                      )}
                      <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
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
                          onMoveUp={() => handleMoveSectionUp(index)}
                          onMoveDown={() => handleMoveSectionDown(index)}
                          canMoveUp={index > 0}
                          canMoveDown={index < selectedSequence.sections.length - 1}
                        />
                      </div>
                    </div>
                    {showIndicatorBelow && (
                      <div className="h-1 bg-primary rounded mt-3" />
                    )}
                  </div>
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
