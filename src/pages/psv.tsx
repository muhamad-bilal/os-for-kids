import { useState } from "react";

type Row = {
  process: string;
  arrivalTime: number;
  executeTime: number;
  priority: string;
};

type ExecutionStep = {
  process: string;
  time: number;
  startTime: number;
};

export default function ProcessSchedulerVisualizer() {
  const [rows, setRows] = useState<Row[]>([
    { process: 'P0', arrivalTime: 0, executeTime: 5, priority: '3' },
    { process: 'P1', arrivalTime: 1, executeTime: 3, priority: '1' }
  ]);

  const [algorithm, setAlgorithm] = useState<string>('fcfs');
  const [quantum, setQuantum] = useState<number>(3);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [totalExecutionTime, setTotalExecutionTime] = useState<number>(0);

  const addRow = () => {
    const newRow: Row = {
      process: `P${rows.length}`,
      arrivalTime: 0,
      executeTime: 0,
      priority: ''
    };
    setRows([...rows, newRow]);
  };

  const deleteRow = (index: number) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  // Updated FCFS implementation
  const scheduleFCFS = (processes: Row[]): ExecutionStep[] => {
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const steps: ExecutionStep[] = [];
    let currentTime = 0;

    sortedProcesses.forEach((process) => {
      if (currentTime < process.arrivalTime) {
        currentTime = process.arrivalTime;
      }
      steps.push({
        process: process.process,
        time: process.executeTime,
        startTime: currentTime
      });
      currentTime += process.executeTime;
    });

    return steps;
  };

  // Updated SJF implementation (Non-preemptive)
  const scheduleSJF = (processes: Row[]): ExecutionStep[] => {
    const steps: ExecutionStep[] = [];
    let currentTime = 0;
    let remainingProcesses = [...processes];

    while (remainingProcesses.length > 0) {
      // Find available processes at current time
      const availableProcesses = remainingProcesses.filter(
        p => p.arrivalTime <= currentTime
      );

      if (availableProcesses.length === 0) {
        // Jump to next arrival time if no processes are available
        const nextArrival = Math.min(...remainingProcesses.map(p => p.arrivalTime));
        currentTime = nextArrival;
        continue;
      }

      // Select process with shortest execution time
      const selectedProcess = availableProcesses.reduce((prev, curr) =>
        prev.executeTime < curr.executeTime ? prev : curr
      );

      steps.push({
        process: selectedProcess.process,
        time: selectedProcess.executeTime,
        startTime: currentTime
      });

      currentTime += selectedProcess.executeTime;
      remainingProcesses = remainingProcesses.filter(p => p.process !== selectedProcess.process);
    }

    return steps;
  };

  // Updated Priority scheduling implementation (Non-preemptive)
  const schedulePriority = (processes: Row[]): ExecutionStep[] => {
    const steps: ExecutionStep[] = [];
    let currentTime = 0;
    let remainingProcesses = [...processes];

    while (remainingProcesses.length > 0) {
      // Find available processes at current time
      const availableProcesses = remainingProcesses.filter(
        p => p.arrivalTime <= currentTime
      );

      if (availableProcesses.length === 0) {
        // Jump to next arrival time if no processes are available
        const nextArrival = Math.min(...remainingProcesses.map(p => p.arrivalTime));
        currentTime = nextArrival;
        continue;
      }

      // Select process with highest priority (lower number means higher priority)
      const selectedProcess = availableProcesses.reduce((prev, curr) =>
        parseInt(prev.priority) < parseInt(curr.priority) ? prev : curr
      );

      steps.push({
        process: selectedProcess.process,
        time: selectedProcess.executeTime,
        startTime: currentTime
      });

      currentTime += selectedProcess.executeTime;
      remainingProcesses = remainingProcesses.filter(p => p.process !== selectedProcess.process);
    }

    return steps;
  };

  // Updated Round Robin implementation
  const scheduleRoundRobin = (processes: Row[], quantum: number): ExecutionStep[] => {
    const steps: ExecutionStep[] = [];
    let currentTime = 0;

    // Initialize remaining processes with remaining time
    let remainingProcesses = processes.map(p => ({
      ...p,
      remainingTime: p.executeTime
    }));

    // Initialize ready queue with processes that arrive at time 0
    let readyQueue = remainingProcesses
      .filter(p => p.arrivalTime === 0)
      .map(p => ({ ...p }));

    while (remainingProcesses.length > 0) {
      if (readyQueue.length === 0) {
        // If ready queue is empty, find the next process to arrive
        const nextArrival = Math.min(...remainingProcesses
          .filter(p => p.arrivalTime > currentTime)
          .map(p => p.arrivalTime));

        // Add all processes that arrive at the next arrival time
        readyQueue = remainingProcesses
          .filter(p => p.arrivalTime === nextArrival)
          .map(p => ({ ...p }));

        currentTime = nextArrival;
        continue;
      }

      // Get the next process from ready queue
      const currentProcess = readyQueue.shift()!;
      const executeTime = Math.min(quantum, currentProcess.remainingTime);

      // Add execution step
      steps.push({
        process: currentProcess.process,
        time: executeTime,
        startTime: currentTime
      });

      // Update remaining time and current time
      currentProcess.remainingTime -= executeTime;
      currentTime += executeTime;

      // Check for new arrivals during this time quantum
      const newArrivals = remainingProcesses
        .filter(p =>
          p.arrivalTime > currentTime - executeTime &&
          p.arrivalTime <= currentTime &&
          p.process !== currentProcess.process
        )
        .map(p => ({ ...p }));

      readyQueue.push(...newArrivals);

      // If process still has remaining time, add it back to ready queue
      if (currentProcess.remainingTime > 0) {
        readyQueue.push(currentProcess);
      }

      // Update remaining processes
      remainingProcesses = remainingProcesses
        .map(p => p.process === currentProcess.process
          ? { ...p, remainingTime: currentProcess.remainingTime }
          : p
        )
        .filter(p => p.remainingTime > 0);
    }

    return steps;
  };

  const draw = () => {
    const processRows = [...rows].slice(1); // Exclude header row
    let steps: ExecutionStep[] = [];

    switch (algorithm) {
      case 'fcfs':
        steps = scheduleFCFS(processRows);
        break;
      case 'sjf':
        steps = scheduleSJF(processRows);
        break;
      case 'priority':
        steps = schedulePriority(processRows);
        break;
      case 'robin':
        steps = scheduleRoundRobin(processRows, quantum);
        break;
    }

    setExecutionSteps(steps);
    const totalTime = steps.reduce((sum, step) => Math.max(sum, step.startTime + step.time), 0);
    setTotalExecutionTime(totalTime);
  };

  // Render Gantt Chart
  const renderGanttChart = () => {
    const maxWidth = 600; // Total width of the chart
    const chartHeight = 100;

    return (
      <div className="w-full  rounded-lg shadow-md p-4 mt-4">
        <h4 className="text-xl font-semibold mb-4">Gantt Chart</h4>
        <div
          className="relative border-b-2 border-gray-300"
          style={{ height: `${chartHeight}px`, width: `${maxWidth}px` }}
        >
          {executionSteps.map((step, index) => {
            const width = (step.time / totalExecutionTime) * maxWidth;
            const left = (step.startTime / totalExecutionTime) * maxWidth;

            return (
              <div
                key={index}
                className="absolute top-0 h-full flex items-center justify-center"
                style={{
                  width: `${width}px`,
                  left: `${left}px`,
                  backgroundColor: `hsl(${index * 60}, 70%, 70%)`
                }}
              >
                <span className="text-white font-bold">{step.process}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span>0</span>
          <span>{totalExecutionTime}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-black via-gray-900 to-green-900 text-white overflow-y-auto">
      <div className="container mx-auto px-8 py-4 flex flex-col min-h-screen">
        <div className="w-full flex flex-col justify-start mb-8 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-green-400 text-center">
            Process Scheduler Visualizer
          </h1>
          <h2 className="text-xl md:text-2xl text-gray-300 text-center">
            Visualize how different process scheduling algorithms work in real-time!
          </h2>
        </div>

        <div className="flex-1 w-full flex flex-row justify-between gap-8">
          {/* Left side container with table */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gradient-to-br from-black via-gray-900 to-green-900 p-6 rounded-lg shadow-lg grow border border-green-700">
              <h3 className="text-2xl font-semibold text-green-400 mb-4">Choose Scheduling Algorithm</h3>
              <form id="algorithm" className="mb-8 flex items-center justify-center gap-4">
                {['fcfs', 'sjf', 'priority', 'robin'].map((algo) => (
                  <label
                    key={algo}
                    className={`
                      flex items-center justify-center p-4 rounded-lg
                      transition-all duration-200 ease-in-out
                      ${algorithm === algo
                        ? 'bg-green-900 ring-2 ring-green-600 shadow-lg'
                        : 'bg-gray-800 hover:bg-green-800 shadow-md hover:shadow-lg'
                      }
                      ${algo === 'fcfs' ? 'w-1/3' : 'w-1/4'}
                      cursor-pointer min-w-[100px]
                    `}
                  >
                    <input
                      type="radio"
                      name="algorithm"
                      value={algo}
                      checked={algorithm === algo}
                      onChange={() => setAlgorithm(algo)}
                      className="hidden"
                    />
                    <span className="text-green-300 font-semibold select-none">
                      {algo.toUpperCase()}
                    </span>
                  </label>
                ))}
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full table-auto mb-4 border-separate border-spacing-0.5">
                  <thead>
                    <tr>
                      {['Process', 'Arrival Time', 'Execute Time', ...(algorithm === 'priority' ? ['Priority'] : [])].map((header) => (
                        <th 
                          key={header} 
                          className="px-4 py-2 border-2 border-gray-700 text-green-400"
                        >
                          {header}
                        </th>
                      ))}
                      <th className="px-4 py-2 border-2 border-gray-700 text-green-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(1).map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors duration-200 hover:bg-green-900/30"
                      >
                        <td className="px-4 py-3 text-gray-300 font-medium border-b border-gray-700">
                          {row.process}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-700">
                          <input
                            type="number"
                            value={row.arrivalTime}
                            onChange={(e) => {
                              const updatedRows = [...rows];
                              updatedRows[index + 1].arrivalTime = +e.target.value;
                              setRows(updatedRows);
                            }}
                            className="w-full px-3 py-2 text-white bg-gray-800 border border-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 transition-all appearance-none"
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-700">
                          <input
                            type="number"
                            value={row.executeTime}
                            onChange={(e) => {
                              const updatedRows = [...rows];
                              updatedRows[index + 1].executeTime = +e.target.value;
                              setRows(updatedRows);
                            }}
                            className="w-full px-3 py-2 text-white bg-gray-800 border border-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 transition-all appearance-none"
                          />
                        </td>
                        {algorithm === 'priority' && (
                          <td className="px-4 py-3 border-b border-gray-700">
                            <input
                              type="number"
                              value={row.priority}
                              onChange={(e) => {
                                const updatedRows = [...rows];
                                updatedRows[index + 1].priority = e.target.value;
                                setRows(updatedRows);
                              }}
                              className="w-full px-3 py-2 text-white bg-gray-800 border border-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 transition-all appearance-none"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 border-b border-gray-700">
                          <button
                            type="button"
                            onClick={() => deleteRow(index + 1)}
                            className="p-2 text-red-400 hover:bg-red-900/30 rounded-full transition-colors duration-200 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={addRow}
                  className="px-4 py-2 bg-green-800 text-green-300 rounded hover:bg-green-700 transition-colors"
                >
                  Add Process
                </button>

                {algorithm === 'robin' && (
                  <div className="flex items-center">
                    <span className="mr-2 text-green-300">Quantum:</span>
                    <input
                      type="number"
                      value={quantum}
                      onChange={(e) => setQuantum(+e.target.value)}
                      className="w-20 px-3 py-2 border border-green-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                )}

                <button
                  onClick={draw}
                  className="px-6 py-2 bg-green-800 text-green-300 rounded hover:bg-green-700 transition-colors"
                >
                  Visualize
                </button>
              </div>
            </div>
          </div>

          {/* Right side container with visualization */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gradient-to-br from-black via-gray-900 to-green-900 p-6 rounded-lg shadow-lg grow border border-green-700">
              <h3 className="text-2xl font-semibold text-green-400 mb-4">Visualization</h3>
              <div className="flex-1 rounded-lg p-4">
                {executionSteps.length > 0 ? (
                  <>
                    {renderGanttChart()}
                    <div className="mt-4">
                      <h4 className="text-xl font-semibold mb-2 text-green-300">Execution Details</h4>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-green-900">
                            <th className="border border-green-700 p-2 text-green-300">Process</th>
                            <th className="border border-green-700 p-2 text-green-300">Start Time</th>
                            <th className="border border-green-700 p-2 text-green-300">Execution Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {executionSteps.map((step, index) => (
                            <tr key={index} className="text-center hover:bg-green-900/50">
                              <td className="border border-green-700 p-2 text-gray-300">{step.process}</td>
                              <td className="border border-green-700 p-2 text-gray-300">{step.startTime}</td>
                              <td className="border border-green-700 p-2 text-gray-300">{step.time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Run visualization to see results
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}