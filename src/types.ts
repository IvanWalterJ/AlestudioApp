export interface TattooFormData {
  style: string;
  meaning: string;
  bodyPart: string;
  size: string;
}

export interface TattooConcept {
  title: string;
  narrative: string;
  technicalPrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  currentStyle?: string;
}
