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
