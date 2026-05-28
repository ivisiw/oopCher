import { NavLink } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">VectorEngine</h1>
        <div className="space-x-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-3 py-2 rounded transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
            end
          >
            Gallery
          </NavLink>
          <NavLink
            to="/editor/new"
            className={({ isActive }) =>
              `px-3 py-2 rounded transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            Create
          </NavLink>
        </div>
      </div>
    </nav>
  );
}