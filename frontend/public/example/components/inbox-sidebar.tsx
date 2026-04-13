"use client"

import { cn } from "@/lib/utils"
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  Tag,
  PenSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface InboxSidebarProps {
  activeFolder: string
  onFolderChange: (folder: string) => void
}

const folders = [
  { id: "inbox", label: "Inbox", icon: Inbox, count: 12 },
  { id: "starred", label: "Starred", icon: Star, count: 3 },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText, count: 2 },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash2 },
]

const labels = [
  { id: "work", label: "Work", color: "bg-blue-500" },
  { id: "personal", label: "Personal", color: "bg-green-500" },
  { id: "important", label: "Important", color: "bg-amber-500" },
]

export function InboxSidebar({ activeFolder, onFolderChange }: InboxSidebarProps) {
  return (
    <aside className="w-56 border-r border-border bg-sidebar flex flex-col h-full shrink-0">
      <div className="p-4">
        <Button className="w-full justify-start gap-2" size="sm">
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <nav className="flex-1 px-2">
        <div className="space-y-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeFolder === folder.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <folder.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{folder.label}</span>
              {folder.count && (
                <span className={cn(
                  "text-xs tabular-nums",
                  activeFolder === folder.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {folder.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Labels
          </h3>
          <div className="space-y-1">
            {labels.map((label) => (
              <button
                key={label.id}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", label.color)} />
                <span>{label.label}</span>
              </button>
            ))}
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
              <Tag className="h-4 w-4 shrink-0" />
              <span>Manage labels</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <span>2.4 GB</span>
          <span className="mx-1">of</span>
          <span>15 GB used</span>
        </div>
        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-[16%] bg-accent rounded-full" />
        </div>
      </div>
    </aside>
  )
}
