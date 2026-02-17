export type Routine = {
  id: string;
  name: string;
  description: string;
};

export const ROUTINES: Routine[] = [
  {
    id: "routine-upper",
    name: "Upper Body",
    description: "Push + pull 기본 루틴",
  },
  {
    id: "routine-lower",
    name: "Lower Body",
    description: "Squat + hinge 기본 루틴",
  },
];
