import React, { useState } from 'react';
import { Section, PoseInstance, GroupBlock, Pose, PoseVariation } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { PoseInstanceView } from './PoseInstanceView';
import { GroupBlockView } from './GroupBlockView';
import { Plus, Trash2, ChevronDown, ChevronRight, Clock, ChevronUp } from 'lucide-react';
import { calculateSectionDuration, formatDuration } from '../lib/timeUtils';
import { useIsMobile } from './ui/use-mobile';

interface SectionViewProps {
  section: Section;
  poses: Pose[];
  variations: PoseVariation[];
  onDelete: () => void;
  onAddPoseInstance: (poseInstance: PoseInstance) => void;
  onAddGroupBlock: (groupBlock: GroupBlock) => void;
  onDeleteItem: (index: number) => void;
  onUpdateSection: (section: Section) => void;
  groupBlockExpandedStates: Record<string, { isOpen: boolean; isBlockExpanded: boolean }>;
  onGroupBlockExpandedChange: (groupBlockId: string, isOpen: boolean, isBlockExpanded: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function SectionView({
  section,
  poses,
  variations,
  onDelete,
  onAddPoseInstance,
  onAddGroupBlock,
  onDeleteItem,
  onUpdateSection,
  groupBlockExpandedStates,
  onGroupBlockExpandedChange,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: SectionViewProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [isAddPoseOpen, setIsAddPoseOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  
  const [selectedPoseId, setSelectedPoseId] = useState<string>('');
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [duration, setDuration] = useState('00:30');
  const [sets, setSets] = useState('3');
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddPoseInstance = () => {
    if (!selectedVariationId || !duration) return;

    const newPoseInstance: PoseInstance = {
      type: 'pose_instance',
      id: `pose-${Date.now()}`,
      poseVariationId: selectedVariationId,
      duration: duration,
    };

    onAddPoseInstance(newPoseInstance);
    setSelectedPoseId('');
    setSelectedVariationId('');
    setDuration('00:30');
    setIsAddPoseOpen(false);
  };

  const handleAddGroupBlock = () => {
    const setsNum = parseInt(sets);
    if (isNaN(setsNum) || setsNum < 1) return;

    const newGroupBlock: GroupBlock = {
      type: 'group_block',
      id: `group-${Date.now()}`,
      sets: setsNum,
      items: [],
      roundOverrides: [],
    };

    onAddGroupBlock(newGroupBlock);
    setSets('3');
    setIsAddGroupOpen(false);
  };

  const handlePoseChange = (poseId: string) => {
    setSelectedPoseId(poseId);
    const poseVariations = variations.filter(v => v.poseId === poseId);
    const defaultVariation = poseVariations.find(v => v.isDefault);
    if (defaultVariation) {
      setSelectedVariationId(defaultVariation.id);
    } else if (poseVariations.length > 0) {
      setSelectedVariationId(poseVariations[0].id);
    }
  };

  const poseVariations = selectedPoseId 
    ? variations.filter(v => v.poseId === selectedPoseId)
    : [];

  const handleUpdateGroupBlock = (index: number, updatedBlock: GroupBlock) => {
    const updatedSection = {
      ...section,
      items: section.items.map((sItem, sIndex) => 
        sIndex === index ? updatedBlock : sItem
      ),
    };
    onUpdateSection(updatedSection);
  };

  const handleUpdatePoseInstance = (index: number, updatedInstance: PoseInstance) => {
    const updatedSection = {
      ...section,
      items: section.items.map((sItem, sIndex) => 
        sIndex === index ? updatedInstance : sItem
      ),
    };
    onUpdateSection(updatedSection);
  };

  const handleMoveItemUp = (index: number) => {
    if (index > 0) {
      const updatedItems = [...section.items];
      [updatedItems[index - 1], updatedItems[index]] = [updatedItems[index], updatedItems[index - 1]];
      onUpdateSection({ ...section, items: updatedItems });
    }
  };

  const handleMoveItemDown = (index: number) => {
    if (index < section.items.length - 1) {
      const updatedItems = [...section.items];
      [updatedItems[index], updatedItems[index + 1]] = [updatedItems[index + 1], updatedItems[index]];
      onUpdateSection({ ...section, items: updatedItems });
    }
  };

  const getItemKey = (item: PoseInstance | GroupBlock, index: number): string => {
    return item.id;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedItems = [...section.items];
    const [removed] = updatedItems.splice(draggedItemIndex, 1);
    updatedItems.splice(targetIndex, 0, removed);

    const updatedSection = {
      ...section,
      items: updatedItems,
    };

    onUpdateSection(updatedSection);
    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  const getDragHandleProps = (index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
  });

  const renderItem = (item: PoseInstance | GroupBlock, index: number) => {
    if (item.type === 'pose_instance') {
      return (
        <PoseInstanceView
          key={index}
          poseInstance={item}
          poses={poses}
          variations={variations}
          onDelete={() => onDeleteItem(index)}
          onUpdate={(updatedInstance) => handleUpdatePoseInstance(index, updatedInstance)}
          dragHandleProps={getDragHandleProps(index)}
          onMoveUp={() => handleMoveItemUp(index)}
          onMoveDown={() => handleMoveItemDown(index)}
          canMoveUp={index > 0}
          canMoveDown={index < section.items.length - 1}
        />
      );
    } else {
      return (
        <GroupBlockView
          key={index}
          groupBlock={item}
          poses={poses}
          variations={variations}
          onDelete={() => onDeleteItem(index)}
          onUpdate={(updatedBlock) => handleUpdateGroupBlock(index, updatedBlock)}
          dragHandleProps={getDragHandleProps(index)}
          isOpen={groupBlockExpandedStates[item.id]?.isOpen ?? true}
          isBlockExpanded={groupBlockExpandedStates[item.id]?.isBlockExpanded ?? true}
          onExpandedChange={(isOpen, isBlockExpanded) => onGroupBlockExpandedChange(item.id, isOpen, isBlockExpanded)}
          onMoveUp={() => handleMoveItemUp(index)}
          onMoveDown={() => handleMoveItemDown(index)}
          canMoveUp={index > 0}
          canMoveDown={index < section.items.length - 1}
        />
      );
    }
  };

  return (
    <Card className={`${isMobile ? 'p-3' : 'p-4'}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center mb-3'}`}>
          <div className={`flex ${isMobile ? 'items-center justify-between w-full' : 'items-center gap-2'}`}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto flex items-center gap-2">
                {isOpen ? <ChevronDown className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /> : <ChevronRight className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />}
                <h3 className={`${isMobile ? 'text-base font-medium text-left' : 'text-lg font-medium'}`}>{section.name}</h3>
              </Button>
            </CollapsibleTrigger>
            {isMobile && onMoveUp && onMoveDown && (
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMoveUp}
                  disabled={!canMoveUp}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMoveDown}
                  disabled={!canMoveDown}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className={`flex ${isMobile ? 'justify-between items-center' : 'items-center gap-3'}`}>
            <span className={`text-sm text-muted-foreground flex items-center gap-1 ${isMobile ? 'text-xs' : ''}`}>
              <Clock className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
              {formatDuration(calculateSectionDuration(section))}
            </span>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
          </div>
        </div>
        <CollapsibleContent className="mt-4 space-y-3">
            {section.items.map((item, index) => {
              const showIndicatorAbove = dragOverIndex === index && draggedItemIndex !== null && draggedItemIndex > index;
              const showIndicatorBelow = dragOverIndex === index && draggedItemIndex !== null && draggedItemIndex < index;
              
              return (
                <div key={getItemKey(item, index)}>
                  {showIndicatorAbove && (
                    <div className="h-1 bg-primary rounded mb-2" />
                  )}
                  <div
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`${draggedItemIndex === index ? 'opacity-50' : ''} transition-opacity`}
                  >
                    {renderItem(item, index)}
                  </div>
                  {showIndicatorBelow && (
                    <div className="h-1 bg-primary rounded mt-2" />
                  )}
                </div>
              );
            })}

            {section.items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items in this section yet.
              </p>
            )}

            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-2'}`}>
              <Dialog open={isAddPoseOpen} onOpenChange={setIsAddPoseOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-3 w-3 mr-2'}`} />
                    Add Pose
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Pose Instance</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="pose-select">Select Pose</Label>
                      <Select value={selectedPoseId} onValueChange={handlePoseChange}>
                        <SelectTrigger id="pose-select">
                          <SelectValue placeholder="Choose a pose" />
                        </SelectTrigger>
                        <SelectContent>
                          {poses.map(pose => (
                            <SelectItem key={pose.id} value={pose.id}>
                              {pose.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {poseVariations.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="variation-select">Select Variation</Label>
                        <Select value={selectedVariationId} onValueChange={setSelectedVariationId}>
                          <SelectTrigger id="variation-select">
                            <SelectValue placeholder="Choose a variation" />
                          </SelectTrigger>
                          <SelectContent>
                            {poseVariations.map(variation => (
                              <SelectItem key={variation.id} value={variation.id}>
                                {variation.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (MM:SS or HH:MM:SS)</Label>
                      <Input
                        id="duration"
                        placeholder="00:30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddPoseInstance} disabled={!selectedVariationId}>
                      Add Pose Instance
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-3 w-3 mr-2'}`} />
                    Add Group Block
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Group Block</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="sets">Number of Sets</Label>
                      <Input
                        id="sets"
                        type="number"
                        min="1"
                        placeholder="3"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can add items to the group block after creating it.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddGroupBlock}>Add Group Block</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
