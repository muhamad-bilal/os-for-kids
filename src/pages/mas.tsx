import { useState, useEffect } from 'react';
import {
    Cpu,
    MemoryStick,
    Layers,
    Shuffle,
    PieChart,
    ZoomIn,
    ZoomOut
} from 'lucide-react';

interface Process {
    id: string;
    name: string;
    size: number;
    startTime: number;
    allocatedAt?: number;
    deallocatedAt?: number;
}

interface MemoryBlock {
    id: string;
    start: number;
    end: number;
    size: number;
    isFree: boolean;
    process?: Process;
    isHighlighted?: boolean;
}

const EnhancedMemoryAllocationSimulator = () => {
    // Core state
    const [totalMemory, setTotalMemory] = useState(2048);
    const [strategy, setStrategy] = useState<'First Fit' | 'Best Fit' | 'Worst Fit' | 'Next Fit'>('Best Fit');
    const [processes, setProcesses] = useState<Process[]>([]);
    const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [nextFitPointer, setNextFitPointer] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showProcessDetails, setShowProcessDetails] = useState(false);

    // Memory usage statistics
    const [memoryStats, setMemoryStats] = useState({
        used: 0,
        free: 100,
        fragmented: 0
    });

    // Form state
    const [newProcessName, setNewProcessName] = useState('');
    const [newProcessSize, setNewProcessSize] = useState('');

    // Animation state
    const [isAnimating, setIsAnimating] = useState(false);

    // Initialize memory
    useEffect(() => {
        const initialBlock: MemoryBlock = {
            id: 'initial-block',
            start: 0,
            end: totalMemory,
            size: totalMemory,
            isFree: true
        };
        setMemoryBlocks([initialBlock]);
    }, [totalMemory]);

    // Update memory statistics
    useEffect(() => {
        const usedMemory = memoryBlocks.reduce((sum, block) => 
            sum + (block.isFree ? 0 : block.size), 0);
        const freeMemory = totalMemory - usedMemory;
        const fragmentedMemory = calculateFragmentedMemory();

        setMemoryStats({
            used: (usedMemory / totalMemory) * 100,
            free: (freeMemory / totalMemory) * 100,
            fragmented: (fragmentedMemory / totalMemory) * 100
        });
    }, [memoryBlocks, totalMemory]);

    // Timer for simulation
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const calculateFragmentedMemory = () => {
        const freeBlocks = memoryBlocks.filter(block => block.isFree);
        const totalFreeSpace = freeBlocks.reduce((sum, block) => sum + block.size, 0);
        const largestFreeBlock = Math.max(...freeBlocks.map(block => block.size), 0);
        return totalFreeSpace - largestFreeBlock;
    };

    const findSuitableBlock = (size: number): { index: number; blocks: MemoryBlock[] } => {
        let selectedBlockIndex = -1;
        const updatedBlocks = memoryBlocks.map(block => ({ ...block, isHighlighted: false }));

        switch (strategy) {
            case 'First Fit':
                selectedBlockIndex = updatedBlocks.findIndex(
                    block => block.isFree && block.size >= size
                );
                if (selectedBlockIndex !== -1) {
                    updatedBlocks[selectedBlockIndex].isHighlighted = true;
                }
                break;

            case 'Best Fit':
                let minSizeDiff = Infinity;
                updatedBlocks.forEach((block, index) => {
                    if (block.isFree && block.size >= size) {
                        const diff = block.size - size;
                        if (diff < minSizeDiff) {
                            minSizeDiff = diff;
                            selectedBlockIndex = index;
                        }
                    }
                });
                if (selectedBlockIndex !== -1) {
                    updatedBlocks[selectedBlockIndex].isHighlighted = true;
                }
                break;

            case 'Worst Fit':
                let maxSizeDiff = -1;
                updatedBlocks.forEach((block, index) => {
                    if (block.isFree && block.size >= size) {
                        const diff = block.size - size;
                        if (diff > maxSizeDiff) {
                            maxSizeDiff = diff;
                            selectedBlockIndex = index;
                        }
                    }
                });
                if (selectedBlockIndex !== -1) {
                    updatedBlocks[selectedBlockIndex].isHighlighted = true;
                }
                break;

            case 'Next Fit':
                const blockCount = updatedBlocks.length;
                for (let i = 0; i < blockCount; i++) {
                    const index = (nextFitPointer + i) % blockCount;
                    if (updatedBlocks[index].isFree && updatedBlocks[index].size >= size) {
                        selectedBlockIndex = index;
                        updatedBlocks[index].isHighlighted = true;
                        setNextFitPointer((index + 1) % blockCount);
                        break;
                    }
                }
                break;
        }

        return { index: selectedBlockIndex, blocks: updatedBlocks };
    };

    const allocateMemory = async (process: Process) => {
        setIsAnimating(true);
        const { index: selectedBlockIndex, blocks: highlightedBlocks } = findSuitableBlock(process.size);

        if (selectedBlockIndex === -1) {
            alert('No suitable memory block found!');
            setIsAnimating(false);
            return;
        }

        // Show highlighted block briefly
        setMemoryBlocks(highlightedBlocks);
        await new Promise(resolve => setTimeout(resolve, 500));

        const updatedBlocks = [...highlightedBlocks];
        const selectedBlock = updatedBlocks[selectedBlockIndex];

        // Split block if necessary
        if (selectedBlock.size > process.size) {
            const newBlock: MemoryBlock = {
                id: `block-${Math.random().toString(36).substr(2, 9)}`,
                start: selectedBlock.start + process.size,
                end: selectedBlock.end,
                size: selectedBlock.size - process.size,
                isFree: true,
                isHighlighted: false
            };

            selectedBlock.end = selectedBlock.start + process.size;
            selectedBlock.size = process.size;
            selectedBlock.isFree = false;
            selectedBlock.process = process;
            selectedBlock.isHighlighted = false;

            updatedBlocks.splice(selectedBlockIndex + 1, 0, newBlock);
        } else {
            selectedBlock.isFree = false;
            selectedBlock.process = process;
            selectedBlock.isHighlighted = false;
        }

        setMemoryBlocks(updatedBlocks);
        setProcesses(prev => [...prev, { ...process, allocatedAt: currentTime }]);
        setIsAnimating(false);
    };

    const deallocateProcess = async (processId: string) => {
        setIsAnimating(true);
        
        // Highlight blocks to be deallocated
        const highlightedBlocks = memoryBlocks.map(block => ({
            ...block,
            isHighlighted: block.process?.id === processId
        }));
        setMemoryBlocks(highlightedBlocks);
        await new Promise(resolve => setTimeout(resolve, 500));

        const updatedBlocks = highlightedBlocks.map(block => {
            if (block.process?.id === processId) {
                return { ...block, isFree: true, process: undefined, isHighlighted: false };
            }
            return { ...block, isHighlighted: false };
        });

        // Merge adjacent free blocks
        const mergedBlocks = updatedBlocks.reduce((acc: MemoryBlock[], block) => {
            if (acc.length === 0) return [block];

            const lastBlock = acc[acc.length - 1];
            if (lastBlock.isFree && block.isFree) {
                lastBlock.end = block.end;
                lastBlock.size += block.size;
                return acc;
            }

            return [...acc, block];
        }, []);

        setMemoryBlocks(mergedBlocks);
        setProcesses(prev => prev.map(p =>
            p.id === processId ? { ...p, deallocatedAt: currentTime } : p
        ));
        setIsAnimating(false);
    };

    const createProcess = () => {
        if (!newProcessName || !newProcessSize) {
            alert('Please enter process name and size');
            return;
        }

        const size = parseInt(newProcessSize);
        if (size <= 0 || size > totalMemory) {
            alert(`Process size must be between 1 and ${totalMemory}`);
            return;
        }

        const newProcess: Process = {
            id: `process-${Math.random().toString(36).substr(2, 9)}`,
            name: newProcessName,
            size: size,
            startTime: currentTime
        };

        allocateMemory(newProcess);
        setNewProcessName('');
        setNewProcessSize('');
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-green-900 text-white overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold text-green-400">
                        Enhanced Memory Allocation Simulator
                    </h1>
                    <p className="text-gray-300">Current Time: {currentTime}s</p>
                </div>

                {/* Control Panel */}
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Memory Configuration */}
                    <div className="bg-gradient-to-br from-black via-gray-900 to-green-900 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4 flex items-center text-green-400">
                            <Cpu className="mr-2" /> Memory Configuration
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">
                                    Total Memory (MB)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={totalMemory}
                                    onChange={(e) => setTotalMemory(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="w-full p-2 bg-gray-800 border border-green-700 rounded focus:ring-2 focus:ring-green-600 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">
                                    Allocation Strategy
                                </label>
                                <select
                                    value={strategy}
                                    onChange={(e) => setStrategy(e.target.value as any)}
                                    className="w-full p-2 bg-gray-800 border border-green-700 rounded focus:ring-2 focus:ring-green-600 text-white"
                                >
                                    <option>First Fit</option>
                                    <option>Best Fit</option>
                                    <option>Worst Fit</option>
                                    <option>Next Fit</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Process Creation */}
                    <div className="bg-gradient-to-br from-black via-gray-900 to-green-900 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4 flex items-center text-green-400">
                            <MemoryStick className="mr-2" /> Create Process
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">
                                    Process Name
                                </label>
                                <input
                                    type="text"
                                    value={newProcessName}
                                    onChange={(e) => setNewProcessName(e.target.value)}
                                    className="w-full p-2 bg-gray-800 border border-green-700 rounded focus:ring-2 focus:ring-green-600 text-white"
                                    placeholder="Enter process name"
                                    disabled={isAnimating}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">
                                    Size (MB)
                                </label>
                                <input
                                    type="number"
                                    value={newProcessSize}
                                    onChange={(e) => setNewProcessSize(e.target.value)}
                                    className="w-full p-2 bg-gray-800 border border-green-700 rounded focus:ring-2 focus:ring-green-600 text-white"
                                    placeholder="Enter size in MB"
                                    disabled={isAnimating}
                                />
                            </div>
                            <button
                                onClick={createProcess}
                                disabled={isAnimating}
                                className="w-full bg-green-800 text-green-300 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                Create Process
                            </button>
                        </div>
                    </div>

                    {/* Memory Statistics */}
                    <div className="bg-gradient-to-br from-black via-gray-900 to-green-900 rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4 flex items-center text-green-400">
                            <PieChart className="mr-2" /> Memory Statistics
                        </h3>
                        <div className="space-y-4">
                            {/* Memory Usage Bar */}
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500"
                                        style={{ width: `${memoryStats.used}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-sm text-gray-300">
                                <span>Used: {memoryStats.used.toFixed(1)}%</span>
                                    <span>Free: {memoryStats.free.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Total Memory:</span>
                                    <span className="font-medium">{totalMemory} MB</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Fragmentation:</span>
                                    <span className={`font-medium ${memoryStats.fragmented > 50 ? 'text-red-500' : 'text-green-500'}`}>
                                        {memoryStats.fragmented.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Active Processes:</span>
                                    <span className="font-medium">
                                        {processes.filter(p => !p.deallocatedAt).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Memory Visualization */}
                <div className="bg-gradient-to-br from-black via-gray-900 to-green-900 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold flex items-center text-green-400">
                            <Layers className="mr-2" /> Memory Blocks
                        </h3>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                                className="p-2 hover:bg-green-700 rounded transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut size={20} />
                            </button>
                            <span className="text-sm text-gray-300">{(zoomLevel * 100).toFixed(0)}%</span>
                            <button
                                onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
                                className="p-2 hover:bg-green-700 rounded transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn size={20} />
                            </button>
                            <button
                                onClick={() => setShowProcessDetails(!showProcessDetails)}
                                className={`p-2 rounded transition-colors ${
                                    showProcessDetails ? 'bg-green-700' : 'hover:bg-green-700'
                                }`}
                                title="Toggle Process Details"
                            >
                                <MemoryStick size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="relative border border-green-700 rounded-lg overflow-hidden h-96">
                        <div 
                            className="absolute inset-0 flex flex-col p-4 space-y-2 overflow-y-auto transition-all duration-300"
                            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                        >
                            {memoryBlocks.map((block) => (
                                <div
                                    key={block.id}
                                    className={`relative h-8 rounded transition-all duration-300 ${
                                        block.isHighlighted ? 'ring-2 ring-yellow-400' :
                                        block.isFree ? 'bg-green-900' : 'bg-green-500'
                                    }`}
                                    style={{
                                        width: `${(block.size / totalMemory) * 100}%`,
                                        minWidth: '50px'
                                    }}
                                >
                                    <div className="absolute inset-0 p-2 text-sm truncate">
                                        {block.isFree ? (
                                            <span className="text-gray-300">Free: {block.size}MB</span>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-white">
                                                    {block.process?.name}
                                                </span>
                                                <span className="text-white/80">
                                                    {block.size}MB
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {showProcessDetails && block.process && (
                                        <div className="absolute top-full left-0 mt-1 bg-black/90 p-2 rounded text-xs">
                                            <p>Process: {block.process.name}</p>
                                            <p>Size: {block.process.size}MB</p>
                                            <p>Start: {block.process.startTime}s</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Process History */}
                <div className="bg-gradient-to-br from-black via-gray-900 to-green-900 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-green-400">
                        <Shuffle className="mr-2" /> Process History
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-green-900">
                                    <th className="p-3 text-left text-green-300">Process</th>
                                    <th className="p-3 text-left text-green-300">Size (MB)</th>
                                    <th className="p-3 text-left text-green-300">Allocated At</th>
                                    <th className="p-3 text-left text-green-300">Deallocated At</th>
                                    <th className="p-3 text-left text-green-300">Duration</th>
                                    <th className="p-3 text-left text-green-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processes.map((process) => (
                                    <tr key={process.id} className="border-t border-green-800 hover:bg-green-900/30">
                                        <td className="p-3 text-gray-300">{process.name}</td>
                                        <td className="p-3 text-gray-300">{process.size}</td>
                                        <td className="p-3 text-gray-300">{process.allocatedAt}s</td>
                                        <td className="p-3 text-gray-300">
                                            {process.deallocatedAt ? `${process.deallocatedAt}s` : 'Active'}
                                        </td>
                                        <td className="p-3 text-gray-300">
                                            {process.deallocatedAt 
                                                ? `${process.deallocatedAt - (process.allocatedAt || 0)}s`
                                                : `${currentTime - (process.allocatedAt || 0)}s`
                                            }
                                        </td>
                                        <td className="p-3">
                                            {!process.deallocatedAt && (
                                                <button
                                                    onClick={() => deallocateProcess(process.id)}
                                                    disabled={isAnimating}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded transition disabled:opacity-50"
                                                >
                                                    Deallocate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedMemoryAllocationSimulator;