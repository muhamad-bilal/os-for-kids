import { useState } from "react";
import { Cpu, Clock, ListOrdered, Clock9, GanttChart, BarChart3, AlertCircle, Info } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'visualization' | 'theory' | 'examples'>('visualization');

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
    const updatedRows = [...rows];
    updatedRows.splice(index, 1);
    setRows(updatedRows);
  };

  // Algorithm descriptions
  const algorithmInfo = {
    fcfs: {
      name: "First-Come, First-Served (FCFS)",
      description: "Processes are executed in the order they arrive. The first process to arrive is the first to be executed.",
      characteristics: [
        "Non-preemptive: Once a process starts, it runs to completion",
        "Simple to implement with a FIFO queue",
        "May lead to the 'convoy effect' where short processes wait behind long ones"
      ],
      example: {
        processes: [
          { process: 'P1', arrivalTime: 0, executeTime: 5 },
          { process: 'P2', arrivalTime: 1, executeTime: 3 },
          { process: 'P3', arrivalTime: 2, executeTime: 8 }
        ],
        description: "P1 runs first (0-5), then P2 (5-8), then P3 (8-16). The average waiting time is higher due to the convoy effect."
      }
    },
    sjf: {
      name: "Shortest Job First (SJF)",
      description: "The process with the smallest execution time is selected next. This can be either preemptive or non-preemptive.",
      characteristics: [
        "Minimizes average waiting time",
        "Optimal for batch systems",
        "Requires knowledge of process execution time",
        "May lead to starvation of longer processes"
      ],
      example: {
        processes: [
          { process: 'P1', arrivalTime: 0, executeTime: 5 },
          { process: 'P2', arrivalTime: 1, executeTime: 3 },
          { process: 'P3', arrivalTime: 2, executeTime: 8 }
        ],
        description: "P1 starts (0-1), then P2 arrives and runs (1-4) as it's shorter, then P1 continues (4-9), then P3 runs (9-17)."
      }
    },
    priority: {
      name: "Priority Scheduling",
      description: "Processes are executed based on priority. The process with the highest priority is selected first. Lower numbers typically indicate higher priority.",
      characteristics: [
        "Can be preemptive or non-preemptive",
        "May lead to starvation of low-priority processes",
        "Often used in real-time systems",
        "Priority can be determined internally or externally"
      ],
      example: {
        processes: [
          { process: 'P1', arrivalTime: 0, executeTime: 5, priority: '3' },
          { process: 'P2', arrivalTime: 1, executeTime: 3, priority: '1' },
          { process: 'P3', arrivalTime: 2, executeTime: 8, priority: '2' }
        ],
        description: "P2 runs first (highest priority), then P3, then P1. The order is based on priority, not arrival time."
      }
    },
    robin: {
      name: "Round Robin (RR)",
      description: "Each process is assigned a fixed time slot (time quantum) in cyclic order. If a process doesn't complete, it's preempted and moved to the back of the queue.",
      characteristics: [
        "Preemptive by design",
        "Good for time-sharing systems",
        "Performance depends heavily on the time quantum",
        "No process waits more than (n-1)q time units"
      ],
      example: {
        processes: [
          { process: 'P1', arrivalTime: 0, executeTime: 5 },
          { process: 'P2', arrivalTime: 1, executeTime: 3 },
          { process: 'P3', arrivalTime: 2, executeTime: 8 }
        ],
        description: "With quantum=3: P1(0-3), P2(3-6), P3(6-9), P1(9-11), P3(9-17). Processes share the CPU in time slices."
      }
    }
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
    const chartHeight = 100;

    return (
      <div className="w-full rounded-lg shadow-md p-4 mt-4">
        <h4 className="text-xl font-semibold mb-4 text-green-300">Gantt Chart</h4>
        <div className="w-full overflow-x-auto">
          <div
            className="relative border-b-2 border-gray-300 min-w-full"
            style={{ height: `${chartHeight}px` }}
          >
            {executionSteps.map((step, index) => {
              const width = `${(step.time / totalExecutionTime) * 100}%`;
              const left = `${(step.startTime / totalExecutionTime) * 100}%`;

              return (
                <div
                  key={index}
                  className="absolute top-0 h-full flex items-center justify-center border-r border-gray-700"
                  style={{
                    width: width,
                    left: left,
                    backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                  }}
                >
                  <span className="text-white font-bold text-sm">{step.process}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-gray-300">
          <span>0</span>
          <span>{totalExecutionTime}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="dark">
      <div className="w-full min-h-screen bg-gradient-to-br from-(--brand-start) via-(--brand-via) to-(--brand-end) px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="w-full flex flex-col justify-start mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Cpu className="text-brand-primary h-10 w-10" />
              <h1 className="text-4xl md:text-5xl font-bold text-brand-primary text-center">
                Process Scheduler Visualizer
              </h1>
            </div>
            <h2 className="text-xl md:text-2xl text-muted-foreground text-center mb-6">
              Visualize how different process scheduling algorithms work in real-time!
            </h2>
          
          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg bg-surface-secondary/70 backdrop-blur-sm border border-border p-1">
              <button
                onClick={() => setActiveTab('visualization')}
                className={`px-6 py-2 rounded-md transition-all duration-200 ${
                  activeTab === 'visualization' 
                    ? 'bg-brand-primary/20 text-brand-primary shadow-lg' 
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GanttChart className="h-5 w-5" />
                  Visualization
                </div>
              </button>
              <button
                onClick={() => setActiveTab('theory')}
                className={`px-6 py-2 rounded-md transition-all duration-200 ${
                  activeTab === 'theory' 
                    ? 'bg-brand-primary/20 text-brand-primary shadow-lg' 
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Theory
                </div>
              </button>
              <button
                onClick={() => setActiveTab('examples')}
                className={`px-6 py-2 rounded-md transition-all duration-200 ${
                  activeTab === 'examples' 
                    ? 'bg-brand-primary/20 text-brand-primary shadow-lg' 
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Examples
                </div>
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'visualization' && (
          <div className="flex-1 w-full flex flex-row justify-between gap-8">
            {/* Left side container with table */}
            <div className="w-1/2 flex flex-col">
              <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-6 rounded-lg shadow-lg grow">
                <h3 className="text-2xl font-semibold text-brand-primary mb-4">Choose Scheduling Algorithm</h3>
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
                            className="px-4 py-2 border-2 border-gray-700 text-brand-primary"
                          >
                            {header}
                          </th>
                        ))}
                        <th className="px-4 py-2 border-2 border-gray-700 text-brand-primary">Actions</th>
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
              <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-6 rounded-lg shadow-lg grow">
                <h3 className="text-2xl font-semibold text-brand-primary mb-4">Visualization</h3>
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
        )}

        {/* Theory Tab Content */}
        {activeTab === 'theory' && (
          <div className="flex-1 w-full bg-gradient-to-br from-black/50 via-gray-900/80 to-green-900/50 p-8 rounded-xl border border-green-800/50 shadow-xl">
            <h2 className="text-3xl font-bold text-brand-primary mb-6 flex items-center gap-3">
              <BarChart3 className="h-8 w-8" />
              Process Scheduling Theory
            </h2>
            
            <div className="mb-8 p-4 bg-gray-800/50 rounded-lg border-l-4 border-green-600">
              <h3 className="text-xl font-semibold text-green-300 mb-2">What is Process Scheduling?</h3>
              <p className="text-gray-300">
                Process scheduling is the activity of the process manager that handles the removal of the running process from the CPU and the selection of another process based on a particular strategy. The objective of multiprogramming is to have some process running at all times to maximize CPU utilization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 hover:border-green-600 transition-colors">
                <h3 className="text-xl font-semibold text-green-300 mb-3 flex items-center gap-2">
                  <Clock9 className="h-5 w-5" />
                  Scheduling Criteria
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• <span className="font-medium">CPU Utilization</span>: Keep the CPU as busy as possible</li>
                  <li>• <span className="font-medium">Throughput</span>: Number of processes completed per time unit</li>
                  <li>• <span className="font-medium">Turnaround Time</span>: Time from submission to completion</li>
                  <li>• <span className="font-medium">Waiting Time</span>: Time spent waiting in the ready queue</li>
                  <li>• <span className="font-medium">Response Time</span>: Time from submission until first response</li>
                </ul>
              </div>

              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 hover:border-green-600 transition-colors">
                <h3 className="text-xl font-semibold text-green-300 mb-3 flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" />
                  Scheduling Levels
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• <span className="font-medium">Long-term</span>: Controls the degree of multiprogramming</li>
                  <li>• <span className="font-medium">Medium-term</span>: Handles swapping of processes</li>
                  <li>• <span className="font-medium">Short-term</span>: Selects which process to execute next</li>
                </ul>
                <div className="mt-4 p-3 bg-gray-900/50 rounded border-l-4 border-yellow-500">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-200 text-sm">
                      <span className="font-semibold">Did you know?</span> Modern operating systems use a combination of these scheduling algorithms to optimize performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
              <h3 className="text-2xl font-bold text-green-300 mb-4">Comparison of Scheduling Algorithms</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-green-900/50">
                      <th className="p-3 text-left text-green-300 border border-gray-700">Algorithm</th>
                      <th className="p-3 text-left text-green-300 border border-gray-700">Type</th>
                      <th className="p-3 text-left text-green-300 border border-gray-700">Advantages</th>
                      <th className="p-3 text-left text-green-300 border border-gray-700">Disadvantages</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-700/50">
                      <td className="p-3 border border-gray-700 font-medium">FCFS</td>
                      <td className="p-3 border border-gray-700">Non-preemptive</td>
                      <td className="p-3 border border-gray-700">Simple, fair</td>
                      <td className="p-3 border border-gray-700">Poor for short processes, convoy effect</td>
                    </tr>
                    <tr className="hover:bg-gray-700/50">
                      <td className="p-3 border border-gray-700 font-medium">SJF</td>
                      <td className="p-3 border border-gray-700">Both</td>
                      <td className="p-3 border border-gray-700">Minimizes average waiting time</td>
                      <td className="p-3 border border-gray-700">Difficult to predict burst time, may starve long processes</td>
                    </tr>
                    <tr className="hover:bg-gray-700/50">
                      <td className="p-3 border border-gray-700 font-medium">Priority</td>
                      <td className="p-3 border border-gray-700">Both</td>
                      <td className="p-3 border border-gray-700">Flexible, good for real-time systems</td>
                      <td className="p-3 border border-gray-700">Starvation of low-priority processes</td>
                    </tr>
                    <tr className="hover:bg-gray-700/50">
                      <td className="p-3 border border-gray-700 font-medium">Round Robin</td>
                      <td className="p-3 border border-gray-700">Preemptive</td>
                      <td className="p-3 border border-gray-700">Fair, good response time</td>
                      <td className="p-3 border border-gray-700">Performance depends on time quantum</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Examples Tab Content */}
        {activeTab === 'examples' && (
          <div className="flex-1 w-full bg-gradient-to-br from-black/50 via-gray-900/80 to-green-900/50 p-8 rounded-xl border border-green-800/50 shadow-xl">
            <h2 className="text-3xl font-bold text-brand-primary mb-6 flex items-center gap-3">
              <AlertCircle className="h-8 w-8" />
              Scheduling Algorithm Examples
            </h2>
            
            <div className="space-y-8">
              {Object.entries(algorithmInfo).map(([algoKey, algoData]) => (
                <div key={algoKey} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 hover:border-green-600 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-900/50 rounded-lg">
                      {algoKey === 'fcfs' && <ListOrdered className="h-6 w-6 text-brand-primary" />}
                      {algoKey === 'sjf' && <Clock className="h-6 w-6 text-brand-primary" />}
                      {algoKey === 'priority' && <Cpu className="h-6 w-6 text-brand-primary" />}
                      {algoKey === 'robin' && <GanttChart className="h-6 w-6 text-brand-primary" />}
                    </div>
                    <h3 className="text-2xl font-bold text-green-300">{algoData.name}</h3>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{algoData.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-green-300 mb-2">Key Characteristics:</h4>
                      <ul className="space-y-2 text-gray-300">
                        {algoData.characteristics.map((char, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-brand-primary">•</span>
                            <span>{char}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                      <h4 className="text-lg font-semibold text-green-300 mb-2">Example Scenario:</h4>
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-300 mb-1">Processes:</h5>
                        <div className="bg-black/30 p-2 rounded text-sm font-mono overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="text-left text-green-300">
                                <th className="pr-4">Process</th>
                                <th className="px-4">Arrival</th>
                                <th className="px-4">Burst</th>
                                {algoKey === 'priority' && <th>Priority</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {algoData.example.processes.map((p, i) => (
                                <tr key={i} className="text-gray-300">
                                  <td className="pr-4">{p.process}</td>
                                  <td className="px-4">{p.arrivalTime}</td>
                                  <td className="px-4">{p.executeTime}</td>
                                  {algoKey === 'priority' && <td>{(p as any).priority || 'N/A'}</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-300 mb-1">Execution Order:</h5>
                        <p className="text-gray-300 text-sm">{algoData.example.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {algoKey === algorithm && (
                    <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-700/50 flex items-start gap-3">
                      <Info className="h-5 w-5 text-brand-primary mt-0.5 flex-shrink-0" />
                      <p className="text-green-200 text-sm">
                        <span className="font-semibold">Tip:</span> You're currently using {algoData.name}. Try adjusting the parameters in the Visualization tab to see how it works with different process configurations.
                      </p>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="bg-gray-800/50 p-6 rounded-lg border border-amber-600/50">
                <h3 className="text-xl font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Real-world Applications
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-900/30 rounded border border-gray-700">
                    <h4 className="font-semibold text-amber-300 mb-1">Operating Systems</h4>
                    <p className="text-sm text-gray-300">
                      Modern OS like Linux and Windows use a combination of scheduling algorithms. For example, the Linux Completely Fair Scheduler (CFS) uses a variant of Round Robin with dynamic time slices based on process priority and historical CPU usage.
                    </p>
                  </div>
                  <div className="p-3 bg-gray-900/30 rounded border border-gray-700">
                    <h4 className="font-semibold text-amber-300 mb-1">Cloud Computing</h4>
                    <p className="text-sm text-gray-300">
                      Cloud providers use advanced scheduling algorithms to allocate virtual machines and containers across physical hosts, optimizing for resource utilization, energy efficiency, and quality of service.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}