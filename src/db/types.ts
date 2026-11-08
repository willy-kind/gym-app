export interface Exercise {
  id?: number
  name: string
  muscleGroup?: string
  notes?: string
}

export interface Program {
  id?: number
  name: string
  notes?: string
  archived: boolean
}

export interface ProgramDay {
  id?: number
  programId: number
  name: string
  order: number
}

export interface ProgramDayExercise {
  id?: number
  programDayId: number
  exerciseId: number
  order: number
  targetSets: number
  /** e.g. "8-10" */
  targetReps: string
  /** kg; 0 = bodyweight */
  targetWeight?: number
  restSeconds: number
}

export interface Session {
  id?: number
  programDayId?: number
  startedAt: number
  finishedAt?: number
  notes?: string
}

export interface WorkoutSet {
  id?: number
  sessionId: number
  exerciseId: number
  order: number
  /** kg; 0 = bodyweight (plus any extra load) */
  weight: number
  reps: number
  isWarmup: boolean
  completedAt: number
}
