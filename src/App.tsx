import { useParams } from 'react-router-dom';
import Editor from './screens/Editor';

function App() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <Editor projectId={projectId ?? 'new'} />
    </div>
  );
}

export default App;