export interface TattooFormData {
  style: string;
  meaning: string;
  bodyPart: string;
  referenceImage: string | null;
}

export interface TattooConcept {
  title: string;
  narrative: string;
  technicalPrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  currentStyle?: string;
}

export interface DesignHistoryEntry {
  id: string;
  timestamp: number;
  concept: TattooConcept;
  style: string;
  bodyPart: string;
  meaning: string;
  finalImageUrl?: string;
}
