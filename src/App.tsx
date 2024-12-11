import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import PSV from './pages/psv';
import MAS from './pages/mas.tsx'; 
import MSV from './pages/msv'; 

function Home() {
  const navigate = useNavigate();

  const buttons = [
    { label: 'Process Scheduler Visualizer', route: '/psv' },
    { label: 'Memory Allocation Simulator', route: '/mas' },
    { label: 'Deadlock Detection and Prevention Tool', route: '/dead' },
    { label: 'Multithreaded Sorting Visualizer', route: '/msv' },
  ];

  const creators = [
    { name: 'Muhammad Bilal', github: 'https://github.com/muhamad-bilal' },
    { name: 'Abdullah Mustafa', github: 'https://github.com/rimocide' },
    { name: 'Umer Sami', github: 'https://github.com/umersami' },
    { name: 'Hamza Motiwala', github: 'https://github.com/moti987' },
  ];

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-black via-gray-900 to-green-900 flex flex-col items-center justify-between px-8 py-4 text-white">
      <div className="w-full flex-grow flex flex-col justify-center">
        <h1 className="text-4xl md:text-5xl font-bold text-green-400 mb-4 text-center">
          Operating System Basics
        </h1>
        <h2 className="text-xl md:text-2xl text-gray-300 mb-12 text-center">
          This website is for anyone struggling to grasp the basics of the Operating Systems course.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {buttons.map((button, index) => (
            <button
              key={index}
              className="bg-gradient-to-r from-gray-800 to-green-800 text-white font-semibold py-4 px-6 w-full rounded-xl shadow-lg border border-green-700 text-center transition-all duration-300 ease-in-out hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50"
              onClick={() => {
                if (button.route) navigate(button.route);
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
      <footer className="mt-8 text-gray-400">
        <p className="mb-2 text-center">Created by:</p>
        <div className="flex flex-wrap justify-center gap-4">
          {creators.map((creator, index) => (
            <a
              key={index}
              href={creator.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-full shadow-md hover:bg-green-900 transition-colors duration-300"
            >
              <Github size={20} className="text-green-400" />
              <span>{creator.name}</span>
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/psv" element={<PSV />} />
        <Route path="/mas" element={<MAS />} />
        <Route path="/msv" element={<MSV />} />
      </Routes>
    </Router>
  );
}