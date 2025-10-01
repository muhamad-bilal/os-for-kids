import { useState, useId, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, FolderOpen, ExternalLink, Users, ChevronUp } from "lucide-react"

type Creator = {
  name: string;
  github: string;
};

type Project = {
  name: string;
  href: string;
};

type CreatorsFooterProps = {
  creators: Creator[];
  projects?: Project[];
};

export default function CreatorsFooter({
  creators,
  projects = [
    { name: "DAA-for-kids", href: "https://daa-for-kids.vercel.app/" },
    { name: "dbms-for-kids (coming soon)", href: "/" },
    { name: "TBD", href: "/" },
  ],
}: CreatorsFooterProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrapperRef = useRef(null)

  return (
    <div className="w-full">
      {/* Team section heading */}
      <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4 text-brand-primary" aria-hidden />
        <p className="text-center">Team</p>
      </div>

      {/* Team chips in a subtle panel */}
      <div
        role="group"
        aria-label="Creators"
        className="mx-auto mb-5 max-w-3xl rounded-2xl border border-border bg-surface-secondary/50 p-3 backdrop-blur-sm"
      >
        <div className="flex flex-wrap justify-center gap-3">
          {creators.map((c) => (
            <a
              key={c.github}
              href={c.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 text-sm text-foreground transition-colors hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            >
              <Github size={18} className="text-brand-primary" aria-hidden />
              <span>{c.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Boundary: Section heading for Other Projects */}
      <div className="mb-2 mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <FolderOpen className="h-4 w-4 text-brand-primary" aria-hidden />
        <p className="text-center">Other Projects</p>
      </div>

      {/* Distinct trigger: solid brand pill with caret */}
      <div
        ref={wrapperRef}
        className="relative flex justify-center"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-transparent bg-brand-primary px-4 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
        >
          <span className="font-medium">Explore</span>
          <ChevronUp className={`h-4 w-4 transition-transform ${open ? "rotate-0" : "rotate-180"}`} aria-hidden />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              id={menuId}
              role="menu"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute bottom-full z-50 mb-2 w-[min(20rem,90vw)] overflow-hidden rounded-xl border border-border bg-surface-secondary/90 shadow-lg backdrop-blur-md"
            >
              {/* small top accent bar to reinforce difference */}
              <div aria-hidden className="h-1 w-full bg-brand-primary/60" />
              <ul className="divide-y divide-border">
                {projects.map((p) => (
                  <li key={p.href}>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-black/20 focus:bg-black/20 focus:outline-none"
                    >
                      <span className="text-pretty">{p.name}</span>
                      <ExternalLink className="h-4 w-4 text-brand-primary" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}