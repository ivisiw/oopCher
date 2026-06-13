import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadProjectIndex, deleteProject, generateId, type ProjectMeta } from '../lib/projectStorage';

export default function Gallery() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectIndex().then(list => {
      setProjects(list);
      setLoading(false);
    });
  }, []);

  const createNew = () => {
    const id = generateId();
    navigate(`/editor/${id}`);
  };

  const openProject = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '40px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f1f5f9' }}>VectorEngine</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Мои проекты</p>
        </div>
        <button onClick={createNew} style={{
          padding: '10px 24px', background: '#3b82f6', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
        onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
        >
          + Новый проект
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#475569', fontSize: 15 }}>Загрузка...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <div style={{ color: '#475569', fontSize: 16, marginBottom: 24 }}>Проектов пока нет</div>
          <button onClick={createNew} style={{
            padding: '12px 32px', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600,
          }}>Создать первый проект</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {[...projects].reverse().map(project => (
            <div key={project.id} onClick={() => openProject(project.id)}
              style={{
                background: '#1e293b', borderRadius: 12, padding: '20px',
                cursor: 'pointer', border: '1px solid #334155', position: 'relative',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}
            >
              <div style={{
                height: 120, background: '#0f172a', borderRadius: 8, marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#334155', fontSize: 32,
              }}>🖼</div>

              <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Изменён: {formatDate(project.updatedAt)}
              </div>
              <button
                onClick={e => handleDelete(e, project.id)}
                title="Удалить проект"
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 28, height: 28, border: 'none', borderRadius: 6,
                  background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 14,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#7f1d1d'; e.currentTarget.style.color = '#fca5a5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}