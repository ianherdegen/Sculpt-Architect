import { Pose, PoseVariation, Sequence } from '../types';

export const initialPoses: Pose[] = [
  { id: "pose-1", name: "Mountain Pose" },
  { id: "pose-2", name: "Downward Dog" },
  { id: "pose-3", name: "Warrior I" },
  { id: "pose-4", name: "Child's Pose" },
];

export const initialVariations: PoseVariation[] = [
  { id: "var-1", poseId: "pose-1", name: "Mountain Pose (Default)", isDefault: true },
  { id: "var-2a", poseId: "pose-2", name: "Downward Dog (Default)", isDefault: true },
  { id: "var-2b", poseId: "pose-2", name: "Downward Dog with Bent Knees", isDefault: false },
  { id: "var-3", poseId: "pose-3", name: "Warrior I (Default)", isDefault: true },
  { id: "var-3b", poseId: "pose-3", name: "Warrior I with Arms Extended", isDefault: false },
  { id: "var-4", poseId: "pose-4", name: "Child's Pose (Default)", isDefault: true },
];

export const initialSequences: Sequence[] = [
  {
    id: "seq-1",
    name: "Morning Flow",
    sections: [
      {
        type: "section",
        id: "section-1",
        name: "Warm Up",
        items: [
          {
            type: "pose_instance",
            id: "pose-instance-1",
            poseVariationId: "var-1",
            duration: "00:30",
          },
          {
            type: "group_block",
            id: "group-block-1",
            sets: 3,
            items: [
              {
                type: "pose_instance",
                id: "pose-instance-2",
                poseVariationId: "var-2a",
                duration: "00:45",
              },
              {
                type: "pose_instance",
                id: "pose-instance-3",
                poseVariationId: "var-4",
                duration: "00:30",
              },
            ],
            roundOverrides: [
              {
                round: 3,
                items: [
                  {
                    type: "pose_instance",
                    id: "pose-instance-4",
                    poseVariationId: "var-2b",
                    duration: "01:00",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "section",
        id: "section-2",
        name: "Standing Series",
        items: [
          {
            type: "pose_instance",
            id: "pose-instance-5",
            poseVariationId: "var-3",
            duration: "01:00",
          },
          {
            type: "pose_instance",
            id: "pose-instance-6",
            poseVariationId: "var-3b",
            duration: "01:00",
          },
        ],
      },
    ],
  },
];
