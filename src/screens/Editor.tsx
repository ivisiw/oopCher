import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Square, Save } from 'lucide-react';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const goBack = () => navigate(-1);
  const saveAndGoHome = () => navigate('/', { replace: true });

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Верхняя панель */}
      <header className="flex justify-between items-center bg-slate-800 border-b border-slate-700 p-4 rounded-t-xl">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>
        <h2 className="text-lg font-semibold">
          {id === 'new' ? 'New Project' : `Editing Project ${id}`}
        </h2>
        <button
          onClick={saveAndGoHome}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Save size={18} /> Save
        </button>
      </header>

      {/* Основная область */}
      <div className="flex flex-1 overflow-hidden">
        {/* Левая панель инструментов */}
        <aside className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600"
          >
            <Square size={24} />
          </motion.button>
        </aside>

        {/* Центральный холст */}
        <main className="flex-1 bg-slate-100 flex items-center justify-center p-8">
          <div className="w-full max-w-3xl h-full bg-white rounded-lg shadow-2xl flex items-center justify-center text-slate-400">
          </div>
        </main>

        {/* Правая панель свойств */}
        <aside className="w-64 bg-slate-800 border-l border-slate-700 p-4">
          <h3 className="font-semibold mb-4">Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Color</label>
              <input type="color" className="w-full h-10 rounded bg-slate-700 border border-slate-600" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}