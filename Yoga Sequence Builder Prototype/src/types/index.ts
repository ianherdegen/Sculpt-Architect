// Pose library
export type Pose = {
  id: string;             // unique ID
  name: string;           // pose name
}

export type PoseVariation = {
  id: string;             // unique ID
  poseId: string;         // reference to Pose.id
  name: string;           // variation name
  isDefault: boolean;     // true for exactly one variation per pose
}

// Sequence builder models
export type PoseInstance = {
  type: "pose_instance";
  id: string;                   // unique ID
  poseVariationId: string;     // reference to PoseVariation.id
  duration: string;             // time duration in format "HH:MM:SS" or "MM:SS"
}

export type RoundOverride = {
  round: number;                 // 1-based round index
  items: Array<PoseInstance | GroupBlock>;  // additional items appended to the end of this round
}

export type GroupBlock = {
  type: "group_block";
  id: string;                   // unique ID
  sets: number; 
  items: Array<PoseInstance | GroupBlock>;
  roundOverrides: Array<RoundOverride>;
}

export type Section = {
  type: "section";
  id: string;
  name: string;
  items: Array<PoseInstance | GroupBlock>;
}

export type Sequence = {
  id: string;
  name: string;
  sections: Section[];
}
