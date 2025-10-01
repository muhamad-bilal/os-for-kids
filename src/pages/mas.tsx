import { useState, useEffect } from 'react';
import {
    GanttChart,
    BarChart3,
    AlertCircle,
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
    const [activeTab, setActiveTab] = useState<'visualization' | 'theory' | 'examples'>('visualization');

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
        <div className="dark">
            <div className="min-h-screen w-full bg-gradient-to-br from-(--brand-start) via-(--brand-via) to-(--brand-end) overflow-y-auto px-6 py-10">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold text-brand-primary">
                            Memory Allocation Simulator
                        </h1>
                        <p className="text-muted-foreground">Current Time: {currentTime}s</p>
                    </div>

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

                {activeTab === 'visualization' && (
                <>
                {/* Control Panel */}
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Memory Configuration */}
                    <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4 flex items-center text-brand-primary">
                            <Cpu className="mr-2" /> Memory Configuration
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-muted-foreground">
                                    Total Memory (MB)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={totalMemory}
                                    onChange={(e) => setTotalMemory(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="w-full p-2 bg-accent border border-border rounded text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-muted-foreground">
                                    Allocation Strategy
                                </label>
                                <select
                                    value={strategy}
                                    onChange={(e) => setStrategy(e.target.value as any)}
                                    className="w-full p-2 bg-accent border border-border rounded text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
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
                    <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4 flex items-center text-brand-primary">
                            <MemoryStick className="mr-2" /> Create Process
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-muted-foreground">
                                    Process Name
                                </label>
                                <input
                                    type="text"
                                    value={newProcessName}
                                    onChange={(e) => setNewProcessName(e.target.value)}
                                    className="w-full p-2 bg-accent border border-border rounded text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                    placeholder="Enter process name"
                                    disabled={isAnimating}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-muted-foreground">
                                    Size (MB)
                                </label>
                                <input
                                    type="number"
                                    value={newProcessSize}
                                    onChange={(e) => setNewProcessSize(e.target.value)}
                                    className="w-full p-2 bg-accent border border-border rounded text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                    placeholder="Enter size in MB"
                                    disabled={isAnimating}
                                />
                            </div>
                            <button
                                onClick={createProcess}
                                disabled={isAnimating}
                                className="w-full bg-brand-primary text-foreground py-2 rounded hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
                            >
                                Create Process
                            </button>
                        </div>
                    </div>

                    {/* Memory Statistics */}
                    <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4 flex items-center text-brand-primary">
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
                                <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Used: {memoryStats.used.toFixed(1)}%</span>
                                    <span>Free: {memoryStats.free.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Total Memory:</span>
                                    <span className="font-medium">{totalMemory} MB</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Fragmentation:</span>
                                    <span className={`font-medium ${memoryStats.fragmented > 50 ? 'text-red-500' : 'text-green-500'}`}>
                                        {memoryStats.fragmented.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Active Processes:</span>
                                    <span className="font-medium">
                                        {processes.filter(p => !p.deallocatedAt).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Memory Visualization */}
                <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold flex items-center text-brand-primary">
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
                            <span className="text-sm text-muted-foreground">{(zoomLevel * 100).toFixed(0)}%</span>
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
                                            <span className="text-muted-foreground">Free: {block.size}MB</span>
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
                <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-brand-primary">
                        <Shuffle className="mr-2" /> Process History
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-green-900">
                                    <th className="p-3 text-left text-brand-primary">Process</th>
                                    <th className="p-3 text-left text-brand-primary">Size (MB)</th>
                                    <th className="p-3 text-left text-brand-primary">Allocated At</th>
                                    <th className="p-3 text-left text-brand-primary">Deallocated At</th>
                                    <th className="p-3 text-left text-brand-primary">Duration</th>
                                    <th className="p-3 text-left text-brand-primary">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processes.map((process) => (
                                    <tr key={process.id} className="border-t border-green-800 hover:bg-green-900/30">
                                        <td className="p-3 text-muted-foreground">{process.name}</td>
                                        <td className="p-3 text-muted-foreground">{process.size}</td>
                                        <td className="p-3 text-muted-foreground">{process.allocatedAt}s</td>
                                        <td className="p-3 text-muted-foreground">
                                            {process.deallocatedAt ? `${process.deallocatedAt}s` : 'Active'}
                                        </td>
                                        <td className="p-3 text-muted-foreground">
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
                </>
                )}

                {activeTab === 'theory' && (
                    <div className="space-y-8">
                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Memory Allocation Theory</h2>
                            
                            <div className="space-y-6 text-muted-foreground">
                                <p className="text-lg leading-relaxed">
                                    <span className="text-brand-primary font-semibold">Memory allocation</span> is the process of assigning blocks of memory to various running programs to optimize overall system performance. When a program requests memory, the operating system must decide where in memory to place it.
                                </p>
                                
                                <div className="bg-accent/30 rounded-lg p-6 border-l-4 border-brand-primary">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Real-World Analogy</h3>
                                    <p>
                                        Think of memory like a parking lot. When cars (processes) arrive, the parking attendant (operating system) must decide where to park each car. Different strategies exist: park in the first available spot, find the smallest spot that fits, or use the largest available space. Each approach has trade-offs in efficiency and space utilization.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Memory Allocation Strategies</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">First Fit</h3>
                                    <p className="text-muted-foreground mb-3">
                                        Allocates the first block of memory that is large enough to satisfy the request.
                                    </p>
                                    <div className="space-y-2 text-sm">
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Fast - stops searching at first fit</p>
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Simple to implement</p>
                                        <p className="text-muted-foreground"><span className="text-red-400">✗</span> May cause fragmentation at beginning of memory</p>
                                    </div>
                                </div>

                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Best Fit</h3>
                                    <p className="text-muted-foreground mb-3">
                                        Allocates the smallest block that is large enough for the request.
                                    </p>
                                    <div className="space-y-2 text-sm">
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Minimizes wasted space per allocation</p>
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Better memory utilization</p>
                                        <p className="text-muted-foreground"><span className="text-red-400">✗</span> Slower - must search entire list</p>
                                        <p className="text-muted-foreground"><span className="text-red-400">✗</span> Creates many small unusable fragments</p>
                                    </div>
                                </div>

                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Worst Fit</h3>
                                    <p className="text-muted-foreground mb-3">
                                        Allocates the largest available block of memory.
                                    </p>
                                    <div className="space-y-2 text-sm">
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Leftover fragments are larger and more usable</p>
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Reduces number of tiny fragments</p>
                                        <p className="text-muted-foreground"><span className="text-red-400">✗</span> Slower - must search entire list</p>
                                        <p className="text-muted-foreground"><span className="text-red-400">✗</span> Poor overall memory utilization</p>
                                    </div>
                                </div>

                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Next Fit</h3>
                                    <p className="text-muted-foreground mb-3">
                                        Like First Fit, but starts searching from where the last allocation was made.
                                    </p>
                                    <div className="space-y-2 text-sm">
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Distributes allocations more evenly</p>
                                        <p className="text-muted-foreground"><span className="text-brand-primary">✓</span> Faster than Best Fit and Worst Fit</p>
                                        <p className="text-muted-foreground"><span className="text-red-400">✗</span> More fragmentation than First Fit</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Memory Fragmentation</h2>
                            
                            <div className="space-y-6 text-muted-foreground">
                                <p className="text-lg">
                                    Fragmentation occurs when free memory is broken into small, non-contiguous blocks that cannot be used efficiently.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-accent/30 rounded-lg p-6">
                                        <h3 className="text-xl font-semibold text-brand-primary mb-3">External Fragmentation</h3>
                                        <p className="mb-3">Total free memory is sufficient, but it's divided into small scattered blocks.</p>
                                        <p className="text-sm"><strong>Solution:</strong> Compaction - moving processes to combine free blocks</p>
                                    </div>

                                    <div className="bg-accent/30 rounded-lg p-6">
                                        <h3 className="text-xl font-semibold text-brand-primary mb-3">Internal Fragmentation</h3>
                                        <p className="mb-3">Allocated memory is larger than requested, wasting space within the block.</p>
                                        <p className="text-sm"><strong>Solution:</strong> Use smaller fixed-size blocks or dynamic allocation</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Comparison Table</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="bg-green-900/50">
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Strategy</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Speed</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Memory Utilization</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Fragmentation</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Best Use Case</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-muted-foreground">
                                        <tr className="hover:bg-gray-700/50">
                                            <td className="p-3 border border-gray-700 font-medium">First Fit</td>
                                            <td className="p-3 border border-gray-700">Fast</td>
                                            <td className="p-3 border border-gray-700">Moderate</td>
                                            <td className="p-3 border border-gray-700">High at start</td>
                                            <td className="p-3 border border-gray-700">General purpose, quick allocation</td>
                                        </tr>
                                        <tr className="hover:bg-gray-700/50">
                                            <td className="p-3 border border-gray-700 font-medium">Best Fit</td>
                                            <td className="p-3 border border-gray-700">Slow</td>
                                            <td className="p-3 border border-gray-700">Best</td>
                                            <td className="p-3 border border-gray-700">Many small fragments</td>
                                            <td className="p-3 border border-gray-700">Limited memory, precise allocation</td>
                                        </tr>
                                        <tr className="hover:bg-gray-700/50">
                                            <td className="p-3 border border-gray-700 font-medium">Worst Fit</td>
                                            <td className="p-3 border border-gray-700">Slow</td>
                                            <td className="p-3 border border-gray-700">Poor</td>
                                            <td className="p-3 border border-gray-700">Larger usable fragments</td>
                                            <td className="p-3 border border-gray-700">Systems with varying process sizes</td>
                                        </tr>
                                        <tr className="hover:bg-gray-700/50">
                                            <td className="p-3 border border-gray-700 font-medium">Next Fit</td>
                                            <td className="p-3 border border-gray-700">Fast</td>
                                            <td className="p-3 border border-gray-700">Moderate</td>
                                            <td className="p-3 border border-gray-700">Distributed evenly</td>
                                            <td className="p-3 border border-gray-700">Sequential allocation patterns</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'examples' && (
                    <div className="space-y-8">
                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Memory Allocation Examples</h2>
                            <p className="text-muted-foreground mb-6">
                                Explore practical scenarios demonstrating how different memory allocation strategies handle real-world situations.
                            </p>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Example 1: Simple Allocation */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 1: Simple Sequential Allocation</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Total Memory: 1000 MB, Three processes arriving sequentially</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                                            <p><strong>Process A:</strong> 200 MB</p>
                                            <p><strong>Process B:</strong> 300 MB</p>
                                            <p><strong>Process C:</strong> 150 MB</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">First Fit Result:</h4>
                                                <p className="text-sm">All processes allocated sequentially from start. Fast allocation, 350 MB remaining at end.</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Best Fit Result:</h4>
                                                <p className="text-sm">Same as First Fit in this simple case. All processes fit, 350 MB remaining.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Example 2: Fragmentation Scenario */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 2: Fragmentation Scenario</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Memory with existing allocations and deallocations</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-3">
                                            <p><strong>Initial State:</strong> [P1: 100MB] [Free: 50MB] [P2: 200MB] [Free: 150MB] [P3: 100MB] [Free: 400MB]</p>
                                            <p><strong>New Request:</strong> Process D needs 120 MB</p>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">First Fit:</h4>
                                                <p className="text-sm">Allocates in 150MB gap (first fit). Fast, leaves 30MB fragment.</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Best Fit:</h4>
                                                <p className="text-sm">Allocates in 150MB gap (smallest fit). Leaves 30MB fragment.</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Worst Fit:</h4>
                                                <p className="text-sm">Allocates in 400MB gap (largest). Leaves 280MB usable space.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Example 3: Real-World Application */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 3: Real-World Application</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Web server handling multiple requests</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                                            <p><strong>Memory Pool:</strong> 2048 MB available</p>
                                            <p><strong>Requests:</strong></p>
                                            <ul className="list-disc list-inside ml-4 space-y-1">
                                                <li>User Session A: 128 MB</li>
                                                <li>Image Processing: 512 MB</li>
                                                <li>User Session B: 64 MB</li>
                                                <li>Database Query: 256 MB</li>
                                                <li>User Session C: 128 MB</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 rounded p-4 border-l-4 border-green-500">
                                            <p><strong className="text-brand-primary">Best Strategy:</strong> First Fit or Next Fit</p>
                                            <p className="text-sm mt-2">
                                                In web servers with frequent short-lived allocations, First Fit provides the best balance of speed and efficiency. 
                                                Next Fit helps distribute memory usage evenly across the pool, reducing fragmentation from repeated allocations at the start.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Example 4: Gaming Console Memory */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 4: Gaming Console Memory Management</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Console with 8GB RAM managing game assets</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                                            <p><strong>Fixed Allocations:</strong></p>
                                            <ul className="list-disc list-inside ml-4 space-y-1">
                                                <li>Game Engine: 2048 MB (permanent)</li>
                                                <li>Audio System: 512 MB (permanent)</li>
                                            </ul>
                                            <p className="mt-3"><strong>Dynamic Allocations:</strong></p>
                                            <ul className="list-disc list-inside ml-4 space-y-1">
                                                <li>Texture Pack: 1024 MB</li>
                                                <li>Level Data: 768 MB</li>
                                                <li>Character Models: 512 MB</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 rounded p-4 border-l-4 border-green-500">
                                            <p><strong className="text-brand-primary">Best Strategy:</strong> Best Fit or Worst Fit</p>
                                            <p className="text-sm mt-2">
                                                Gaming systems benefit from Best Fit for precise allocation of known asset sizes, minimizing waste. 
                                                Worst Fit can be used for temporary buffers to keep larger contiguous blocks available for major assets.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hands-on Exercise */}
                                <div className="bg-gradient-to-br from-green-900/20 via-gray-900/50 to-green-800/20 rounded-lg p-6 border-2 border-green-600/50">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">🎮 Try It Yourself!</h3>
                                    <div className="space-y-3 text-muted-foreground">
                                        <p className="text-lg">Switch to the <strong>Visualization</strong> tab and experiment:</p>
                                        <ol className="list-decimal list-inside space-y-2 ml-4">
                                            <li>Set memory to 2048 MB</li>
                                            <li>Try different allocation strategies (First Fit, Best Fit, Worst Fit, Next Fit)</li>
                                            <li>Create processes of varying sizes (128MB, 256MB, 512MB)</li>
                                            <li>Deallocate processes and observe fragmentation</li>
                                            <li>Compare fragmentation percentages between strategies</li>
                                        </ol>
                                        <p className="text-sm italic mt-4 text-brand-primary">
                                            💡 Tip: Notice how Best Fit minimizes waste per allocation but creates more small fragments over time!
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
};

export default EnhancedMemoryAllocationSimulator;