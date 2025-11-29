export interface BodyMetrics {
  id: string;
  date: string; // ISO String
  weight: number; // kg
  skeletalMuscleMass: number; // kg
  bodyFatMass: number; // kg
  percentBodyFat: number; // %
}

export interface AIAnalysis {
  summary: string;
  muscleTrend: 'up' | 'down' | 'stable';
  fatTrend: 'up' | 'down' | 'stable';
  recommendation: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ADD_DATA = 'ADD_DATA',
  SETTINGS = 'SETTINGS',
}
