import { Timer, MemoryStick, Lock, ArrowUpDown, ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card"
import CreatorsFooter from "./components/creators-footer"

const algorithms = [
  {
    label: "Process Scheduler Visualizer",
    href: "/psv",
    desc: "Explore scheduling algorithms and timelines.",
    icon: Timer,
  },
  {
    label: "Memory Allocation Simulator",
    href: "/mas",
    desc: "Simulate allocation strategies and fragmentation.",
    icon: MemoryStick,
  },
  {
    label: "Deadlock Detection & Prevention",
    href: "/dead",
    desc: "Study detection, avoidance, and prevention.",
    icon: Lock,
  },
  {
    label: "Multithreaded Sorting Visualizer",
    href: "/msv",
    desc: "See concurrent sorting behaviors in action.",
    icon: ArrowUpDown,
  },
]

const creators = [
  { name: "Muhammad Bilal", github: "https://github.com/muhamad-bilal" },
  { name: "Abdullah Mustafa", github: "https://github.com/rimocide" },
  { name: "Umer Sami", github: "https://github.com/MoUmerSami2004" },
  { name: "Hamza Motiwala", github: "https://github.com/moti987" },
]

export default function Home() {
  return (
    // apply dark token context for proper contrast on dark gradient
    <div className="dark">
      <main className="min-h-dvh w-full bg-gradient-to-br from-(--brand-start) via-(--brand-via) to-(--brand-end)">
        <div className="mx-auto max-w-6xl px-6 py-10 flex min-h-dvh flex-col">
          <header className="mb-10 text-center">
            <h1 className="text-balance text-4xl md:text-5xl font-bold text-brand-primary">
              Operating System Basics
            </h1>
            <p className="mt-4 text-pretty text-base md:text-lg text-muted-foreground">
              This website is for anyone struggling to grasp the basics of the Operating Systems course.
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {algorithms.map((item) => {
              const Icon = item.icon
              return (
                <a 
                  key={item.href} 
                  href={item.href} 
                  aria-label={item.label} 
                  className="group"
                >
                  <Card className="bg-surface-secondary/70 border border-border backdrop-blur-sm transition-all duration-200 hover:border-brand-primary hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-brand-primary" aria-hidden />
                        <CardTitle className="text-xl md:text-2xl text-foreground">
                          {item.label}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                      <span className="text-sm text-brand-primary opacity-90 group-hover:opacity-100 transition-opacity">
                        Open tool
                      </span>
                      <ArrowRight
                        className="h-4 w-4 text-brand-primary/80 group-hover:text-brand-primary transition-colors"
                        aria-hidden
                      />
                    </CardFooter>
                  </Card>
                </a>
              )
            })}
          </section>

          <footer className="mt-auto pt-12">
            <CreatorsFooter creators={creators} />
          </footer>
        </div>
      </main>
    </div>
  )
}