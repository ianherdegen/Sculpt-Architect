import React, { useState } from 'react';
import { GroupBlock, PoseInstance, Pose, PoseVariation } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { GripVertical, Trash2, Plus, ChevronDown, ChevronRight, PlusCircle, Edit, Clock, ChevronUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { PoseInstanceView } from './PoseInstanceView';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { calculateGroupBlockDuration, formatDuration } from '../lib/timeUtils';
import { useIsMobile } from './ui/use-mobile';

interface GroupBlockViewProps {
  groupBlock: GroupBlock;
  poses: Pose[];
  variations: PoseVariation[];
  onDelete: () => void;
  onUpdate: (updatedBlock: GroupBlock) => void;
  dragHandleProps?: any;
  isOpen: boolean;
  isBlockExpanded: boolean;
  onExpandedChange: (isOpen: boolean, isBlockExpanded: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function GroupBlockView({
  groupBlock,
  poses,
  variations,
  onDelete,
  onUpdate,
  dragHandleProps,
  isOpen,
  isBlockExpanded,
  onExpandedChange,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: GroupBlockViewProps) {
  const isMobile = useIsMobile();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddRoundOverrideOpen, setIsAddRoundOverrideOpen] = useState(false);
  const [isAddOverrideItemOpen, setIsAddOverrideItemOpen] = useState(false);
  const [isEditSetsOpen, setIsEditSetsOpen] = useState(false);
  const [selectedOverrideRound, setSelectedOverrideRound] = useState<number | null>(null);
  
  const [selectedPoseId, setSelectedPoseId] = useState<string>('');
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [duration, setDuration] = useState('00:30');
  const [newRoundNumber, setNewRoundNumber] = useState('1');
  const [editedSets, setEditedSets] = useState(groupBlock.sets.toString());
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
  const [draggedOverrideItemIndex, setDraggedOverrideItemIndex] = useState<number | null>(null);
  const [dragOverOverrideItemIndex, setDragOverOverrideItemIndex] = useState<number | null>(null);
  const [draggedOverrideRound, setDraggedOverrideRound] = useState<number | null>(null);

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

  const handleAddItemToBlock = () => {
    if (!selectedVariationId || !duration) return;

    const newPoseInstance: PoseInstance = {
      type: 'pose_instance',
      id: `pose-${Date.now()}`,
      poseVariationId: selectedVariationId,
      duration: duration,
    };

    onUpdate({
      ...groupBlock,
      items: [...groupBlock.items, newPoseInstance],
    });

    setSelectedPoseId('');
    setSelectedVariationId('');
    setDuration('00:30');
    setIsAddItemOpen(false);
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = [...groupBlock.items];
    updatedItems.splice(index, 1);
    onUpdate({
      ...groupBlock,
      items: updatedItems,
    });
  };

  const handleAddRoundOverride = () => {
    const roundNum = parseInt(newRoundNumber);
    if (isNaN(roundNum) || roundNum < 1 || roundNum > groupBlock.sets) return;

    // Check if override already exists for this round
    if (groupBlock.roundOverrides.some(ro => ro.round === roundNum)) {
      alert(`Round ${roundNum} already has an override`);
      return;
    }

    onUpdate({
      ...groupBlock,
      roundOverrides: [
        ...groupBlock.roundOverrides,
        { round: roundNum, items: [] },
      ].sort((a, b) => a.round - b.round),
    });

    setNewRoundNumber('1');
    setIsAddRoundOverrideOpen(false);
  };

  const handleDeleteRoundOverride = (round: number) => {
    onUpdate({
      ...groupBlock,
      roundOverrides: groupBlock.roundOverrides.filter(ro => ro.round !== round),
    });
  };

  const handleUpdateSets = () => {
    const setsNum = parseInt(editedSets);
    if (isNaN(setsNum) || setsNum < 1) return;

    // Filter out round overrides that are now beyond the new sets count
    const filteredOverrides = groupBlock.roundOverrides.filter(ro => ro.round <= setsNum);

    onUpdate({
      ...groupBlock,
      sets: setsNum,
      roundOverrides: filteredOverrides,
    });

    setIsEditSetsOpen(false);
  };

  const handleAddItemToRoundOverride = (round: number) => {
    if (!selectedVariationId || !duration) return;

    const newPoseInstance: PoseInstance = {
      type: 'pose_instance',
      id: `pose-${Date.now()}`,
      poseVariationId: selectedVariationId,
      duration: duration,
    };

    const updatedOverrides = groupBlock.roundOverrides.map(ro => {
      if (ro.round === round) {
        return { ...ro, items: [...ro.items, newPoseInstance] };
      }
      return ro;
    });

    onUpdate({
      ...groupBlock,
      roundOverrides: updatedOverrides,
    });

    setSelectedPoseId('');
    setSelectedVariationId('');
    setDuration('00:30');
    setIsAddOverrideItemOpen(false);
    setSelectedOverrideRound(null);
  };

  const handleDeleteItemFromRoundOverride = (round: number, itemIndex: number) => {
    const updatedOverrides = groupBlock.roundOverrides.map(ro => {
      if (ro.round === round) {
        const updatedItems = [...ro.items];
        updatedItems.splice(itemIndex, 1);
        return { ...ro, items: updatedItems };
      }
      return ro;
    });

    onUpdate({
      ...groupBlock,
      roundOverrides: updatedOverrides,
    });
  };

  const handleUpdateItem = (index: number, updatedInstance: PoseInstance) => {
    const updatedItems = groupBlock.items.map((item, i) =>
      i === index ? updatedInstance : item
    );
    onUpdate({
      ...groupBlock,
      items: updatedItems,
    });
  };

  const handleUpdateItemInRoundOverride = (round: number, itemIndex: number, updatedInstance: PoseInstance) => {
    const updatedOverrides = groupBlock.roundOverrides.map(ro => {
      if (ro.round === round) {
        const updatedItems = ro.items.map((item, i) =>
          i === itemIndex ? updatedInstance : item
        );
        return { ...ro, items: updatedItems };
      }
      return ro;
    });

    onUpdate({
      ...groupBlock,
      roundOverrides: updatedOverrides,
    });
  };

  const handleDragStartItem = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedItemIndex(index);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItemIndex(index);
  };

  const handleDragLeaveItem = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverItemIndex(null);
  };

  const handleDropItem = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null);
      setDragOverItemIndex(null);
      return;
    }

    const updatedItems = [...groupBlock.items];
    const [removed] = updatedItems.splice(draggedItemIndex, 1);
    updatedItems.splice(targetIndex, 0, removed);

    onUpdate({
      ...groupBlock,
      items: updatedItems,
    });
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleMoveOverrideItemUp = (round: number, index: number) => {
    if (index > 0) {
      const override = groupBlock.roundOverrides.find(ro => ro.round === round);
      if (override) {
        const updatedItems = [...override.items];
        [updatedItems[index - 1], updatedItems[index]] = [updatedItems[index], updatedItems[index - 1]];
        
        const updatedOverrides = groupBlock.roundOverrides.map(ro => 
          ro.round === round ? { ...ro, items: updatedItems } : ro
        );
        
        onUpdate({
          ...groupBlock,
          roundOverrides: updatedOverrides,
        });
      }
    }
  };

  const handleMoveOverrideItemDown = (round: number, index: number) => {
    const override = groupBlock.roundOverrides.find(ro => ro.round === round);
    if (override && index < override.items.length - 1) {
      const updatedItems = [...override.items];
      [updatedItems[index], updatedItems[index + 1]] = [updatedItems[index + 1], updatedItems[index]];
      
      const updatedOverrides = groupBlock.roundOverrides.map(ro => 
        ro.round === round ? { ...ro, items: updatedItems } : ro
      );
      
      onUpdate({
        ...groupBlock,
        roundOverrides: updatedOverrides,
      });
    }
  };
  
  const handleDragStartOverrideItem = (e: React.DragEvent, round: number, index: number) => {
    e.stopPropagation();
    setDraggedOverrideRound(round);
    setDraggedOverrideItemIndex(index);
  };

  const handleDragOverOverrideItem = (e: React.DragEvent, round: number, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedOverrideRound === round) {
      setDragOverOverrideItemIndex(index);
    }
  };

  const handleDragLeaveOverrideItem = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverOverrideItemIndex(null);
  };

  const handleDropOverrideItem = (e: React.DragEvent, round: number, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedOverrideItemIndex === null || draggedOverrideRound !== round || draggedOverrideItemIndex === targetIndex) {
      setDraggedOverrideItemIndex(null);
      setDraggedOverrideRound(null);
      setDragOverOverrideItemIndex(null);
      return;
    }

    const updatedOverrides = groupBlock.roundOverrides.map(ro => {
      if (ro.round === round) {
        const updatedItems = [...ro.items];
        const [removed] = updatedItems.splice(draggedOverrideItemIndex, 1);
        updatedItems.splice(targetIndex, 0, removed);
        return { ...ro, items: updatedItems };
      }
      return ro;
    });

    onUpdate({
      ...groupBlock,
      roundOverrides: updatedOverrides,
    });
    setDraggedOverrideItemIndex(null);
    setDraggedOverrideRound(null);
    setDragOverOverrideItemIndex(null);
  };

  const getItemKey = (item: PoseInstance | GroupBlock, index: number, prefix: string): string => {
    return `${prefix}-${item.id}`;
  };

  const poseVariations = selectedPoseId 
    ? variations.filter(v => v.poseId === selectedPoseId)
    : [];

  const getDragHandlePropsForItem = (index: number, isOverride: boolean = false, round?: number) => {
    if (isOverride && round !== undefined) {
      return {
        draggable: true,
        onDragStart: (e: React.DragEvent) => handleDragStartOverrideItem(e, round, index),
      };
    }
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStartItem(e, index),
    };
  };

  const renderItem = (
    item: PoseInstance | GroupBlock, 
    index: number, 
    onDeleteCallback: () => void,
    onUpdateCallback?: (updatedInstance: PoseInstance) => void,
    isOverride: boolean = false,
    round?: number,
    onMoveUp?: () => void,
    onMoveDown?: () => void,
    canMoveUp?: boolean,
    canMoveDown?: boolean
  ) => {
    const dragHandleProps = getDragHandlePropsForItem(index, isOverride, round);
    
    if (item.type === 'pose_instance') {
      return (
        <PoseInstanceView
          key={index}
          poseInstance={item}
          poses={poses}
          variations={variations}
          onDelete={onDeleteCallback}
          onUpdate={onUpdateCallback}
          dragHandleProps={dragHandleProps}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      );
    } else {
      return (
        <div key={index} className="border-l-2 border-muted pl-3">
          <p className="text-xs text-muted-foreground mb-2">Nested Group Block (Sets: {item.sets})</p>
        </div>
      );
    }
  };

  const handleDragStartGroup = (e: React.DragEvent) => {
    if (dragHandleProps?.onDragStart) {
      dragHandleProps.onDragStart(e);
    }
  };

  return (
    <Card className={`${isMobile ? 'p-2' : 'p-3'} bg-muted/50`}>
      <div className={`flex gap-2 ${isBlockExpanded ? 'items-start' : 'items-center'}`}>
        <div 
          {...dragHandleProps} 
          className={`cursor-move text-muted-foreground ${isBlockExpanded ? 'pt-0.5' : ''}`}
          onDragStart={handleDragStartGroup}
        >
          <GripVertical className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
        </div>
        <Collapsible open={isBlockExpanded} onOpenChange={(value) => onExpandedChange(isOpen, value)} className="flex-1">
          <div className={`${isMobile ? 'space-y-2' : 'flex items-center gap-2'}`}>
            <div className={`flex ${isMobile ? 'items-center gap-2' : 'items-center gap-2'}`}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  {isBlockExpanded ? <ChevronDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} /> : <ChevronRight className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />}
                </Button>
              </CollapsibleTrigger>
              <Badge className={`${isMobile ? 'text-xs' : 'text-xs'}`}>Group Block</Badge>
              <span className={`text-sm font-medium ${isMobile ? 'text-xs' : ''}`}>{groupBlock.sets} sets</span>
            </div>
            <div className={`flex ${isMobile ? 'items-center justify-between' : 'items-center gap-2'}`}>
              <span className={`text-sm text-muted-foreground flex items-center gap-1 ${isMobile ? 'text-xs' : ''}`}>
                <Clock className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                {formatDuration(calculateGroupBlockDuration(groupBlock))}
              </span>
              <Dialog open={isEditSetsOpen} onOpenChange={setIsEditSetsOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-auto p-0 ${isMobile ? 'h-8 w-8' : ''}`}
                  >
                    <Edit className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                    {!isMobile && <span className="ml-1">Edit</span>}
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Number of Sets</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-sets">Number of Sets</Label>
                    <Input
                      id="edit-sets"
                      type="number"
                      min="1"
                      value={editedSets}
                      onChange={(e) => setEditedSets(e.target.value)}
                    />
                  </div>
                  {parseInt(editedSets) < groupBlock.sets && groupBlock.roundOverrides.some(ro => ro.round > parseInt(editedSets)) && (
                    <p className="text-xs text-destructive">
                      Warning: Reducing sets will remove round overrides for rounds {parseInt(editedSets) + 1} and above.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleUpdateSets}>Update Sets</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
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
            </div>
          
          <CollapsibleContent className="mt-3">
            <div className="space-y-2">
              {groupBlock.items.map((item, index) => {
                const showIndicatorAbove = dragOverItemIndex === index && draggedItemIndex !== null && draggedItemIndex > index;
                const showIndicatorBelow = dragOverItemIndex === index && draggedItemIndex !== null && draggedItemIndex < index;
                
                return (
                  <div key={getItemKey(item, index, 'item')}>
                    {showIndicatorAbove && (
                      <div className="h-1 bg-primary rounded mb-2" />
                    )}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStartItem(e, index)}
                      onDragOver={(e) => handleDragOverItem(e, index)}
                      onDragLeave={handleDragLeaveItem}
                      onDrop={(e) => handleDropItem(e, index)}
                      className={`${draggedItemIndex === index ? 'opacity-50' : ''} transition-opacity`}
                    >
                      {renderItem(
                        item, 
                        index, 
                        () => handleDeleteItem(index), 
                        (updated) => handleUpdateItem(index, updated), 
                        false,
                        undefined,
                        () => handleMoveItemUp(index),
                        () => handleMoveItemDown(index),
                        index > 0,
                        index < groupBlock.items.length - 1
                      )}
                    </div>
                    {showIndicatorBelow && (
                      <div className="h-1 bg-primary rounded mt-2" />
                    )}
                  </div>
                );
              })}
              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Item to Group Block</DialogTitle>
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
                    <Button onClick={handleAddItemToBlock} disabled={!selectedVariationId}>
                      Add Item
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

          <div className="mt-3 space-y-2">
            {groupBlock.roundOverrides.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs">Additional Items by Round:</p>
                {groupBlock.roundOverrides.map(override => (
                  <div key={override.round} className="border-l-2 border-primary pl-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-3 w-3 text-primary" />
                        <span className="text-xs">Round {override.round}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRoundOverride(override.round)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {override.items.map((item, index) => {
                        const showIndicatorAbove = dragOverOverrideItemIndex === index && draggedOverrideItemIndex !== null && draggedOverrideItemIndex > index && draggedOverrideRound === override.round;
                        const showIndicatorBelow = dragOverOverrideItemIndex === index && draggedOverrideItemIndex !== null && draggedOverrideItemIndex < index && draggedOverrideRound === override.round;
                        
                        return (
                          <div key={getItemKey(item, index, `round-${override.round}`)}>
                            {showIndicatorAbove && (
                              <div className="h-1 bg-primary rounded mb-2" />
                            )}
                            <div
                              draggable
                              onDragStart={(e) => handleDragStartOverrideItem(e, override.round, index)}
                              onDragOver={(e) => handleDragOverOverrideItem(e, override.round, index)}
                              onDragLeave={handleDragLeaveOverrideItem}
                              onDrop={(e) => handleDropOverrideItem(e, override.round, index)}
                              className={`${draggedOverrideItemIndex === index && draggedOverrideRound === override.round ? 'opacity-50' : ''} transition-opacity`}
                            >
                              {renderItem(
                                item, 
                                index, 
                                () => handleDeleteItemFromRoundOverride(override.round, index),
                                (updated) => handleUpdateItemInRoundOverride(override.round, index, updated),
                                true,
                                override.round,
                                () => handleMoveOverrideItemUp(override.round, index),
                                () => handleMoveOverrideItemDown(override.round, index),
                                index > 0,
                                index < override.items.length - 1
                              )}
                            </div>
                            {showIndicatorBelow && (
                              <div className="h-1 bg-primary rounded mt-2" />
                            )}
                          </div>
                        );
                      })}
                      <Dialog 
                        open={isAddOverrideItemOpen && selectedOverrideRound === override.round}
                        onOpenChange={(open) => {
                          setIsAddOverrideItemOpen(open);
                          if (!open) setSelectedOverrideRound(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setSelectedOverrideRound(override.round)}
                          >
                            <Plus className="h-3 w-3 mr-2" />
                            Add Item to Round {override.round}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Item to Round {override.round}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="pose-select-override">Select Pose</Label>
                              <Select value={selectedPoseId} onValueChange={handlePoseChange}>
                                <SelectTrigger id="pose-select-override">
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
                                <Label htmlFor="variation-select-override">Select Variation</Label>
                                <Select value={selectedVariationId} onValueChange={setSelectedVariationId}>
                                  <SelectTrigger id="variation-select-override">
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
                              <Label htmlFor="duration-override">Duration (MM:SS or HH:MM:SS)</Label>
                              <Input
                                id="duration-override"
                                placeholder="00:30"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={() => handleAddItemToRoundOverride(override.round)} 
                              disabled={!selectedVariationId}
                            >
                              Add Item
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Dialog open={isAddRoundOverrideOpen} onOpenChange={setIsAddRoundOverrideOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <PlusCircle className="h-3 w-3 mr-2" />
                  Add Round Override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Round Override</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="round-number">Round Number (1-{groupBlock.sets})</Label>
                    <Input
                      id="round-number"
                      type="number"
                      min="1"
                      max={groupBlock.sets}
                      placeholder="1"
                      value={newRoundNumber}
                      onChange={(e) => setNewRoundNumber(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add additional poses that will be performed at the end of this specific round.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddRoundOverride}>Add Round Override</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          </CollapsibleContent>
        </Collapsible>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className={isBlockExpanded ? 'mt-0.5' : ''}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
