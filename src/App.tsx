import { useState } from 'react';
import Dashboard from './screens/Dashboard';
import Questionnaire from './screens/Questionnaire';
import Ideas from './screens/Ideas';
import Studio3D from './screens/Studio3D';
import Loading from './screens/Loading';
import type { TattooIdea } from './lib/gemini';

export type ScreenState = 'dashboard' | 'questionnaire' | 'loading' | 'ideas' | 'studio3d';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('dashboard');
  const [ideas, setIdeas] = useState<TattooIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<TattooIdea | null>(null);

  const navigate = (screen: ScreenState) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      {currentScreen === 'dashboard' && (
        <Dashboard onStart={() => navigate('questionnaire')} />
      )}
      {currentScreen === 'questionnaire' && (
        <Questionnaire
          onGenerate={(generatedIdeas: TattooIdea[]) => {
            setIdeas(generatedIdeas);
            navigate('ideas');
          }}
          onLoading={() => navigate('loading')}
        />
      )}
      {currentScreen === 'loading' && <Loading />}
      {currentScreen === 'ideas' && (
        <Ideas
          ideas={ideas}
          onSelect={(idea: TattooIdea) => {
            setSelectedIdea(idea);
            navigate('studio3d');
          }}
          onBack={() => navigate('dashboard')}
        />
      )}
      {currentScreen === 'studio3d' && (
        <Studio3D
          idea={selectedIdea || undefined}
          onBack={() => navigate('ideas')}
        />
      )}
    </>
  );
}
