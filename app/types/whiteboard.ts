export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export interface TutorFeedback {
  code: string;
  logic_intent: string;
  missing_edge_cases: string[];
  tutor_hint: string;
  no_algorithm?: boolean;
}

export interface CapturedFrame {
  name: string;
  time: string;
  size: string;
  success: boolean;
  tutorFeedback?: TutorFeedback;
}
