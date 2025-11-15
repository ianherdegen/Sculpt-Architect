import React, { useState, useEffect, useRef } from 'react';
import { Sequence, Pose, PoseVariation, GroupBlock, PoseInstance } from '../types';
import { Clock, Download, Play, Pause, RotateCcw, Gauge, ArrowLeft, Share2, Check } from 'lucide-react';
import { calculateSequenceDuration, formatDuration, calculateGroupBlockDuration, calculateSectionDuration, flattenSequenceToTimeline, parseDuration, TimelineItem } from '../lib/timeUtils';
import { useIsMobile } from './ui/use-mobile';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from './ui/card';
import { sequenceService } from '../lib/supabaseService';
import { useAuth } from '../lib/auth';

interface SequenceViewProps {
  sequences: Sequence[];
  poses: Pose[];
  variations: PoseVariation[];
  onUpdateSequence?: (id: string, updates: Partial<Sequence>) => Promise<void>;
}

// Storage key for persisting timer state
const TIMER_STORAGE_KEY = 'sequence-timer-state';

interface TimerState {
  isPlaying: boolean;
  currentTime: number;
  activeSequenceId: string | null;
  activeItemId: string | null;
  currentItemRemaining: number;
  playbackSpeed: number;
}

export function SequenceView({ sequences, poses, variations, onUpdateSequence }: SequenceViewProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { sequenceId } = useParams<{ sequenceId: string }>();
  const { user } = useAuth();
  const [localSequence, setLocalSequence] = useState<Sequence | null>(null);
  const [copied, setCopied] = useState(false);
  
  const sequence = localSequence || sequences.find(s => s.id === sequenceId);
  
  // Update local sequence when sequences prop changes
  useEffect(() => {
    const foundSequence = sequences.find(s => s.id === sequenceId);
    if (foundSequence) {
      setLocalSequence(foundSequence);
    }
  }, [sequences, sequenceId]);
  
  // Redirect if sequence not found
  useEffect(() => {
    if (!sequence && sequences.length > 0) {
      navigate('/sequence-library');
    }
  }, [sequence, sequences, navigate]);
  
  if (!sequence) {
    return (
      <div className={`${isMobile ? 'p-0' : 'p-4'}`}>
        <div className="text-center py-12 text-muted-foreground">
          <p>Sequence not found.</p>
          <Button onClick={() => navigate('/sequence-library')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }
  
  // Don't persist state - reset on page refresh/exit
  // Use sessionStorage only for tab switching (which we'll clear on unload)
  const [initialState] = useState<Partial<TimerState>>(() => {
    // Clear any stored state on mount (page refresh)
    try {
      sessionStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (e) {
      // Ignore errors
    }
    // Always start fresh - no state restoration
    return {};
  });
  
  // Timer state
  const [isPlaying, setIsPlaying] = useState(initialState.isPlaying ?? false);
  const [currentTime, setCurrentTime] = useState(initialState.currentTime ?? 0);
  const [activeItemId, setActiveItemId] = useState<string | null>(initialState.activeItemId ?? null);
  const [currentItemRemaining, setCurrentItemRemaining] = useState<number>(initialState.currentItemRemaining ?? 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(initialState.playbackSpeed ?? 1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timelineRef = useRef<TimelineItem[]>([]);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const lastSpokenItemIdRef = useRef<string | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const activeItemIdRef = useRef<string | null>(null);
  
  // Initialize speech synthesis and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
      
      // Load voices (they might not be available immediately)
      const loadVoices = () => {
        if (speechSynthesisRef.current) {
          speechSynthesisRef.current.getVoices();
        }
      };
      
      loadVoices();
      if (speechSynthesisRef.current.onvoiceschanged !== undefined) {
        speechSynthesisRef.current.onvoiceschanged = loadVoices;
      }
    }
  }, []);
  
  // Keep ref in sync with state
  useEffect(() => {
    activeItemIdRef.current = activeItemId;
  }, [activeItemId]);
  
  const getPoseInfo = (variationId: string) => {
    const variation = variations.find(v => v.id === variationId);
    const pose = variation ? poses.find(p => p.id === variation.poseId) : null;
    return { pose, variation };
  };

  // Function to speak the pose name
  const speakPoseName = (timelineItem: TimelineItem) => {
    // Only speak if speech synthesis is available and this is a new item
    if (!speechSynthesisRef.current || timelineItem.id === lastSpokenItemIdRef.current) {
      return;
    }

    const { pose, variation } = getPoseInfo(timelineItem.poseInstance.poseVariationId);
    if (!pose) return;

    // Build the text to speak
    let textToSpeak = pose.name;
    if (variation && !variation.name.includes('(Default)')) {
      textToSpeak += ` ${variation.name}`;
    }

    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();

    // Create and speak the utterance
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
    
    // Try to use a more natural voice if available
    const voices = speechSynthesisRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && (voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Karen'))
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechSynthesisRef.current.speak(utterance);
    lastSpokenItemIdRef.current = timelineItem.id;
  };

  // Use sessionStorage for tab switching (cleared on page refresh/unload)
  useEffect(() => {
    const state: TimerState = {
      isPlaying,
      currentTime,
      activeSequenceId: sequenceId || null,
      activeItemId,
      currentItemRemaining,
      playbackSpeed,
    };
    try {
      // Use sessionStorage instead of localStorage - cleared on page refresh
      sessionStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save timer state:', e);
    }
  }, [isPlaying, currentTime, sequenceId, activeItemId, currentItemRemaining, playbackSpeed]);

  // Clear state on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear sessionStorage on page unload
      try {
        sessionStorage.removeItem(TIMER_STORAGE_KEY);
      } catch (e) {
        console.error('Failed to clear timer state:', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Initialize timeline when sequence is selected or state is restored
  useEffect(() => {
    if (sequence) {
      timelineRef.current = flattenSequenceToTimeline(sequence);
      // Update active item based on current time when timeline is initialized
      const timeline = timelineRef.current;
      if (timeline.length > 0) {
        const currentItem = timeline.find(item => 
          currentTime >= item.startTime && currentTime < item.endTime
        );
        if (currentItem) {
          setActiveItemId(currentItem.id);
          setCurrentItemRemaining(Math.max(0, currentItem.endTime - currentTime));
        } else {
          // Check if we're past the end
          const totalDuration = timeline[timeline.length - 1].endTime;
          if (currentTime >= totalDuration) {
            setActiveItemId(null);
            setCurrentItemRemaining(0);
            if (isPlaying) {
              setIsPlaying(false);
            }
          } else {
            setActiveItemId(null);
            setCurrentItemRemaining(0);
          }
        }
      }
    }
  }, [sequence, currentTime, isPlaying]);

  // Timer effect with speed control and tab visibility handling
  useEffect(() => {
    if (isPlaying && sequenceId) {
      // Initialize last update time when starting
      if (!intervalRef.current) {
        lastUpdateTimeRef.current = Date.now();
        
        // If starting from time 0, immediately check for first pose and speak it
        if (currentTime === 0) {
          const timeline = timelineRef.current;
          if (timeline.length > 0) {
            const firstItem = timeline[0];
            if (firstItem.startTime === 0) {
              setActiveItemId(firstItem.id);
              setCurrentItemRemaining(firstItem.endTime - firstItem.startTime);
              activeItemIdRef.current = firstItem.id;
              // Speak the first pose immediately
              setTimeout(() => {
                speakPoseName(firstItem);
              }, 100);
            }
          }
        }
      }
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = (now - lastUpdateTimeRef.current) / 1000; // elapsed seconds
        lastUpdateTimeRef.current = now;
        
        // Account for playback speed
        const timeIncrement = elapsed * playbackSpeed;
        
        setCurrentTime(prev => {
          const newTime = prev + timeIncrement;
          const timeline = timelineRef.current;
          
          // Find current active item
          const currentItem = timeline.find(item => 
            newTime >= item.startTime && newTime < item.endTime
          );
          
          if (currentItem) {
            // Check if this is a new item (just started) using ref for accurate comparison
            const isNewItem = activeItemIdRef.current !== currentItem.id;
            
            setActiveItemId(currentItem.id);
            const remaining = currentItem.endTime - newTime;
            setCurrentItemRemaining(Math.max(0, remaining));
            
            // Speak the pose name when a new item becomes active
            if (isNewItem) {
              // Use a small delay to ensure state is updated
              setTimeout(() => {
                speakPoseName(currentItem);
              }, 50);
            }
          } else {
            // Check if we've reached the end
            const totalDuration = timeline.length > 0 
              ? timeline[timeline.length - 1].endTime 
              : 0;
            
            if (newTime >= totalDuration) {
              setIsPlaying(false);
              setActiveItemId(null);
              setCurrentItemRemaining(0);
              return totalDuration;
            } else {
              setActiveItemId(null);
              setCurrentItemRemaining(0);
            }
          }
          
          return newTime;
        });
      };

      // Use interval that works in background tabs
      // Update more frequently for smoother progress bar
      const intervalMs = 100; // Update every 100ms for smooth progress
      intervalRef.current = setInterval(updateTimer, intervalMs) as any;
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isPlaying, sequenceId, playbackSpeed, currentTime]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      // Starting - initialize timeline first
      if (sequence) {
        timelineRef.current = flattenSequenceToTimeline(sequence);
        lastUpdateTimeRef.current = Date.now();
        lastSpokenItemIdRef.current = null; // Reset so first pose will be spoken
        
        // If starting from the beginning, set up first pose immediately
        if (currentTime === 0) {
          const timeline = timelineRef.current;
          if (timeline.length > 0) {
            const firstItem = timeline[0];
            if (firstItem.startTime === 0) {
              setActiveItemId(firstItem.id);
              setCurrentItemRemaining(firstItem.endTime - firstItem.startTime);
              activeItemIdRef.current = firstItem.id;
            }
          }
        }
      }
    } else {
      // Resuming - update last update time
      lastUpdateTimeRef.current = Date.now();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveItemId(null);
    setCurrentItemRemaining(0);
    lastUpdateTimeRef.current = Date.now();
    lastSpokenItemIdRef.current = null;
    // Cancel any ongoing speech
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
  };

  const handleSpeedChange = (speed: string) => {
    const speedNum = parseFloat(speed);
    setPlaybackSpeed(speedNum);
    // Update last update time when speed changes to prevent jumps
    lastUpdateTimeRef.current = Date.now();
  };

  const exportSequenceToHTML = (sequence: Sequence) => {
    const getPoseName = (variationId: string) => {
      const { pose, variation } = getPoseInfo(variationId);
      if (!pose) return 'Unknown';
      if (variation && !variation.name.includes('(Default)')) {
        return `${pose.name} (${variation.name})`;
      }
      return pose.name;
    };

    const renderPoseInstanceHTML = (poseInstance: PoseInstance, indent: number = 0): string => {
      const name = getPoseName(poseInstance.poseVariationId);
      const indentStyle = `padding-left: ${indent * 12}px;`;
      return `
        <div style="${indentStyle} display: flex; justify-content: space-between; padding: 4px 0;">
          <div>${name}</div>
          <div style="font-size: 12px; color: #666;">${poseInstance.duration}</div>
        </div>
      `;
    };

    const getEffectiveItemsForRound = (groupBlock: GroupBlock, round: number): Array<PoseInstance | GroupBlock> => {
      const itemSubstitutes = groupBlock.itemSubstitutes || [];
      const roundSubstitutes = itemSubstitutes.filter(s => s.round === round);
      const effectiveItems = [...groupBlock.items];
      roundSubstitutes.forEach(substitute => {
        if (substitute.itemIndex >= 0 && substitute.itemIndex < effectiveItems.length) {
          effectiveItems[substitute.itemIndex] = substitute.substituteItem;
        }
      });
      return effectiveItems;
    };

    const renderGroupBlockHTML = (groupBlock: GroupBlock, indent: number = 0): string => {
      const itemSubstitutes = groupBlock.itemSubstitutes || [];
      const roundOverrides = groupBlock.roundOverrides || [];
      const groupDuration = formatDuration(calculateGroupBlockDuration(groupBlock));
      const indentStyle = `padding-left: ${indent * 12}px;`;
      
      let html = `
        <div style="margin: 8px 0;">
          <div style="${indentStyle} display: flex; justify-content: space-between; padding: 4px 0;">
            <div><strong>Group:</strong> ${groupBlock.sets} sets</div>
            <div><strong>${groupDuration}</strong></div>
          </div>
      `;

      // Base items
      html += `<div style="padding-left: ${(indent + 1) * 12}px;">`;
      groupBlock.items.forEach((item, idx) => {
        const substitutionsForThisItem = itemSubstitutes.filter(s => s.itemIndex === idx);
        
        if (item.type === 'pose_instance') {
          html += renderPoseInstanceHTML(item, indent + 1);
        } else {
          html += renderGroupBlockHTML(item, indent + 1);
        }
        
        // Substitutions
        substitutionsForThisItem.forEach(substitute => {
          if (substitute.substituteItem.type === 'pose_instance') {
            const name = getPoseName(substitute.substituteItem.poseVariationId);
            html += `
              <div style="padding-left: ${(indent + 2) * 12}px; color: #ea580c; font-size: 12px; display: flex; justify-content: space-between; padding: 4px 0;">
                <span>Round ${substitute.round}: ${name}</span>
                <span>${substitute.substituteItem.duration}</span>
              </div>
            `;
          } else {
            const duration = formatDuration(calculateGroupBlockDuration(substitute.substituteItem));
            html += `
              <div style="padding-left: ${(indent + 2) * 12}px; color: #ea580c; font-size: 12px; display: flex; justify-content: space-between; padding: 4px 0;">
                <span>Round ${substitute.round}: Group Block</span>
                <span>${duration}</span>
              </div>
            `;
          }
        });
      });
      html += `</div>`;

      // Round overrides
      roundOverrides.forEach(override => {
        html += `
          <div style="padding-left: ${(indent + 1) * 12}px; margin-top: 8px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              Round ${override.round} Ending${override.sets && override.sets > 1 ? ` (${override.sets} sets)` : ''}:
            </div>
        `;
        override.items.forEach(item => {
          if (item.type === 'pose_instance') {
            html += renderPoseInstanceHTML(item, indent + 2);
          } else {
            html += renderGroupBlockHTML(item, indent + 2);
          }
        });
        html += `</div>`;
      });

      html += `</div>`;
      return html;
    };

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${sequence.name}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    h2 {
      margin-top: 30px;
      margin-bottom: 10px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    h3 {
      margin-top: 0;
      margin-bottom: 5px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 10px;
    }
    .section-divider {
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>
    <span>${sequence.name}</span>
    <span style="font-size: 18px; font-weight: normal;">${formatDuration(calculateSequenceDuration(sequence))}</span>
  </h1>
`;

    sequence.sections.forEach((section, sectionIndex) => {
      const sectionDuration = formatDuration(calculateSectionDuration(section));
      
      if (sectionIndex > 0) {
        html += `<div class="section-divider"></div>`;
      }
      
      html += `
        <div class="section-header">
          <h2>${section.name}</h2>
          <strong>${sectionDuration}</strong>
        </div>
      `;

      if (section.items.length === 0) {
        html += `<p style="font-style: italic; color: #666; padding-left: 12px;">Empty section</p>`;
      } else {
        html += `<div style="padding-left: 12px;">`;
        section.items.forEach(item => {
          if (item.type === 'pose_instance') {
            html += renderPoseInstanceHTML(item, 0);
          } else {
            html += renderGroupBlockHTML(item, 0);
          }
        });
        html += `</div>`;
      }
    });

    html += `
</body>
</html>`;

    // Download as HTML file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sequence.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to check if a pose instance is currently active
  const isPoseInstanceActive = (poseInstance: PoseInstance): boolean => {
    if (!activeItemId) return false;
    // Timeline items have IDs like `${item.id}-round-${round}` or `${item.id}-override-round-${round}-set-${set}`
    // So we check if the activeItemId starts with the pose instance ID
    return activeItemId.startsWith(poseInstance.id);
  };

  const renderPoseInstance = (poseInstance: PoseInstance, indent: number = 0) => {
    const { pose, variation } = getPoseInfo(poseInstance.poseVariationId);
    const isActive = isPoseInstanceActive(poseInstance);
    
    return (
      <div 
        key={poseInstance.id} 
        className={`flex items-baseline justify-between gap-2 py-1 transition-colors ${
          isActive 
            ? 'bg-primary/20 border-l-4 border-primary rounded-r px-2 -ml-2' 
            : ''
        }`}
        style={{ paddingLeft: `${indent * 12}px` }}
      >
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${isActive ? 'font-semibold' : ''}`}>
            {pose?.name || 'Unknown'}
          </span>
          {variation && !variation.name.includes('(Default)') && (
            <span className="text-xs text-muted-foreground ml-2">({variation.name})</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {poseInstance.duration}
          {isActive && currentItemRemaining > 0 && (
            <span className="ml-2 text-primary font-semibold">
              ({formatDuration(Math.floor(currentItemRemaining))})
            </span>
          )}
        </span>
      </div>
    );
  };

  // Helper function to get effective items for a specific round
  const getEffectiveItemsForRound = (groupBlock: GroupBlock, round: number): Array<PoseInstance | GroupBlock> => {
    const itemSubstitutes = groupBlock.itemSubstitutes || [];
    const roundSubstitutes = itemSubstitutes.filter(s => s.round === round);
    
    // Start with base items
    const effectiveItems = [...groupBlock.items];
    
    // Apply substitutions for this round
    roundSubstitutes.forEach(substitute => {
      if (substitute.itemIndex >= 0 && substitute.itemIndex < effectiveItems.length) {
        effectiveItems[substitute.itemIndex] = substitute.substituteItem;
      }
    });
    
    return effectiveItems;
  };

  const renderGroupBlock = (groupBlock: GroupBlock, indent: number = 0) => {
    const itemSubstitutes = groupBlock.itemSubstitutes || [];
    const roundOverrides = groupBlock.roundOverrides || [];
    
    return (
      <div key={groupBlock.id} className="my-2">
        <div className="flex items-baseline justify-between gap-2 py-1" style={{ paddingLeft: `${indent * 12}px` }}>
          <div className="flex-1">
            <span className="text-sm">
              <span className="text-muted-foreground">Group:</span> {groupBlock.sets} sets
            </span>
          </div>
          <span className="text-sm text-black dark:text-white whitespace-nowrap flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(calculateGroupBlockDuration(groupBlock))}
          </span>
        </div>
        
        {/* Base items with inline substitutions */}
        <div style={{ paddingLeft: `${(indent + 1) * 12}px` }}>
          {groupBlock.items.map((item, idx) => {
            const substitutionsForThisItem = itemSubstitutes.filter(s => s.itemIndex === idx);
            
            return (
              <div key={`${item.id}-${idx}`} className="my-1">
                {/* Base item */}
                {item.type === 'pose_instance' ? (
                  <div>{renderPoseInstance(item, indent + 1)}</div>
                ) : (
                  <div>{renderGroupBlock(item, indent + 1)}</div>
                )}
                
                {/* Inline substitutions for this item */}
                {substitutionsForThisItem.length > 0 && (
                  <div className="ml-4">
                    {substitutionsForThisItem.map((substitute) => {
                  if (substitute.substituteItem.type === 'pose_instance') {
                    const poseInstance = substitute.substituteItem;
                    const variation = poseInstance.poseVariationId ? variations.find(v => v.id === poseInstance.poseVariationId) : null;
                    const pose = variation ? poses.find(p => p.id === variation.poseId) : null;
                    const displayName = variation ? `${pose?.name || 'Unknown'} (${variation.name})` : 'Unknown';
                    const isActive = isPoseInstanceActive(poseInstance);
                    
                    return (
                      <div 
                        key={`${substitute.round}-${substitute.itemIndex}`} 
                        className={`ml-8 flex items-baseline justify-between gap-2 py-1 transition-colors ${
                          isActive 
                            ? 'bg-primary/20 border-l-4 border-primary rounded-r px-2 -ml-2' 
                            : ''
                        }`}
                      >
                        <span className={`text-xs ${isActive ? 'text-primary font-semibold' : 'text-orange-600 dark:text-orange-400'}`}>
                          Round {substitute.round}: {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {poseInstance.duration}
                          {isActive && currentItemRemaining > 0 && (
                            <span className="ml-2 text-primary font-semibold">
                              ({formatDuration(Math.floor(currentItemRemaining))})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  } else {
                    const groupBlock = substitute.substituteItem;
                    const duration = formatDuration(calculateGroupBlockDuration(groupBlock));
                    
                    return (
                      <div key={`${substitute.round}-${substitute.itemIndex}`} className="ml-8 flex items-baseline justify-between gap-2 py-1">
                        <span className="text-xs text-orange-600 dark:text-orange-400">
                          Round {substitute.round}: Group Block
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </span>
                      </div>
                    );
                  }
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Round overrides */}
        {roundOverrides.map((override) => (
          <div key={override.round} className="mt-2" style={{ paddingLeft: `${(indent + 1) * 12}px` }}>
            <div className="text-xs text-muted-foreground mb-1">
              Round {override.round} Ending{override.sets && override.sets > 1 ? ` (${override.sets} sets)` : ''}:
            </div>
            {override.items.map((item, idx) => {
              if (item.type === 'pose_instance') {
                return <div key={`${item.id}-${idx}`} className="ml-2">{renderPoseInstance(item, indent + 2)}</div>;
              } else {
                return <div key={`${item.id}-${idx}`} className="ml-2">{renderGroupBlock(item, indent + 2)}</div>;
              }
            })}
          </div>
        ))}
      </div>
    );
  };

  const handleShare = async () => {
    if (!sequence) return;
    
    try {
      // Use sequence UUID directly for sharing
      const shareUrl = `${window.location.origin}/sequence/${sequence.id}`;
      
      // Detect mobile/tablet devices
      const isMobileDevice = isMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                              (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
      
      // Use Web Share API on mobile/tablet if available
      if (isMobileDevice && navigator.share) {
        try {
          await navigator.share({
            title: sequence.name,
            text: `Check out this yoga sequence: ${sequence.name}`,
            url: shareUrl,
          });
          return;
        } catch (error: any) {
          // User cancelled or share failed, fall through to clipboard
          if (error.name !== 'AbortError') {
            console.error('Web Share API failed:', error);
          }
        }
      }
      
      // Try to copy to clipboard (desktop or fallback for mobile)
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        }
      } catch (error) {
        console.error('Clipboard API failed:', error);
      }
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '0';
        textArea.style.top = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.opacity = '0';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
    } catch (error) {
      console.error('Error sharing sequence:', error);
      alert('Failed to share sequence. Please try again.');
    }
  };

  const totalDuration = calculateSequenceDuration(sequence);
  const progress = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;
  const displayTime = Math.floor(currentTime);

  return (
    <div className={`${isMobile ? 'p-0' : 'p-4'} space-y-4`}>
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/sequence-library')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{sequence.name}</h1>
      </div>

      {/* Sequence Header */}
      <div className="border-b pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-black dark:text-white whitespace-nowrap flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <strong>{formatDuration(totalDuration)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className={isMobile ? 'h-8 px-2' : ''}
              >
                {copied ? (
                  <>
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1 text-green-600`} />
                    {!isMobile && <span className="text-green-600">Copied!</span>}
                  </>
                ) : (
                  <>
                    <Share2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                    {!isMobile && 'Share'}
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSequenceToHTML(sequence)}
              className={isMobile ? 'h-8 px-2' : ''}
              title="Export as printable HTML"
            >
              <Download className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
              {!isMobile && 'Export'}
            </Button>
          </div>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex flex-col gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={handlePlayPause}
            disabled={sequence.sections.length === 0}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Play
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <Select value={playbackSpeed.toString()} onValueChange={handleSpeedChange}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="2.5">2.5x</SelectItem>
                <SelectItem value="3">3x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {formatDuration(displayTime)} / {formatDuration(totalDuration)}
            </span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sections */}
      {sequence.sections.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No sections</p>
      ) : (
        sequence.sections.map((section, sectionIndex) => (
          <div key={section.id} className="space-y-1">
            {/* Section Divider */}
            {sectionIndex > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
            )}
            
            {/* Section Header */}
            <div className="flex items-baseline justify-between gap-2 pt-2">
              <h4 className="text-sm"><strong>{section.name}</strong></h4>
              <span className="text-sm text-black dark:text-white whitespace-nowrap flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <strong>{formatDuration(calculateSectionDuration(section))}</strong>
              </span>
            </div>

            {/* Section Items */}
            {section.items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-3">Empty section</p>
            ) : (
              <div className="pl-3">
                {section.items.map((item, idx) => {
                  if (item.type === 'pose_instance') {
                    return <div key={`${item.id}-${idx}`}>{renderPoseInstance(item, 0)}</div>;
                  } else {
                    return <div key={`${item.id}-${idx}`}>{renderGroupBlock(item, 0)}</div>;
                  }
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

