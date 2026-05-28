import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  date: string;
};

export default function Gallery() {
  const [projects, setProjects] = useState<Project[]>([]);

  const addProject = () => {
    const newId = (projects.length + 1).toString();
    const newProject: Project = {
      id: newId,
      name: `Project ${newId}`,
      date: new Date().toLocaleDateString(),
    };
    setProjects([...projects, newProject]);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your projects</h2>
        <button
          onClick={addProject}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} /> Create project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-slate-400">No projects yet. Create your first one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link to={`/editor/${project.id}`} key={project.id}>
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-slate-800 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                <p className="text-slate-400 text-sm">{project.date}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}